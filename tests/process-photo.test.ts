// @vitest-environment node
import { test, expect } from "vitest";
import sharp from "sharp";
import { processPhoto } from "../lib/process-photo";
import { readLimitedBody, MAX_PHOTO_INPUT } from "../lib/photo-policy";
const create = (width = 32, height = 24) =>
  sharp({ create: { width, height, channels: 3, background: "#bc834a" } });
test("converts JPEG to WebP, resizes and strips EXIF metadata", async () => {
  const input = await create(2400, 1800)
    .jpeg()
    .withExif({ IFD0: { Artist: "Private author" } })
    .toBuffer();
  const output = await processPhoto(input, "image/jpeg");
  const m = await sharp(output).metadata();
  expect(m.format).toBe("webp");
  expect(m.width).toBe(1600);
  expect(m.height).toBe(1200);
  expect(m.exif).toBeUndefined();
  expect(m.icc).toBeUndefined();
});
test("accepts real PNG and WebP, without upscaling", async () => {
  for (const format of ["png", "webp"] as const) {
    const input = await create()[format]().toBuffer();
    const result = await sharp(await processPhoto(input, "image/" + format)).metadata();
    expect(result.format).toBe("webp");
    expect(result.width).toBe(32);
  }
});
test("rejects scripts and SVG disguised as images", async () => {
  for (const text of [
    "<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>",
    "<?php system('id'); ?>",
    "<html>not an image</html>",
  ]) {
    await expect(processPhoto(Buffer.from(text), "image/png")).rejects.toThrow("real JPEG");
  }
});
test("rejects mismatched MIME and corrupt data with correct magic bytes", async () => {
  const png = await create().png().toBuffer();
  await expect(processPhoto(png, "image/jpeg")).rejects.toThrow("declared type");
  await expect(processPhoto(png.subarray(0, 28), "image/png")).rejects.toThrow();
});
test("rejects oversized files and excessive decoded dimensions", async () => {
  await expect(processPhoto(new Uint8Array(MAX_PHOTO_INPUT + 1), "image/png")).rejects.toThrow(
    "5 MB",
  );
  const huge = await create(5000, 4100).png().toBuffer();
  await expect(processPhoto(huge, "image/png")).rejects.toThrow();
});
test("re-encoding discards appended payloads", async () => {
  const png = await create().png().toBuffer();
  const payload = "UNTRUSTED_TRAILING_SCRIPT_PAYLOAD";
  const result = await processPhoto(Buffer.concat([png, Buffer.from(payload)]), "image/png");
  expect(Buffer.from(result).includes(Buffer.from(payload))).toBe(false);
});
test("rejects animated PNG before decoding", async () => {
  const png = await create().png().toBuffer();
  const chunk = Buffer.alloc(20);
  chunk.writeUInt32BE(8, 0);
  chunk.write("acTL", 4);
  await expect(
    processPhoto(Buffer.concat([png.subarray(0, 33), chunk, png.subarray(33)]), "image/png"),
  ).rejects.toThrow("Animated");
});
test("bounds streamed bodies without content-length", async () => {
  const stream = new ReadableStream({
    start(c) {
      c.enqueue(new Uint8Array(6));
      c.enqueue(new Uint8Array(6));
      c.close();
    },
  });
  const request = new Request("http://localhost", {
    method: "POST",
    body: stream,
    duplex: "half",
  } as RequestInit);
  await expect(readLimitedBody(request, 10)).rejects.toThrow("too large");
});
