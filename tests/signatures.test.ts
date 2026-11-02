import { describe, it, expect } from "vitest";
import { sign, verify } from "../lib/signatures";
const secret = "a".repeat(64),
  other = "b".repeat(64),
  now = 1793664000000,
  stamp = String(now / 1000);
const path = "/automation/notify",
  body = JSON.stringify({ eventId: "test-event" });
describe("HMAC integration authentication", () => {
  it("accepts the exact signed request", async () =>
    expect(
      await verify(
        secret,
        "POST",
        path,
        stamp,
        await sign(secret, "POST", path, stamp, body),
        body,
        now,
      ),
    ).toBe(true));
  it("rejects a changed body, method, path or key", async () => {
    const signature = await sign(secret, "POST", path, stamp, body);
    expect(await verify(secret, "POST", path, stamp, signature, body + " ", now)).toBe(false);
    expect(await verify(secret, "GET", path, stamp, signature, body, now)).toBe(false);
    expect(await verify(secret, "POST", "/automation/remind", stamp, signature, body, now)).toBe(
      false,
    );
    expect(await verify(other, "POST", path, stamp, signature, body, now)).toBe(false);
  });
  it("rejects stale and far-future signatures", async () => {
    const signature = await sign(secret, "POST", path, stamp, body);
    expect(await verify(secret, "POST", path, stamp, signature, body, now + 301000)).toBe(false);
    expect(await verify(secret, "POST", path, stamp, signature, body, now - 301000)).toBe(false);
  });
  it("rejects malformed or missing signatures without throwing", async () => {
    for (const value of [null, "x", "a".repeat(63), "g".repeat(64)])
      expect(await verify(secret, "POST", path, stamp, value, body, now)).toBe(false);
    expect(await verify(secret, "POST", path, "", null, body, now)).toBe(false);
  });
  it("refuses a weak secret", async () =>
    await expect(sign("short", "POST", path, stamp, body)).rejects.toThrow());
});
