export interface PagesEnv {
  BACKEND_API_URL?: string;
  RENDER_API_URL?: string;
  PROXY_SECRET?: string;
}

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
]);

/**
 * Cloudflare Pages Function proxy handler forwarding /api/* requests to Render API.
 * Ensures same-origin cookie delivery, server-side proxy authentication,
 * and reliable multipart streaming.
 */
export async function handleApiProxyRequest(
  request: Request,
  env: PagesEnv
): Promise<Response> {
  const upstreamUrlString = env.BACKEND_API_URL || env.RENDER_API_URL;

  // 1. Fail-closed: Validate required environment variables
  if (
    !upstreamUrlString ||
    typeof upstreamUrlString !== "string" ||
    upstreamUrlString.trim().length === 0 ||
    !env.PROXY_SECRET ||
    typeof env.PROXY_SECRET !== "string" ||
    env.PROXY_SECRET.trim().length === 0
  ) {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: "PROXY_CONFIG_ERROR",
          message: "Proxy upstream service configuration is incomplete.",
        },
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // 2. Validate upstream URL origin
  let upstreamOrigin: URL;
  try {
    upstreamOrigin = new URL(upstreamUrlString.trim());
    if (upstreamOrigin.protocol !== "https:" && upstreamOrigin.protocol !== "http:") {
      throw new Error("Invalid protocol");
    }
  } catch {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: "PROXY_CONFIG_ERROR",
          message: "Invalid upstream URL configuration.",
        },
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // 3. Path and query string preservation without host or path injection
  const clientUrl = new URL(request.url);
  const targetPath = clientUrl.pathname;
  const targetSearch = clientUrl.search;

  // Construct destination strictly against upstreamOrigin
  const destinationUrl = new URL(targetPath + targetSearch, upstreamOrigin);

  // Security check: ensure target origin matches upstreamOrigin exactly (no host spoofing / SSRF)
  if (destinationUrl.origin !== upstreamOrigin.origin) {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: "INVALID_DESTINATION",
          message: "Invalid request destination.",
        },
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // 4. Header filtering and injection
  const forwardHeaders = new Headers();

  for (const [key, value] of request.headers.entries()) {
    const lowerKey = key.toLowerCase();

    // Strip hop-by-hop headers
    if (HOP_BY_HOP_HEADERS.has(lowerKey)) {
      continue;
    }

    // Strip client-supplied proxy secrets (cannot be spoofed from browser)
    if (lowerKey === "x-proxy-secret") {
      continue;
    }

    forwardHeaders.set(key, value);
  }

  // Rewrite Host to Render's hostname
  forwardHeaders.set("Host", upstreamOrigin.host);

  // Inject server-side secret
  forwardHeaders.set("X-Proxy-Secret", env.PROXY_SECRET.trim());

  // Forward Cloudflare client IP if available
  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp && cfConnectingIp.trim().length > 0) {
    forwardHeaders.set("CF-Connecting-IP", cfConnectingIp.trim());
  }

  // 5. Body handling
  const method = request.method.toUpperCase();
  const hasBody = !["GET", "HEAD"].includes(method);

  // 6. Upstream dispatch with timeout handling
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout accommodates Render cold-starts

  try {
    const upstreamResponse = await fetch(destinationUrl.toString(), {
      method,
      headers: forwardHeaders,
      body: hasBody ? request.body : undefined,
      redirect: "manual", // Prevent automatic redirect following
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // 7. Response header construction
    const responseHeaders = new Headers();

    for (const [key, value] of upstreamResponse.headers.entries()) {
      const lowerKey = key.toLowerCase();
      // Hop-by-hop response headers to omit
      if (HOP_BY_HOP_HEADERS.has(lowerKey)) {
        continue;
      }
      // Set-Cookie is handled separately to avoid merging
      if (lowerKey === "set-cookie") {
        continue;
      }
      responseHeaders.set(key, value);
    }

    // Unpack multiple Set-Cookie headers properly
    if (typeof upstreamResponse.headers.getSetCookie === "function") {
      for (const cookie of upstreamResponse.headers.getSetCookie()) {
        responseHeaders.append("set-cookie", cookie);
      }
    } else {
      const rawCookie = upstreamResponse.headers.get("set-cookie");
      if (rawCookie) {
        responseHeaders.set("set-cookie", rawCookie);
      }
    }

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const isTimeout = (err as Error)?.name === "AbortError";

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: isTimeout ? "UPSTREAM_TIMEOUT" : "UPSTREAM_UNAVAILABLE",
          message: isTimeout
            ? "Upstream service timed out. If the backend was inactive, it may still be waking up."
            : "Upstream service is currently unavailable.",
        },
      }),
      {
        status: isTimeout ? 504 : 502,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Cloudflare Pages Functions entry point matching /api and /api/*
 */
export const onRequest = async (context: { request: Request; env: PagesEnv }): Promise<Response> => {
  return handleApiProxyRequest(context.request, context.env);
};
