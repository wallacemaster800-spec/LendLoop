export const MAX_PHOTO_INPUT = 5 * 1024 * 1024;
export const MAX_PHOTO_OUTPUT = 2 * 1024 * 1024;
export class PhotoError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export async function readLimitedBody(request: Request, maximum: number): Promise<Uint8Array> {
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > maximum))
    throw new PhotoError("Image is too large.", 413);
  if (!request.body) throw new PhotoError("Choose an image.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  let timedOut = false;
  const deadline = setTimeout(() => {
    timedOut = true;
    void reader.cancel();
  }, 20000);
  let finished = false;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) {
        finished = true;
        break;
      }
      size += result.value.byteLength;
      if (size > maximum) throw new PhotoError("Image is too large.", 413);
      chunks.push(result.value);
    }
    if (timedOut) throw new PhotoError("Upload timed out.", 408);
    if (!size) throw new PhotoError("Choose an image.");
    const result = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  } finally {
    clearTimeout(deadline);
    if (!finished) await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
export async function photoDigest(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes).buffer);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
export function photoProof(ticket: string, subject: string, digest: string) {
  return JSON.stringify({ ticket, subject, digest });
}
