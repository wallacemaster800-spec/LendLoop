// @vitest-environment node
import { test, expect } from "vitest";
import { createHmac } from "node:crypto";

import { createGateway } from "../scripts/webhook-gateway.mjs";
const secret = "a".repeat(64);
async function withGateway(run: (base: string, calls: unknown[]) => Promise<void>) {
  const calls: unknown[] = [];
  const server = createGateway({
    secret,
    forward: async (...args: unknown[]) => {
      calls.push(args);
      return new Response("{}");
    },
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    await run(
      "http://127.0.0.1:" + (server.address() as import("node:net").AddressInfo).port,
      calls,
    );
  } finally {
    server.closeAllConnections();
    await new Promise<void>((r) => server.close(() => r()));
  }
}
function envelope() {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const payload = JSON.stringify({ eventId: "test" });
  return {
    timestamp,
    payload,
    signature: createHmac("sha256", secret)
      .update(["POST", "/webhook/lendloop-events", timestamp, payload].join("\n"))
      .digest("hex"),
  };
}
test("gateway does not expose the editor or other webhook paths", () =>
  withGateway(async (base, calls) => {
    for (const p of ["/", "/rest/settings", "/webhook/other"]) {
      expect((await fetch(base + p)).status).toBe(404);
    }
    expect(calls).toHaveLength(0);
  }));
test("gateway authenticates before forwarding", () =>
  withGateway(async (base, calls) => {
    const body = envelope();
    body.signature = "0".repeat(64);
    expect(
      (
        await fetch(base + "/webhook/lendloop-events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      ).status,
    ).toBe(401);
    expect(calls).toHaveLength(0);
  }));
test("gateway forwards a valid signed envelope", () =>
  withGateway(async (base, calls) => {
    expect(
      (
        await fetch(base + "/webhook/lendloop-events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(envelope()),
        })
      ).status,
    ).toBe(200);
    expect(calls).toHaveLength(1);
  }));
test("gateway restricts method and body size", () =>
  withGateway(async (base, calls) => {
    expect((await fetch(base + "/webhook/lendloop-events")).status).toBe(405);
    expect(
      (
        await fetch(base + "/webhook/lendloop-events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "x".repeat(9000),
        })
      ).status,
    ).toBe(413);
    expect(calls).toHaveLength(0);
  }));
