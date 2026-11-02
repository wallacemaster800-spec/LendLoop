const crypto = require("crypto");
const secret = $env.N8N_TO_CONVEX_SECRET;
const base = $env.CONVEX_SITE_URL;
if (!secret || secret.length < 32 || !base || !/^https:\/\/[^/]+\.convex\.site$/.test(base)) {
  throw new Error("Configure the Convex site URL and signing secret");
}
return $input.all().map((item) => {
  const { path, data } = item.json;
  if (!["/automation/overdue", "/automation/notify", "/automation/remind"].includes(path))
    throw new Error("Unknown integration route");
  const body = JSON.stringify(data);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const input = ["POST", path, timestamp, body].join("\n");
  const signature = crypto.createHmac("sha256", secret).update(input).digest("hex");
  return { json: { url: base + path, body, timestamp, signature } };
});
