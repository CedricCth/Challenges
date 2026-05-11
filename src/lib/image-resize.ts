/**
 * Client-side image resize + EXIF strip per ADR-016.
 *
 * Resizes the image so its longest side is ≤ MAX_DIMENSION (1600 px) and
 * re-encodes as JPEG at quality 0.82. Canvas re-encoding drops EXIF for
 * free (including GPS) — that's the privacy reason we do this in the
 * browser instead of relying on a server-side library like sharp.
 *
 * Falls back to returning the original File if `createImageBitmap` isn't
 * available (very old browsers). Acceptable trade-off for a 2-user app
 * on modern phones.
 */

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;
const TARGET_MAX_BYTES = 1_000_000;

export interface ResizeResult {
  file: File;
  /** True if we actually resized; false if we fell back to the original. */
  resized: boolean;
}

export async function resizeImage(input: File): Promise<ResizeResult> {
  if (
    typeof createImageBitmap !== "function" ||
    typeof OffscreenCanvas === "undefined" &&
      typeof document === "undefined"
  ) {
    return { file: input, resized: false };
  }

  if (input.size <= TARGET_MAX_BYTES && !needsResize(await peekDimensions(input))) {
    return { file: input, resized: false };
  }

  try {
    const bitmap = await createImageBitmap(input);
    try {
      const { width, height } = scaleDown(bitmap.width, bitmap.height);
      const blob = await drawAndEncode(bitmap, width, height);
      const file = new File([blob], renameToJpg(input.name), {
        type: "image/jpeg",
        lastModified: Date.now(),
      });
      return { file, resized: true };
    } finally {
      bitmap.close?.();
    }
  } catch {
    // If anything goes sideways, just upload the original. The server still
    // validates MIME and the bucket has a size cap.
    return { file: input, resized: false };
  }
}

function scaleDown(
  w: number,
  h: number,
): { width: number; height: number } {
  const longest = Math.max(w, h);
  if (longest <= MAX_DIMENSION) return { width: w, height: h };
  const scale = MAX_DIMENSION / longest;
  return { width: Math.round(w * scale), height: Math.round(h * scale) };
}

async function drawAndEncode(
  bitmap: ImageBitmap,
  width: number,
  height: number,
): Promise<Blob> {
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Couldn't get 2d context.");
    ctx.drawImage(bitmap, 0, 0, width, height);
    return canvas.convertToBlob({ type: "image/jpeg", quality: JPEG_QUALITY });
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't get 2d context.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob returned null"))),
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}

async function peekDimensions(
  file: File,
): Promise<{ width: number; height: number } | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const dims = { width: bitmap.width, height: bitmap.height };
    bitmap.close?.();
    return dims;
  } catch {
    return null;
  }
}

function needsResize(dims: { width: number; height: number } | null): boolean {
  if (!dims) return true;
  return Math.max(dims.width, dims.height) > MAX_DIMENSION;
}

function renameToJpg(originalName: string): string {
  const dot = originalName.lastIndexOf(".");
  const base = dot >= 0 ? originalName.slice(0, dot) : originalName;
  return `${base || "photo"}.jpg`;
}
