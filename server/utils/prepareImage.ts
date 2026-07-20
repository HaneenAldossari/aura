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
