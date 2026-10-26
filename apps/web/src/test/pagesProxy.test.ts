import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { handleApiProxyRequest, PagesEnv } from "@functions/api/[[catchall]]";

describe("Cloudflare Pages Functions API Proxy", () => {
  const originalFetch = globalThis.fetch;
  const validEnv: PagesEnv = {
    RENDER_API_URL: "https://jerai-api.onrender.com",
    PROXY_SECRET: "super-secure-production-proxy-secret-12345",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("Fail-Closed Configuration Validation", () => {
    it("returns 500 PROXY_CONFIG_ERROR when RENDER_API_URL is missing or empty", async () => {
      const req = new Request("https://pages.jerai.fit/api/v1/auth/me");
      const res1 = await handleApiProxyRequest(req, { PROXY_SECRET: "secret" });
      expect(res1.status).toBe(500);
      const data1 = await res1.json();
      expect(data1.error.code).toBe("PROXY_CONFIG_ERROR");

      const res2 = await handleApiProxyRequest(req, {
        RENDER_API_URL: "   ",
        PROXY_SECRET: "secret",
      });
      expect(res2.status).toBe(500);
    });

    it("returns 500 PROXY_CONFIG_ERROR when PROXY_SECRET is missing or empty", async () => {
      const req = new Request("https://pages.jerai.fit/api/v1/auth/me");
      const res1 = await handleApiProxyRequest(req, {
        RENDER_API_URL: "https://jerai-api.onrender.com",
      });
      expect(res1.status).toBe(500);
      const data1 = await res1.json();
      expect(data1.error.code).toBe("PROXY_CONFIG_ERROR");

      const res2 = await handleApiProxyRequest(req, {
        RENDER_API_URL: "https://jerai-api.onrender.com",
        PROXY_SECRET: "   ",
      });
      expect(res2.status).toBe(500);
    });

    it("returns 500 PROXY_CONFIG_ERROR when RENDER_API_URL has invalid protocol or format", async () => {
      const req = new Request("https://pages.jerai.fit/api/v1/workouts");
      const res = await handleApiProxyRequest(req, {
        RENDER_API_URL: "ftp://not-allowed.com",
        PROXY_SECRET: "secret",
      });
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error.code).toBe("PROXY_CONFIG_ERROR");
    });
  });

  describe("URL and Path Construction", () => {
    it("preserves exact pathname and query string against the configured upstream origin", async () => {
      let interceptedUrl = "";
      globalThis.fetch = vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
        interceptedUrl = input.toString();
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      });

      const clientReq = new Request(
        "https://pages.jerai.fit/api/v1/workouts?category=strength&difficulty=intermediate&page=2"
      );
      const res = await handleApiProxyRequest(clientReq, validEnv);

      expect(res.status).toBe(200);
      expect(interceptedUrl).toBe(
        "https://jerai-api.onrender.com/api/v1/workouts?category=strength&difficulty=intermediate&page=2"
      );
    });
  });

  describe("Header Filtering and Proxy Secret Injection", () => {
    it("strips client-supplied X-Proxy-Secret and injects server-configured PROXY_SECRET", async () => {
      let forwardedHeaders: Headers | undefined;
      globalThis.fetch = vi.fn().mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) => {
        forwardedHeaders = new Headers(init?.headers);
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      });

      const clientReq = new Request("https://pages.jerai.fit/api/v1/auth/login", {
        method: "POST",
        headers: {
          "X-Proxy-Secret": "malicious-client-attempt",
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 Test",
        },
        body: JSON.stringify({ email: "test@jerai.fit", password: "Password123!" }),
      });

      await handleApiProxyRequest(clientReq, validEnv);

      expect(forwardedHeaders).toBeDefined();
      expect(forwardedHeaders?.get("X-Proxy-Secret")).toBe("super-secure-production-proxy-secret-12345");
      expect(forwardedHeaders?.get("X-Proxy-Secret")).not.toBe("malicious-client-attempt");
    });

    it("strips hop-by-hop headers and rewrites Host to upstream origin host", async () => {
      let forwardedHeaders: Headers | undefined;
      globalThis.fetch = vi.fn().mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) => {
        forwardedHeaders = new Headers(init?.headers);
        return new Response("OK", { status: 200 });
      });

      const clientReq = new Request("https://pages.jerai.fit/api/v1/health", {
        headers: {
          Host: "pages.jerai.fit",
          Connection: "keep-alive",
          Upgrade: "websocket",
          "Keep-Alive": "timeout=5",
          "Transfer-Encoding": "chunked",
          "X-Custom-Client": "safe-value",
        },
      });

      await handleApiProxyRequest(clientReq, validEnv);

      expect(forwardedHeaders?.get("Host")).toBe("jerai-api.onrender.com");
      expect(forwardedHeaders?.has("connection")).toBe(false);
      expect(forwardedHeaders?.has("upgrade")).toBe(false);
      expect(forwardedHeaders?.has("keep-alive")).toBe(false);
      expect(forwardedHeaders?.has("transfer-encoding")).toBe(false);
      expect(forwardedHeaders?.get("X-Custom-Client")).toBe("safe-value");
    });

    it("forwards CF-Connecting-IP when provided by Cloudflare edge", async () => {
      let forwardedHeaders: Headers | undefined;
      globalThis.fetch = vi.fn().mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) => {
        forwardedHeaders = new Headers(init?.headers);
        return new Response("OK", { status: 200 });
      });

      const clientReq = new Request("https://pages.jerai.fit/api/v1/auth/login", {
        method: "POST",
        headers: {
          "cf-connecting-ip": "203.0.113.195",
        },
      });

      await handleApiProxyRequest(clientReq, validEnv);
      expect(forwardedHeaders?.get("CF-Connecting-IP")).toBe("203.0.113.195");
    });

    it("forwards cookies, CSRF tokens, and origin/referer headers", async () => {
      let forwardedHeaders: Headers | undefined;
      globalThis.fetch = vi.fn().mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) => {
        forwardedHeaders = new Headers(init?.headers);
        return new Response("OK", { status: 200 });
      });

      const clientReq = new Request("https://pages.jerai.fit/api/v1/workouts", {
        method: "POST",
        headers: {
          Cookie: "jerai_session=session_token_123; jerai_csrf=csrf_token_abc",
          "X-CSRF-Token": "csrf_token_abc",
          Origin: "https://pages.jerai.fit",
          Referer: "https://pages.jerai.fit/workouts",
        },
      });

      await handleApiProxyRequest(clientReq, validEnv);
      expect(forwardedHeaders?.get("Cookie")).toBe(
        "jerai_session=session_token_123; jerai_csrf=csrf_token_abc"
      );
      expect(forwardedHeaders?.get("X-CSRF-Token")).toBe("csrf_token_abc");
      expect(forwardedHeaders?.get("Origin")).toBe("https://pages.jerai.fit");
      expect(forwardedHeaders?.get("Referer")).toBe("https://pages.jerai.fit/workouts");
    });
  });

  describe("Request Bodies: JSON and Multipart", () => {
    it("correctly forwards JSON body and Content-Type", async () => {
      let forwardedBody: unknown;
      let forwardedContentType: string | null = null;

      globalThis.fetch = vi.fn().mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) => {
        const headers = new Headers(init?.headers);
        forwardedContentType = headers.get("content-type");
        forwardedBody = init?.body;
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      });

      const payload = JSON.stringify({ workoutName: "Hypertrophy Push", steps: 5 });
      const clientReq = new Request("https://pages.jerai.fit/api/v1/workouts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: payload,
      });

      const res = await handleApiProxyRequest(clientReq, validEnv);
      expect(res.status).toBe(200);
      expect(forwardedContentType).toBe("application/json");
      expect(forwardedBody).toBeDefined();
    });

    it("forwards multipart/form-data upload with boundary preserved", async () => {
      let forwardedContentType: string | null = null;
      let forwardedBody: unknown;

      globalThis.fetch = vi.fn().mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) => {
        const headers = new Headers(init?.headers);
        forwardedContentType = headers.get("content-type");
        forwardedBody = init?.body;
        return new Response(JSON.stringify({ uploaded: true }), { status: 201 });
      });

      const formData = new FormData();
      formData.append("title", "Bench Press");
      formData.append("file", new Blob(["dummy image bytes"], { type: "image/jpeg" }), "bench.jpg");

      const clientReq = new Request("https://pages.jerai.fit/api/v1/media/upload", {
        method: "POST",
        headers: {
          "Content-Type": "multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW",
        },
        body: formData,
      });

      const res = await handleApiProxyRequest(clientReq, validEnv);
      expect(res.status).toBe(201);
      expect(forwardedContentType).toContain("multipart/form-data");
      expect(forwardedBody).toBeDefined();
    });
  });

  describe("Multiple Set-Cookie Response Headers", () => {
    it("preserves separate Set-Cookie headers using getSetCookie() when available", async () => {
      const upstreamHeaders = new Headers();
      upstreamHeaders.append("set-cookie", "jerai_session=session_token_123; Path=/; HttpOnly; SameSite=Lax");
      upstreamHeaders.append("set-cookie", "jerai_csrf=csrf_token_abc; Path=/; SameSite=Lax");

      const upstreamRes = new Response(JSON.stringify({ user: { id: "u1" } }), {
        status: 200,
        headers: upstreamHeaders,
      });

      // Ensure getSetCookie returns the array if environment requires it
      if (!upstreamRes.headers.getSetCookie || upstreamRes.headers.getSetCookie().length === 0) {
        upstreamRes.headers.getSetCookie = () => [
          "jerai_session=session_token_123; Path=/; HttpOnly; SameSite=Lax",
          "jerai_csrf=csrf_token_abc; Path=/; SameSite=Lax",
        ];
      }

      globalThis.fetch = vi.fn().mockResolvedValue(upstreamRes);

      const clientReq = new Request("https://pages.jerai.fit/api/v1/auth/login", {
        method: "POST",
      });

      const res = await handleApiProxyRequest(clientReq, validEnv);

      expect(res.status).toBe(200);
      const allCookies = typeof res.headers.getSetCookie === "function" && res.headers.getSetCookie().length > 0
        ? res.headers.getSetCookie().join("; ")
        : res.headers.get("set-cookie") || "";

      expect(allCookies).toContain("jerai_session=session_token_123");
      expect(allCookies).toContain("jerai_csrf=csrf_token_abc");
    });
  });

  describe("Upstream Errors and Timeout Handling", () => {
    it("returns 502 UPSTREAM_UNAVAILABLE on fetch network error without leaking secrets", async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED connect to upstream"));

      const clientReq = new Request("https://pages.jerai.fit/api/v1/workouts");
      const res = await handleApiProxyRequest(clientReq, validEnv);

      expect(res.status).toBe(502);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("UPSTREAM_UNAVAILABLE");
      // Must not leak secret or internal connection strings
      expect(JSON.stringify(data)).not.toContain("super-secure-production-proxy-secret");
      expect(JSON.stringify(data)).not.toContain("ECONNREFUSED");
    });

    it("returns 504 UPSTREAM_TIMEOUT when request aborts/times out", async () => {
      const abortError = new Error("The operation was aborted");
      abortError.name = "AbortError";
      globalThis.fetch = vi.fn().mockRejectedValue(abortError);

      const clientReq = new Request("https://pages.jerai.fit/api/v1/workouts");
      const res = await handleApiProxyRequest(clientReq, validEnv);

      expect(res.status).toBe(504);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("UPSTREAM_TIMEOUT");
      expect(data.error.message).toContain("timed out");
    });

    it("enforces manual redirect mode on upstream fetch", async () => {
      let redirectMode: RequestRedirect | undefined;
      globalThis.fetch = vi.fn().mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) => {
        redirectMode = init?.redirect;
        return new Response(null, {
          status: 302,
          headers: { Location: "/other-place" },
        });
      });

      const clientReq = new Request("https://pages.jerai.fit/api/v1/redirect-test");
      const res = await handleApiProxyRequest(clientReq, validEnv);

      expect(redirectMode).toBe("manual");
      expect(res.status).toBe(302);
      expect(res.headers.get("Location")).toBe("/other-place");
    });
  });
});
