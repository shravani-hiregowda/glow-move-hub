import crypto from "node:crypto";

export interface ImageInspectionResult {
  valid: boolean;
  error?: string;
  mimeType?: string;
  extension?: string;
  width?: number;
  height?: number;
  size: number;
  checksum: string;
}

export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5 MB
export const MAX_DIMENSION = 8192; // Max width or height in pixels

/**
 * Inspects a binary buffer to determine its actual MIME type from its file signature (magic bytes).
 */
export function detectMimeTypeFromMagicBytes(buffer: Buffer): { mimeType: AllowedMimeType; extension: string } | null {
  if (!buffer || buffer.length < 12) {
    return null;
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { mimeType: "image/png", extension: "png" };
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mimeType: "image/jpeg", extension: "jpg" };
  }

  // WebP: RIFF .... WEBP
  if (
    buffer[0] === 0x52 && // R
    buffer[1] === 0x49 && // I
    buffer[2] === 0x46 && // F
    buffer[3] === 0x46 && // F
    buffer[8] === 0x57 && // W
    buffer[9] === 0x45 && // E
    buffer[10] === 0x42 && // B
    buffer[11] === 0x50 // P
  ) {
    return { mimeType: "image/webp", extension: "webp" };
  }

  return null;
}

/**
 * Extracts basic dimensions from PNG, JPEG, or WebP buffers without native C++ libraries.
 */
export function extractImageDimensions(
  buffer: Buffer,
  mimeType: AllowedMimeType
): { width?: number; height?: number } {
  try {
    if (mimeType === "image/png" && buffer.length >= 24) {
      // In PNG, IHDR starts at byte 12. Width is at 16..19, Height is at 20..23 (Big Endian)
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      return { width, height };
    }

    if (mimeType === "image/jpeg") {
      let offset = 2;
      while (offset < buffer.length - 8) {
        if (buffer[offset] !== 0xff) break;
        const marker = buffer[offset + 1];
        // SOF markers: SOF0 (0xC0), SOF1 (0xC1), SOF2 (0xC2)
        if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
          const height = buffer.readUInt16BE(offset + 5);
          const width = buffer.readUInt16BE(offset + 7);
          return { width, height };
        }
        const length = buffer.readUInt16BE(offset + 2);
        offset += 2 + length;
      }
    }

    if (mimeType === "image/webp" && buffer.length >= 30) {
      // Check WebP format chunk (VP8, VP8L, VP8X)
      const chunkType = buffer.toString("ascii", 12, 16);
      if (chunkType === "VP8 " && buffer.length >= 30) {
        // Lossy VP8
        const width = buffer.readUInt16LE(26) & 0x3fff;
        const height = buffer.readUInt16LE(28) & 0x3fff;
        return { width, height };
      }
      if (chunkType === "VP8L" && buffer.length >= 25) {
        // Lossless VP8L
        const b1 = buffer[21];
        const b2 = buffer[22];
        const b3 = buffer[23];
        const b4 = buffer[24];
        const width = 1 + (((b2 & 0x3f) << 8) | b1);
        const height = 1 + (((b4 & 0xf) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6));
        return { width, height };
      }
      if (chunkType === "VP8X" && buffer.length >= 30) {
        // Extended VP8X
        const width = 1 + buffer.readUIntLE(24, 3);
        const height = 1 + buffer.readUIntLE(27, 3);
        return { width, height };
      }
    }
  } catch {
    // Dimension extraction failure should not block upload if signature is valid
  }

  return {};
}

/**
 * Full security validation of an image upload.
 */
export function validateImageBuffer(
  buffer: Buffer,
  declaredMimeType?: string,
  maxSize: number = MAX_UPLOAD_SIZE
): ImageInspectionResult {
  if (!buffer || buffer.length === 0) {
    return {
      valid: false,
      error: "File is empty or missing payload.",
      size: 0,
      checksum: "",
    };
  }

  const checksum = crypto.createHash("sha256").update(buffer).digest("hex");

  if (buffer.length > maxSize) {
    return {
      valid: false,
      error: `File size exceeds the limit of ${(maxSize / (1024 * 1024)).toFixed(0)}MB.`,
      size: buffer.length,
      checksum,
    };
  }

  const detected = detectMimeTypeFromMagicBytes(buffer);
  if (!detected) {
    return {
      valid: false,
      error: "Invalid file signature. Only JPEG, PNG, and WebP images are permitted.",
      size: buffer.length,
      checksum,
    };
  }

  // If a declared MIME type was provided by the client, ensure consistency
  if (declaredMimeType) {
    const normDeclared = declaredMimeType.toLowerCase().trim();
    if (
      normDeclared !== detected.mimeType &&
      !(detected.mimeType === "image/jpeg" && (normDeclared === "image/jpg" || normDeclared === "image/pjpeg"))
    ) {
      return {
        valid: false,
        error: `Declared MIME type (${declaredMimeType}) does not match actual image binary signature (${detected.mimeType}).`,
        size: buffer.length,
        checksum,
      };
    }
  }

  const dimensions = extractImageDimensions(buffer, detected.mimeType);

  if (
    (dimensions.width && dimensions.width > MAX_DIMENSION) ||
    (dimensions.height && dimensions.height > MAX_DIMENSION)
  ) {
    return {
      valid: false,
      error: `Image dimensions (${dimensions.width}x${dimensions.height}) exceed maximum allowed dimensions (${MAX_DIMENSION}x${MAX_DIMENSION}).`,
      size: buffer.length,
      checksum,
    };
  }

  return {
    valid: true,
    mimeType: detected.mimeType,
    extension: detected.extension,
    width: dimensions.width,
    height: dimensions.height,
    size: buffer.length,
    checksum,
  };
}

/**
 * Generates a collision-resistant, safe server-controlled object key.
 * Untrusted client filenames are never used in object storage paths.
 */
export function generateObjectKey(extension: string, prefix: string = "workouts"): string {
  // Strip all non-alphanumeric characters from extension to prevent traversal or malicious characters
  const cleanExt = extension.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "bin";
  const cleanPrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, "");
  const uuid = crypto.randomUUID();
  return `${cleanPrefix}/${uuid}.${cleanExt}`;
}

/**
 * Safely decodes an image Base64 data URL string into a Buffer.
 * Strictly enforces image/* MIME types.
 */
export function parseBase64DataUrl(dataUrl: string): { mimeType: string; buffer: Buffer } | null {
  if (!dataUrl || typeof dataUrl !== "string") {
    return null;
  }

  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+_-]+);base64,(.+)$/s);
  if (!match) {
    return null;
  }

  const declaredMime = match[1].toLowerCase();
  const base64Data = match[2].trim();

  try {
    const buffer = Buffer.from(base64Data, "base64");
    return { mimeType: declaredMime, buffer };
  } catch {
    return null;
  }
}
