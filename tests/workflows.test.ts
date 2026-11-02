// @vitest-environment node
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import * as crypto from "node:crypto";
import { describe, it, expect } from "vitest";
import { sign, verify } from "../lib/signatures";
const source = (name: string) =>
  readFileSync(new URL("../n8n/code/" + name + ".js", import.meta.url), "utf8");
const secret = "a".repeat(64);
function execute(name: string, items: unknown[], env: Record<string, string>) {
  return runInNewContext("(function(){" + source(name) + "})()", {
    require: (name: string) => {
      if (name !== "crypto") throw new Error("Unexpected import");
      return crypto;
    },
    Buffer,
    Date,
    JSON,
    $env: env,
    $input: { first: () => items[0], all: () => items },
  });
}
describe("exported n8n code", () => {
  it("verifies a real Convex signature and prepares a minimal receipt", async () => {
    const payload = JSON.stringify({ eventId: "event-123" }),
      timestamp = String(Math.floor(Date.now() / 1000));
    const signature = await sign(secret, "POST", "/webhook/lendloop-events", timestamp, payload);
    const result = execute(
      "verify-event",
      [{ json: { body: { payload, timestamp, signature } } }],
      { CONVEX_TO_N8N_SECRET: secret },
    );
    expect(result).toEqual([
      { json: { path: "/automation/notify", data: { eventId: "event-123" } } },
    ]);
  });
  it("does not accept a tampered n8n event", async () => {
    const payload = JSON.stringify({ eventId: "event-123" }),
      timestamp = String(Math.floor(Date.now() / 1000));
    const signature = await sign(secret, "POST", "/webhook/lendloop-events", timestamp, payload);
    expect(() =>
      execute(
        "verify-event",
        [{ json: { body: { payload: payload + " ", timestamp, signature } } }],
        { CONVEX_TO_N8N_SECRET: secret },
      ),
    ).toThrow("signature");
  });
  it("signs n8n write-backs that Convex can verify", async () => {
    const result = execute(
      "sign-request",
      [{ json: { path: "/automation/remind", data: { loanId: "loan-123", day: "2026-11-02" } } }],
      { N8N_TO_CONVEX_SECRET: secret, CONVEX_SITE_URL: "https://test.convex.site" },
    );
    const value = result[0].json;
    expect(
      await verify(
        secret,
        "POST",
        "/automation/remind",
        value.timestamp,
        value.signature,
        value.body,
      ),
    ).toBe(true);
    expect(JSON.stringify(result)).not.toContain(secret);
  });
  it("restricts the callback host and allowed paths", () => {
    expect(() =>
      execute("sign-request", [{ json: { path: "/automation/notify", data: {} } }], {
        N8N_TO_CONVEX_SECRET: secret,
        CONVEX_SITE_URL: "http://attacker.example",
      }),
    ).toThrow("Configure");
    expect(() =>
      execute("sign-request", [{ json: { path: "/admin/delete", data: {} } }], {
        N8N_TO_CONVEX_SECRET: secret,
        CONVEX_SITE_URL: "https://test.convex.site",
      }),
    ).toThrow("Unknown");
  });
  it("exports the reviewed source and only references environment secrets", () => {
    for (const name of ["request-notifications", "overdue-reminders", "workflow-errors"]) {
      const data = JSON.parse(
        readFileSync(new URL("../n8n/workflows/" + name + ".json", import.meta.url), "utf8"),
      );
      expect(data.active).toBe(false);
      expect(data.pinData).toEqual({});
      for (const node of data.nodes) {
        if (node.type === "n8n-nodes-base.httpRequest") {
          expect(node.retryOnFail).toBe(true);
          expect(node.maxTries).toBe(3);
        }
        if (node.name.startsWith("Sign "))
          expect(node.parameters.jsCode).toBe(source("sign-request"));
        if (node.name === "Verify event")
          expect(node.parameters.jsCode).toBe(source("verify-event"));
        expect(node.credentials).toBeUndefined();
      }
    }
  });
});
