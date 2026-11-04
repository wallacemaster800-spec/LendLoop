import http from "node:http";
import { createHmac, timingSafeEqual } from "node:crypto";
import { pathToFileURL } from "node:url";
const route = "/webhook/lendloop-events";
export function createGateway({ secret, upstream = "http://n8n:5678", forward = fetch }) {
  if (!secret || secret.length < 32) throw new Error("Missing signing key");
  const server = http.createServer(async (req, res) => {
    const reply = (status) => {
      res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      res.end(JSON.stringify({ ok: status === 200 }));
    };
    if (req.url !== route) return reply(404);
    if (req.method !== "POST") return reply(405);
    if (!req.headers["content-type"]?.startsWith("application/json")) return reply(415);
    if (Number(req.headers["content-length"] || 0) > 8192) return reply(413);
    let bytes = 0;
    const parts = [];
    try {
      for await (const chunk of req) {
        bytes += chunk.length;
        if (bytes > 8192) {
          reply(413);
          return;
        }
        parts.push(chunk);
      }
      const raw = Buffer.concat(parts).toString("utf8");
      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        return reply(400);
      }
      if (
        !body ||
        typeof body.payload !== "string" ||
        Buffer.byteLength(body.payload) > 4096 ||
        !/^\d{10}$/.test(body.timestamp) ||
        !/^[a-f0-9]{64}$/.test(body.signature) ||
        Math.abs(Date.now() / 1000 - Number(body.timestamp)) > 300
      )
        return reply(401);
      const expected = createHmac("sha256", secret)
        .update(["POST", route, body.timestamp, body.payload].join("\n"))
        .digest();
      if (!timingSafeEqual(expected, Buffer.from(body.signature, "hex"))) return reply(401);
      const response = await forward(new URL(route, upstream), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: raw,
        redirect: "error",
        signal: AbortSignal.timeout(20000),
      });
      await response.body?.cancel();
      reply(response.ok ? 200 : 502);
    } catch {
      if (!res.writableEnded) reply(502);
    }
  });
  server.requestTimeout = 25000;
  server.headersTimeout = 10000;
  server.maxConnections = 30;
  return server;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  createGateway({ secret: process.env.CONVEX_TO_N8N_SECRET }).listen(5681, "0.0.0.0", () =>
    console.log("Signed webhook gateway listening on 5681"),
  );
