import { convexTest } from "convex-test";
import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import { day } from "../lib/domain";
import { sign } from "../lib/signatures";

const modules = import.meta.glob("../convex/**/*.ts");
const tomorrow = () => day(Date.now() + 86400000);
const input = {
  name: "Cordless drill",
  category: "Power tools" as const,
  condition: "Good" as const,
  description: "Two batteries, charger and a bit set.",
};
async function fixture() {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "owner", givenName: "Lender" });
  const borrower = t.withIdentity({ subject: "borrower", givenName: "Borrower" });
  const stranger = t.withIdentity({ subject: "stranger", givenName: "Stranger" });
  const administrator = t.withIdentity({ subject: "administrator", givenName: "Admin" });
  const ownerId = await owner.mutation(api.members.sync, {});
  const borrowerId = await borrower.mutation(api.members.sync, {});
  await stranger.mutation(api.members.sync, {});
  await administrator.mutation(api.members.sync, {});
  const tool = await owner.mutation(api.tools.save, input);
  const request = () =>
    borrower.mutation(api.loans.request, { tool, start: day(), end: tomorrow() });
  return { t, owner, borrower, stranger, administrator, ownerId, borrowerId, tool, request };
}
beforeEach(() => vi.stubEnv("ADMIN_SUBJECTS", "administrator"));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("authorization and public data", () => {
  it("exposes only names and categories publicly", async () => {
    const { t } = await fixture();
    expect(await t.query(api.tools.publicList, {})).toEqual([
      { name: input.name, category: input.category },
    ]);
  });
  it("requires authentication for private reads and writes", async () => {
    const { t, tool } = await fixture();
    await expect(t.query(api.tools.list, {})).rejects.toThrow("Sign in");
    await expect(t.query(api.loans.list, {})).rejects.toThrow("Sign in");
    await expect(t.mutation(api.tools.save, input)).rejects.toThrow("Sign in");
    await expect(
      t.mutation(api.loans.request, { tool, start: day(), end: tomorrow() }),
    ).rejects.toThrow("Sign in");
  });
  it("cannot edit or delete another member's listing", async () => {
    const { stranger, tool } = await fixture();
    await expect(
      stranger.mutation(api.tools.save, { ...input, id: tool, name: "Changed name" }),
    ).rejects.toThrow("own");
    await expect(stranger.mutation(api.tools.remove, { id: tool })).rejects.toThrow("own");
  });
  it("allows an owner to edit and soft-delete a listing", async () => {
    const { owner, t, tool } = await fixture();
    await owner.mutation(api.tools.save, { ...input, id: tool, name: "Updated drill" });
    expect((await t.query(api.tools.publicList, {}))[0].name).toBe("Updated drill");
    await owner.mutation(api.tools.remove, { id: tool });
    expect(await t.query(api.tools.publicList, {})).toEqual([]);
    expect(await t.run((ctx) => ctx.db.get(tool))).toMatchObject({ archived: true });
  });
  it("restricts admin queries, badges and retries", async () => {
    const { owner, borrowerId } = await fixture();
    await expect(owner.query(api.loans.all, {})).rejects.toThrow("Administrator");
    await expect(owner.query(api.members.list, {})).rejects.toThrow("Administrator");
    await expect(owner.query(api.automation.failures, {})).rejects.toThrow("Administrator");
    await expect(
      owner.mutation(api.members.setTrusted, { id: borrowerId, trusted: true }),
    ).rejects.toThrow("Administrator");
  });
  it("does not grant admin from a token role claim", async () => {
    const { t } = await fixture();
    const attacker = t.withIdentity({ subject: "stranger", role: "admin" });
    await expect(attacker.query(api.loans.all, {})).rejects.toThrow("Administrator");
  });
  it("lets admins remove listings and mark trusted lenders", async () => {
    const { administrator, ownerId, tool, t } = await fixture();
    await administrator.mutation(api.members.setTrusted, { id: ownerId, trusted: true });
    expect((await administrator.query(api.tools.list, {}))[0].trusted).toBe(true);
    await administrator.mutation(api.tools.remove, { id: tool });
    expect(await t.query(api.tools.publicList, {})).toEqual([]);
  });
});
describe("loan lifecycle", () => {
  it("rejects self-borrowing and duplicate open requests", async () => {
    const f = await fixture();
    await expect(
      f.owner.mutation(api.loans.request, { tool: f.tool, start: day(), end: tomorrow() }),
    ).rejects.toThrow("own tool");
    await f.request();
    await expect(f.request()).rejects.toThrow("open request");
  });
  it("keeps a third party out of request reads and transitions", async () => {
    const { stranger, request } = await fixture();
    const id = await request();
    expect(await stranger.query(api.loans.list, {})).toEqual([]);
    for (const action of ["approve", "decline", "cancel", "return"] as const)
      await expect(stranger.mutation(api.loans.transition, { id, action })).rejects.toThrow(
        "does not belong",
      );
  });
  it("does not let borrowers approve themselves or lenders cancel for them", async () => {
    const f = await fixture();
    const id = await f.request();
    await expect(
      f.borrower.mutation(api.loans.transition, { id, action: "approve" }),
    ).rejects.toThrow("lender");
    await expect(f.owner.mutation(api.loans.transition, { id, action: "cancel" })).rejects.toThrow(
      "borrower",
    );
  });
  it("approves and returns a loan, releasing public availability", async () => {
    const f = await fixture();
    const id = await f.request();
    await f.owner.mutation(api.loans.transition, { id, action: "approve" });
    expect(await f.t.query(api.tools.publicList, {})).toEqual([]);
    await f.borrower.mutation(api.loans.transition, { id, action: "return" });
    expect(await f.t.query(api.tools.publicList, {})).toHaveLength(1);
    expect((await f.owner.query(api.loans.list, {}))[0].status).toBe("returned");
    await expect(f.owner.mutation(api.loans.transition, { id, action: "return" })).rejects.toThrow(
      "approved loan",
    );
  });
  it("prevents overlapping approvals even when both requests were pending", async () => {
    const f = await fixture();
    const id = await f.request();
    const second = await f.stranger.mutation(api.loans.request, {
      tool: f.tool,
      start: day(),
      end: tomorrow(),
    });
    await f.owner.mutation(api.loans.transition, { id, action: "approve" });
    await expect(
      f.owner.mutation(api.loans.transition, { id: second, action: "approve" }),
    ).rejects.toThrow("reserves");
  });
  it("blocks owner removal while approved but permits admin removal without losing loan history", async () => {
    const f = await fixture();
    const id = await f.request();
    await f.owner.mutation(api.loans.transition, { id, action: "approve" });
    await expect(f.owner.mutation(api.tools.remove, { id: f.tool })).rejects.toThrow("outstanding");
    await f.administrator.mutation(api.tools.remove, { id: f.tool });
    expect(await f.borrower.query(api.loans.list, {})).toHaveLength(1);
    await f.borrower.mutation(api.loans.transition, { id, action: "return" });
  });
  it("declines pending requests when a listing is removed", async () => {
    const f = await fixture();
    await f.request();
    await f.owner.mutation(api.tools.remove, { id: f.tool });
    expect((await f.borrower.query(api.loans.list, {}))[0].status).toBe("declined");
  });
  it("supports borrower cancellation and lender decline", async () => {
    const f = await fixture();
    const id = await f.request();
    await f.borrower.mutation(api.loans.transition, { id, action: "cancel" });
    const second = await f.request();
    await f.owner.mutation(api.loans.transition, { id: second, action: "decline" });
    expect((await f.borrower.query(api.loans.list, {})).map((l) => l.status).sort()).toEqual([
      "cancelled",
      "declined",
    ]);
  });
  it("does not allow early return of a future reservation", async () => {
    const f = await fixture();
    const id = await f.borrower.mutation(api.loans.request, {
      tool: f.tool,
      start: tomorrow(),
      end: tomorrow(),
    });
    await f.owner.mutation(api.loans.transition, { id, action: "approve" });
    await expect(
      f.borrower.mutation(api.loans.transition, { id, action: "return" }),
    ).rejects.toThrow("not started");
  });
  it("blocks new reservations until an overdue item is actually returned", async () => {
    const f = await fixture();
    const id = await f.request();
    await f.owner.mutation(api.loans.transition, { id, action: "approve" });
    await f.t.run((ctx) =>
      ctx.db.patch(id, { start: day(Date.now() - 3 * 86400000), end: day(Date.now() - 86400000) }),
    );
    await expect(
      f.stranger.mutation(api.loans.request, { tool: f.tool, start: tomorrow(), end: tomorrow() }),
    ).rejects.toThrow("unavailable");
  });
});
describe("automation delivery and idempotency", () => {
  it("records one mock notification for repeated event callbacks", async () => {
    const f = await fixture();
    await f.request();
    const events = await f.t.query(internal.automation.dueEvents, {});
    expect(events).toHaveLength(1);
    const eventId = events[0]._id;
    expect(await f.t.mutation(internal.automation.recordEvent, { eventId })).toMatchObject({
      recorded: true,
    });
    expect(await f.t.mutation(internal.automation.recordEvent, { eventId })).toMatchObject({
      duplicate: true,
    });
    const notes = await f.t.run((ctx) => ctx.db.query("notifications").collect());
    expect(notes).toHaveLength(1);
    expect(notes[0].recipient).toBe(f.ownerId);
  });
  it("leases deliveries and ignores stale attempt completions", async () => {
    const f = await fixture();
    await f.request();
    const [{ _id: id }] = await f.t.query(internal.automation.dueEvents, {});
    expect(await f.t.mutation(internal.automation.claim, { id })).toMatchObject({ attempts: 1 });
    expect(await f.t.mutation(internal.automation.claim, { id })).toBeNull();
    await f.t.mutation(internal.automation.finish, { id, attempt: 999, error: "stale" });
    expect((await f.t.run((ctx) => ctx.db.get(id)))?.error).toBeUndefined();
    await f.t.mutation(internal.automation.finish, { id, attempt: 1 });
    expect((await f.t.run((ctx) => ctx.db.get(id)))?.error).toContain("did not record");
  });
  it("moves persistent failures to the visible admin queue and supports retry", async () => {
    const f = await fixture();
    await f.request();
    const [{ _id: id }] = await f.t.query(internal.automation.dueEvents, {});
    await f.t.run((ctx) => ctx.db.patch(id, { attempts: 5 }));
    await f.t.mutation(internal.automation.finish, { id, attempt: 5, error: "Delivery failed" });
    expect(await f.administrator.query(api.automation.failures, {})).toHaveLength(1);
    await expect(f.owner.mutation(api.automation.retry, { id })).rejects.toThrow("Administrator");
    await f.administrator.mutation(api.automation.retry, { id });
    expect(await f.t.query(internal.automation.dueEvents, {})).toHaveLength(1);
  });
  it("writes one reminder per loan per UTC day and rechecks return status", async () => {
    const f = await fixture();
    const loanId = await f.request();
    await f.owner.mutation(api.loans.transition, { id: loanId, action: "approve" });
    await f.t.run((ctx) =>
      ctx.db.patch(loanId, {
        start: day(Date.now() - 3 * 86400000),
        end: day(Date.now() - 86400000),
      }),
    );
    expect(await f.t.query(internal.automation.overdue, {})).toEqual([{ loanId, day: day() }]);
    expect(
      await f.t.mutation(internal.automation.recordReminder, { loanId, day: day() }),
    ).toMatchObject({ recorded: true });
    expect(
      await f.t.mutation(internal.automation.recordReminder, { loanId, day: day() }),
    ).toMatchObject({ duplicate: true });
    expect(await f.t.query(internal.automation.overdue, {})).toEqual([]);
    await expect(
      f.t.mutation(internal.automation.recordReminder, { loanId, day: tomorrow() }),
    ).rejects.toThrow("today");
    await f.borrower.mutation(api.loans.transition, { id: loanId, action: "return" });
    expect(
      await f.t.mutation(internal.automation.recordReminder, { loanId, day: day() }),
    ).toMatchObject({ skipped: true });
  });
  it("signs outgoing events without leaking member or listing data", async () => {
    const f = await fixture();
    await f.request();
    vi.stubEnv("N8N_WEBHOOK_URL", "https://automations.example/webhook/lendloop-events");
    vi.stubEnv("CONVEX_TO_N8N_SECRET", "a".repeat(64));
    const calls: string[] = [];
    vi.stubGlobal("fetch", async (_url: unknown, options: RequestInit) => {
      const raw = String(options.body);
      calls.push(raw);
      const envelope = JSON.parse(raw),
        payload = JSON.parse(envelope.payload);
      expect(Object.keys(payload)).toEqual(["eventId"]);
      await f.t.mutation(internal.automation.recordEvent, { eventId: payload.eventId });
      return new Response("{}", { status: 200 });
    });
    await f.t.action(internal.delivery.dispatch, {});
    expect(calls).toHaveLength(1);
    expect(calls[0]).not.toContain("Borrower");
    expect(await f.t.query(internal.automation.dueEvents, {})).toEqual([]);
  });
});
describe("HTTP integration boundary", () => {
  it("fails closed without configuration and rejects unsigned requests", async () => {
    const { t } = await fixture();
    const request = { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" };
    expect((await t.fetch("/automation/overdue", request)).status).toBe(503);
    vi.stubEnv("N8N_TO_CONVEX_SECRET", "a".repeat(64));
    expect((await t.fetch("/automation/overdue", request)).status).toBe(401);
  });
  it("accepts signed reads and rejects forged recipients and replay on another endpoint", async () => {
    const { t } = await fixture();
    const secret = "a".repeat(64);
    vi.stubEnv("N8N_TO_CONVEX_SECRET", secret);
    const timestamp = String(Math.floor(Date.now() / 1000)),
      body = "{}",
      path = "/automation/overdue";
    const signature = await sign(secret, "POST", path, timestamp, body);
    const headers = {
      "Content-Type": "application/json",
      "x-lendloop-timestamp": timestamp,
      "x-lendloop-signature": signature,
    };
    const response = await t.fetch(path, { method: "POST", headers, body });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ loans: [] });
    expect((await t.fetch("/automation/remind", { method: "POST", headers, body })).status).toBe(
      401,
    );
    const malicious = JSON.stringify({ eventId: "made-up", recipient: "attacker" });
    const signed = await sign(secret, "POST", "/automation/notify", timestamp, malicious);
    expect(
      (
        await t.fetch("/automation/notify", {
          method: "POST",
          headers: { ...headers, "x-lendloop-signature": signed },
          body: malicious,
        })
      ).status,
    ).toBe(400);
  });
});
