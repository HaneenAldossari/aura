import sharp from "sharp";

export interface PreparedImage {
  base64: string;
  mimeType: "image/jpeg";
  width: number;
  height: number;
}

/**
 * Validate + normalize an uploaded image before it goes to the vision model.
 *
 * - Rejects anything that isn't a real jpeg/png/webp (magic bytes, not
 *   filename — sharp throws on junk input)
 * - Applies EXIF rotation (phone selfies are often stored sideways)
 * - Downscales to max 1024px and re-encodes as JPEG q82: a 10MB upload
 *   becomes ~150-300KB of base64, cutting vision latency and token cost
 */
/**
 * Validate only: real jpeg/png/webp by magic bytes, and within the size cap.
 *
 * Used when the client has already produced the canonical image — it is
 * ICC-converted, uprighted and downscaled by measure/encode.ts, and re-encoding
 * it here would be a second lossy pass over the exact pixels that were measured.
 * Validation still runs, because a direct API caller can send anything.
 */
export async function validateImage(
  input: Buffer,
  maxEdge = 1024
): Promise<{ format: string; width: number; height: number; withinCap: boolean }> {
  const meta = await sharp(input, { failOn: "truncated" })
    .metadata()
    .catch(() => {
      throw new Error("invalid_image");
    });
  const format = meta.format || "";
  if (!["jpeg", "png", "webp"].includes(format)) {
    throw new Error("invalid_image");
  }
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (width <= 0 || height <= 0) throw new Error("invalid_image");

  return { format, width, height, withinCap: Math.max(width, height) <= maxEdge };
}

export async function prepareImage(input: Buffer): Promise<PreparedImage> {
  const image = sharp(input, { failOn: "truncated" });

  const meta = await image.metadata().catch(() => {
    throw new Error("invalid_image");
  });
  const format = meta.format || "";
  if (!["jpeg", "png", "webp"].includes(format)) {
    throw new Error("invalid_image");
  }

  const out = await image
    .rotate()
    .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer({ resolveWithObject: true });

  return {
    base64: out.data.toString("base64"),
    mimeType: "image/jpeg",
    width: out.info.width,
    height: out.info.height,
  };
}
