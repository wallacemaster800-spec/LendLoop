import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  readLimitedBody,
  MAX_PHOTO_OUTPUT,
  photoDigest,
  photoProof,
  PhotoError,
} from "../lib/photo-policy";
import { verify } from "../lib/signatures";
const headers = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'none'; sandbox",
  Vary: "Authorization",
};
const error = (status: number) => new Response("Photo unavailable.", { status, headers });
export const upload = httpAction(async (ctx, request) => {
  const auth = await ctx.auth.getUserIdentity();
  if (!auth) return error(401);
  const secret = process.env.PHOTO_PROCESSOR_SECRET;
  if (!secret) return error(503);
  const ticketId = new URL(request.url).searchParams.get("ticket") ?? "";
  let stored: Id<"_storage"> | undefined;
  try {
    if (request.headers.get("content-type") !== "image/webp") return error(415);
    const ticket = ticketId as Id<"photoUploads">;
    await ctx.runQuery(internal.photos.ticket, { ticket });
    const bytes = await readLimitedBody(request, MAX_PHOTO_OUTPUT);
    const valid = await verify(
      secret,
      "POST",
      "/photos",
      request.headers.get("x-photo-timestamp"),
      request.headers.get("x-photo-signature"),
      photoProof(ticket, auth.subject, await photoDigest(bytes)),
    );
    if (!valid) return error(401);
    if (
      bytes.length < 12 ||
      String.fromCharCode(...bytes.slice(0, 4)) !== "RIFF" ||
      String.fromCharCode(...bytes.slice(8, 12)) !== "WEBP"
    )
      return error(415);
    stored = await ctx.storage.store(
      new Blob([new Uint8Array(bytes).buffer], { type: "image/webp" }),
    );
    await ctx.runMutation(internal.photos.attach, { ticket, storageId: stored });
    return new Response(null, { status: 204, headers });
  } catch (e) {
    if (stored) await ctx.storage.delete(stored);
    return error(e instanceof PhotoError ? e.status : 400);
  }
});
export const read = httpAction(async (ctx, request) => {
  if (!(await ctx.auth.getUserIdentity())) return error(401);
  try {
    const tool = new URL(request.url).searchParams.get("tool") as Id<"tools">;
    const id = await ctx.runQuery(internal.photos.current, { tool });
    if (!id) return error(404);
    const file = await ctx.storage.get(id);
    if (!file) return error(404);
    return new Response(file, {
      headers: {
        ...headers,
        "Content-Type": "image/webp",
        "Content-Disposition": 'inline; filename="tool.webp"',
      },
    });
  } catch {
    return error(404);
  }
});
