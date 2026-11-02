const encoder = new TextEncoder();
export const MAX_AGE_SECONDS = 300;
// Method and path binding prevent using a read signature for a write operation.
export const signatureInput = (method: string, path: string, timestamp: string, body: string) =>
  [method.toUpperCase(), path, timestamp, body].join("\n");
async function key(secret: string) {
  if (secret.length < 32) throw new Error("Integration secret must be at least 32 characters.");
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}
export async function sign(
  secret: string,
  method: string,
  path: string,
  timestamp: string,
  body: string,
) {
  const digest = await crypto.subtle.sign(
    "HMAC",
    await key(secret),
    encoder.encode(signatureInput(method, path, timestamp, body)),
  );
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
export async function verify(
  secret: string,
  method: string,
  path: string,
  timestamp: string | null,
  signature: string | null,
  body: string,
  now = Date.now(),
) {
  if (!timestamp || !/^\d{10}$/.test(timestamp) || !signature || !/^[a-f0-9]{64}$/.test(signature))
    return false;
  if (Math.abs(now / 1000 - Number(timestamp)) > MAX_AGE_SECONDS) return false;
  const bytes = Uint8Array.from(signature.match(/.{2}/g)!, (h) => parseInt(h, 16));
  return crypto.subtle.verify(
    "HMAC",
    await key(secret),
    bytes,
    encoder.encode(signatureInput(method, path, timestamp, body)),
  );
}
