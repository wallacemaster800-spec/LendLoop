import { convexTest } from "convex-test";
import { test, expect, afterEach, vi } from "vitest";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import { sign } from "../lib/signatures";
import { photoDigest, photoProof } from "../lib/photo-policy";
const modules = import.meta.glob("../convex/**/*.ts");
const secret = "photo-processor-test-key-".repeat(3);
// HTTP trust-boundary fixture. Actual decoding is tested in process-photo.test.ts.
const image = Uint8Array.from([82, 73, 70, 70, 4, 0, 0, 0, 87, 69, 66, 80]);
async function fixture() {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "owner", givenName: "Owner" });
  const stranger = t.withIdentity({ subject: "other", givenName: "Other" });
  const admin = t.withIdentity({ subject: "admin", givenName: "Admin" });
  for (const user of [owner, stranger, admin]) await user.mutation(api.members.sync, {});
  const tool = await owner.mutation(api.tools.save, {
    name: "Tool",
    description: "A tool for image tests",
    category: "Hand tools",
    condition: "Good",
  });
  vi.stubEnv("PHOTO_PROCESSOR_SECRET", secret);
  vi.stubEnv("ADMIN_SUBJECTS", "admin");
  return { t, owner, stranger, admin, tool };
}
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});
async function body(ticket: string, subject = "owner", bytes = image) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  return {
    method: "POST",
    headers: {
      "Content-Type": "image/webp",
      "x-photo-timestamp": timestamp,
      "x-photo-signature": await sign(
        secret,
        "POST",
        "/photos",
        timestamp,
        photoProof(ticket, subject, await photoDigest(bytes)),
      ),
    },
    body: bytes.buffer as ArrayBuffer,
  };
}
test("guests cannot read photos, upload or reserve a ticket", async () => {
  const { t, tool } = await fixture();
  expect((await t.fetch("/photos?tool=" + tool)).status).toBe(401);
  expect((await t.fetch("/photos", { method: "POST" })).status).toBe(401);
  await expect(t.mutation(api.photos.reserve, { tool })).rejects.toThrow("Sign in");
});
test("another member and admin cannot replace the owner's photo", async () => {
  const { stranger, admin, tool } = await fixture();
  await expect(stranger.mutation(api.photos.reserve, { tool })).rejects.toThrow("Only the owner");
  await expect(admin.mutation(api.photos.reserve, { tool })).rejects.toThrow("Only the owner");
  await expect(stranger.mutation(api.photos.remove, { tool })).rejects.toThrow("cannot");
});
test("raw uploads require a processor signature, not just a user token", async () => {
  const { owner, t, tool } = await fixture();
  const ticket = await owner.mutation(api.photos.reserve, { tool });
  expect(
    (
      await owner.fetch("/photos?ticket=" + ticket, {
        method: "POST",
        headers: { "Content-Type": "image/webp" },
        body: image.buffer,
      })
    ).status,
  ).toBe(401);
  const signed = await body(ticket);
  const tampered = image.slice();
  tampered[4] = 5;
  expect(
    (await owner.fetch("/photos?ticket=" + ticket, { ...signed, body: tampered.buffer })).status,
  ).toBe(401);
  expect((await t.run((ctx) => ctx.db.get(tool)))?.photoId).toBeUndefined();
});
test("tickets are bound to identity and expire", async () => {
  const { owner, stranger, tool } = await fixture();
  const ticket = await owner.mutation(api.photos.reserve, { tool });
  expect(
    (await stranger.fetch("/photos?ticket=" + ticket, await body(ticket, "other"))).status,
  ).toBe(400);
  vi.useFakeTimers();
  vi.setSystemTime(Date.now() + 121_000);
  expect((await owner.fetch("/photos?ticket=" + ticket, await body(ticket))).status).toBe(400);
});
test("uploads are rate limited in the shared database", async () => {
  const { owner, tool } = await fixture();
  for (let i = 0; i < 5; i++) await owner.mutation(api.photos.reserve, { tool });
  await expect(owner.mutation(api.photos.reserve, { tool })).rejects.toThrow("limit");
});
test("replacement deletes old bytes, replay fails, and public query hides photos", async () => {
  const { owner, stranger, t, tool } = await fixture();
  const first = await owner.mutation(api.photos.reserve, { tool });
  expect((await owner.fetch("/photos?ticket=" + first, await body(first))).status).toBe(204);
  const original = (await t.run((ctx) => ctx.db.get(tool)))!.photoId!;
  expect((await owner.fetch("/photos?ticket=" + first, await body(first))).status).toBe(400);
  const photo = await stranger.fetch("/photos?tool=" + tool);
  expect(photo.status).toBe(200);
  expect(photo.headers.get("content-type")).toBe("image/webp");
  expect(photo.headers.get("cache-control")).toContain("no-store");
  expect(Object.keys((await t.query(api.tools.publicList, {}))[0]).sort()).toEqual([
    "category",
    "name",
  ]);
  const second = await owner.mutation(api.photos.reserve, { tool });
  expect((await owner.fetch("/photos?ticket=" + second, await body(second))).status).toBe(204);
  expect(await t.run((ctx) => ctx.storage.get(original))).toBeNull();
  await owner.mutation(api.photos.remove, { tool });
  expect((await owner.fetch("/photos?tool=" + tool)).status).toBe(404);
});
test("archiving removes the file and invalidates an outstanding upload", async () => {
  const { owner, admin, t, tool } = await fixture();
  const a = await owner.mutation(api.photos.reserve, { tool });
  await owner.fetch("/photos?ticket=" + a, await body(a));
  const file = (await t.run((ctx) => ctx.db.get(tool)))!.photoId!;
  const b = await owner.mutation(api.photos.reserve, { tool });
  await admin.mutation(api.tools.remove, { id: tool });
  expect(await t.run((ctx) => ctx.storage.get(file))).toBeNull();
  expect((await owner.fetch("/photos?ticket=" + b, await body(b))).status).toBe(400);
});
test("admin can remove a photo for moderation", async () => {
  const { owner, admin, tool } = await fixture();
  const a = await owner.mutation(api.photos.reserve, { tool });
  await owner.fetch("/photos?ticket=" + a, await body(a));
  await admin.mutation(api.photos.remove, { tool });
  expect((await owner.fetch("/photos?tool=" + tool)).status).toBe(404);
});
test("expired tickets are cleaned up", async () => {
  const { owner, t, tool } = await fixture();
  await owner.mutation(api.photos.reserve, { tool });
  vi.useFakeTimers();
  vi.setSystemTime(Date.now() + 121_000);
  await t.mutation(internal.photos.cleanup, {});
  expect(await t.run((ctx) => ctx.db.query("photoUploads").collect())).toEqual([]);
});
