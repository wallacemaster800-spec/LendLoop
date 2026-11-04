import sharp from "sharp";
import { MAX_PHOTO_INPUT, MAX_PHOTO_OUTPUT, PhotoError } from "./photo-policy";
const pixels = 20_000_000;
function detect(bytes: Buffer) {
  if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "jpeg";
  if (
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return "png";
  if (
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  )
    return "webp";
  throw new PhotoError("Choose a real JPEG, PNG or WebP image.", 415);
}
function animatedPng(bytes: Buffer) {
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    if (length > bytes.length - offset - 12) throw new PhotoError("The image is damaged.");
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    if (type === "acTL") return true;
    offset += length + 12;
    if (type === "IEND") break;
  }
  return false;
}
export async function processPhoto(input: Uint8Array, declaredType: string) {
  if (!input.length || input.length > MAX_PHOTO_INPUT)
    throw new PhotoError("Maximum image size is 5 MB.", 413);
  const bytes = Buffer.from(input);
  const format = detect(bytes);
  const type = declaredType.split(";")[0].trim().toLowerCase();
  if (type !== { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" }[format])
    throw new PhotoError("The image format does not match its declared type.", 415);
  if (format === "png" && animatedPng(bytes))
    throw new PhotoError("Animated images are not supported.", 415);
  try {
    const options = { limitInputPixels: pixels, failOn: "warning" as const };
    const metadata = await sharp(bytes, options).metadata();
    if (
      metadata.format !== format ||
      !metadata.width ||
      !metadata.height ||
      metadata.width * metadata.height > pixels ||
      (metadata.pages ?? 1) > 1
    )
      throw new PhotoError("Use a still image of at most 20 megapixels.", 415);
    // Decode and re-encode: never store the original bytes or preserve metadata.
    const output = await sharp(bytes, options)
      .rotate()
      .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80, effort: 4 })
      .timeout({ seconds: 10 })
      .toBuffer();
    if (output.length > MAX_PHOTO_OUTPUT)
      throw new PhotoError("This image is too complex. Try a smaller photo.", 413);
    return new Uint8Array(output);
  } catch (error) {
    if (error instanceof PhotoError) throw error;
    throw new PhotoError("The image could not be decoded safely. Choose another image.", 415);
  }
}
