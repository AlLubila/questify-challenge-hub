import { afterEach, describe, expect, it, vi } from "vitest";

import { compressImage, getCompressionEstimate } from "./imageCompression";

const twoMegabytes = 2 * 1024 * 1024;

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("getCompressionEstimate", () => {
  it("skips tiny files and caps the displayed estimate", () => {
    expect(getCompressionEstimate(100 * 1024)).toBe("No compression needed");
    expect(getCompressionEstimate(1024 * 1024)).toBe("~30% smaller");
    expect(getCompressionEstimate(10 * 1024 * 1024)).toBe("~70% smaller");
  });
});

describe("compressImage", () => {
  it("returns non-image and small image files unchanged", async () => {
    const documentFile = new File([new Uint8Array(twoMegabytes + 1)], "proof.pdf", {
      type: "application/pdf",
    });
    const smallImage = new File([new Uint8Array(1024)], "proof.png", {
      type: "image/png",
    });

    await expect(compressImage(documentFile)).resolves.toBe(documentFile);
    await expect(compressImage(smallImage)).resolves.toBe(smallImage);
  });

  it("resizes a large image and returns the smaller encoded file", async () => {
    class MockImage {
      width = 4000;
      height = 2000;
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;

      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }

    vi.stubGlobal("Image", MockImage);
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:test"),
      revokeObjectURL: vi.fn(),
    });
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage,
      imageSmoothingEnabled: false,
      imageSmoothingQuality: "low",
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback, type) => {
      callback(new Blob([new Uint8Array(1024)], { type: type ?? "image/jpeg" }));
    });
    vi.spyOn(console, "log").mockImplementation(() => undefined);

    const source = new File([new Uint8Array(twoMegabytes + 1)], "proof.png", {
      type: "image/png",
    });
    const result = await compressImage(source, {
      maxWidth: 1000,
      maxHeight: 1000,
      outputFormat: "image/webp",
      quality: 0.8,
    });

    expect(result).not.toBe(source);
    expect(result.name).toBe("proof.webp");
    expect(result.type).toBe("image/webp");
    expect(result.size).toBe(1024);
    expect(drawImage).toHaveBeenCalledWith(expect.any(MockImage), 0, 0, 1000, 500);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test");
  });
});
