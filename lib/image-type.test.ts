import { describe, expect, it } from "vitest";
import { detectImageType, extensionFor } from "@/lib/image-type";

const buf = (...bytes: number[]) => Buffer.from(bytes);

describe("detectImageType", () => {
  it("识别 JPEG", () => {
    expect(detectImageType(buf(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
  });

  it("识别 PNG", () => {
    expect(detectImageType(buf(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("image/png");
  });

  it("识别 GIF", () => {
    expect(detectImageType(buf(0x47, 0x49, 0x46, 0x38, 0x39, 0x61))).toBe("image/gif");
  });

  it("识别 WebP", () => {
    const data = Buffer.concat([
      Buffer.from("RIFF", "ascii"),
      buf(0x00, 0x00, 0x00, 0x00),
      Buffer.from("WEBP", "ascii"),
    ]);
    expect(detectImageType(data)).toBe("image/webp");
  });

  it("RIFF 但非 WEBP 不识别", () => {
    const data = Buffer.concat([
      Buffer.from("RIFF", "ascii"),
      buf(0x00, 0x00, 0x00, 0x00),
      Buffer.from("WAVE", "ascii"),
    ]);
    expect(detectImageType(data)).toBeNull();
  });

  it("伪装成 PNG 的 HTML 不识别", () => {
    expect(detectImageType(Buffer.from("<html><body>hi</body></html>"))).toBeNull();
  });

  it("截断的文件头不识别", () => {
    expect(detectImageType(buf(0xff, 0xd8))).toBeNull();
    expect(detectImageType(Buffer.alloc(0))).toBeNull();
  });

  it("扩展名与类型一致", () => {
    expect(extensionFor("image/jpeg")).toBe("jpg");
    expect(extensionFor("image/png")).toBe("png");
    expect(extensionFor("image/webp")).toBe("webp");
    expect(extensionFor("image/gif")).toBe("gif");
  });
});
