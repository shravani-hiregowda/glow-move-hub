import { describe, it, expect } from "vitest";
import {
  detectMimeTypeFromMagicBytes,
  validateImageBuffer,
  generateObjectKey,
  parseBase64DataUrl,
  MAX_UPLOAD_SIZE,
} from "../utils/mediaValidation";

describe("Media Validation & Security Utilities", () => {
  // Minimal valid headers
  const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
  const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
  const webpHeader = Buffer.from("RIFF\x20\x00\x00\x00WEBPVP8 \x14\x00\x00\x00", "binary");

  describe("detectMimeTypeFromMagicBytes", () => {
    it("correctly identifies PNG file signature", () => {
      const detected = detectMimeTypeFromMagicBytes(pngHeader);
      expect(detected).toEqual({ mimeType: "image/png", extension: "png" });
    });

    it("correctly identifies JPEG file signature", () => {
      const detected = detectMimeTypeFromMagicBytes(jpegHeader);
      expect(detected).toEqual({ mimeType: "image/jpeg", extension: "jpg" });
    });

    it("correctly identifies WebP file signature", () => {
      const detected = detectMimeTypeFromMagicBytes(webpHeader);
      expect(detected).toEqual({ mimeType: "image/webp", extension: "webp" });
    });

    it("rejects unknown or invalid signatures (e.g. text or scripts)", () => {
      const textBuffer = Buffer.from("<html><script>alert('xss')</script></html>");
      expect(detectMimeTypeFromMagicBytes(textBuffer)).toBeNull();
    });

    it("rejects buffer smaller than header threshold", () => {
      const tiny = Buffer.from([0xff, 0xd8]);
      expect(detectMimeTypeFromMagicBytes(tiny)).toBeNull();
    });
  });

  describe("validateImageBuffer", () => {
    it("accepts valid image buffer with matching declared MIME type", () => {
      const validWebP = Buffer.concat([webpHeader, Buffer.alloc(50)]);
      const result = validateImageBuffer(validWebP, "image/webp");
      expect(result.valid).toBe(true);
      expect(result.mimeType).toBe("image/webp");
      expect(result.size).toBe(validWebP.length);
      expect(result.checksum).toHaveLength(64);
    });

    it("rejects empty or zero-length buffer", () => {
      const result = validateImageBuffer(Buffer.alloc(0));
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/empty/i);
    });

    it("rejects buffers exceeding maximum allowed size", () => {
      const hugeBuffer = Buffer.concat([jpegHeader, Buffer.alloc(MAX_UPLOAD_SIZE + 10)]);
      const result = validateImageBuffer(hugeBuffer, "image/jpeg");
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/exceeds the limit/i);
    });

    it("rejects mismatched declared MIME type against binary signature", () => {
      const result = validateImageBuffer(pngHeader, "image/jpeg");
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/does not match actual image binary signature/i);
    });
  });

  describe("generateObjectKey", () => {
    it("generates collision-resistant keys using server UUID and extension", () => {
      const key1 = generateObjectKey("png");
      const key2 = generateObjectKey("png");

      expect(key1).toMatch(/^workouts\/[a-f0-9-]{36}\.png$/);
      expect(key2).toMatch(/^workouts\/[a-f0-9-]{36}\.png$/);
      expect(key1).not.toBe(key2);
    });

    it("never reflects untrusted client filenames into object key paths", () => {
      const maliciousExtension = "../../../malicious.exe";
      const key = generateObjectKey(maliciousExtension);
      expect(key).not.toContain("..");
      expect(key.startsWith("workouts/")).toBe(true);
      expect(key.slice("workouts/".length)).not.toContain("/");
    });
  });

  describe("parseBase64DataUrl", () => {
    it("parses valid Base64 data URLs correctly", () => {
      const dataUrl = "data:image/webp;base64,UklGRh4AAABXRUJQVlA4TA0AAAAvAAAAAAfQ//73vw==";
      const parsed = parseBase64DataUrl(dataUrl);
      expect(parsed).not.toBeNull();
      expect(parsed?.mimeType).toBe("image/webp");
      expect(parsed?.buffer).toBeInstanceOf(Buffer);
    });

    it("returns null for malformed or non-image data URLs", () => {
      expect(parseBase64DataUrl("not-a-data-url")).toBeNull();
      expect(parseBase64DataUrl("data:text/html;base64,PHNjcmlwdD4=")).toBeNull();
    });
  });
});
