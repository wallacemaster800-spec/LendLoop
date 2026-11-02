const crypto = require("crypto");
const envelope = $input.first().json.body;
const secret = $env.CONVEX_TO_N8N_SECRET;
if (!secret || secret.length < 32) throw new Error("Webhook verification is not configured");
if (
  !envelope ||
  typeof envelope.payload !== "string" ||
  envelope.payload.length > 4096 ||
  typeof envelope.timestamp !== "string" ||
  !/^\d{10}$/.test(envelope.timestamp) ||
  typeof envelope.signature !== "string" ||
  !/^[a-f0-9]{64}$/.test(envelope.signature)
) {
  throw new Error("Invalid webhook envelope");
}
if (Math.abs(Date.now() / 1000 - Number(envelope.timestamp)) > 300)
  throw new Error("Expired webhook");
const input = ["POST", "/webhook/lendloop-events", envelope.timestamp, envelope.payload].join("\n");
const expected = crypto.createHmac("sha256", secret).update(input).digest();
const actual = Buffer.from(envelope.signature, "hex");
if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected))
  throw new Error("Invalid webhook signature");
const payload = JSON.parse(envelope.payload);
if (!payload || Object.keys(payload).length !== 1 || typeof payload.eventId !== "string")
  throw new Error("Invalid event");
return [{ json: { path: "/automation/notify", data: { eventId: payload.eventId } } }];
