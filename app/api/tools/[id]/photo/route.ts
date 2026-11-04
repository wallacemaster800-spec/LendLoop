import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { processPhoto } from "@/lib/process-photo";
import {
  MAX_PHOTO_INPUT,
  readLimitedBody,
  PhotoError,
  photoDigest,
  photoProof,
} from "@/lib/photo-policy";
import { sign } from "@/lib/signatures";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
let inFlight = 0;
const headers = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
  Vary: "Cookie",
};
const reply = (message: string, status: number) =>
  Response.json({ error: message }, { status, headers });
async function session() {
  const user = await auth();
  if (!user.userId) return null;
  const token = await user.getToken({ template: "convex" });
  if (!token) return null;
  const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  client.setAuth(token);
  return { subject: user.userId, token, client };
}
type Context = { params: Promise<{ id: string }> };
export async function POST(request: Request, context: Context) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return reply("Invalid request origin.", 403);
  const user = await session();
  if (!user) return reply("Sign in to upload a photo.", 401);
  const secret = process.env.PHOTO_PROCESSOR_SECRET;
  if (!secret) return reply("Photo uploads are not configured.", 503);
  if (inFlight >= 2) return reply("Image processing is busy. Please retry shortly.", 429);
  inFlight++;
  try {
    const { id } = await context.params;
    let ticket: Id<"photoUploads">;
    try {
      ticket = await user.client.mutation(api.photos.reserve, { tool: id as Id<"tools"> });
    } catch {
      return reply(
        "You cannot upload here, or your five uploads per ten minutes have been used.",
        403,
      );
    }
    const input = await readLimitedBody(request, MAX_PHOTO_INPUT);
    const bytes = await processPhoto(input, request.headers.get("content-type") ?? "");
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = await sign(
      secret,
      "POST",
      "/photos",
      timestamp,
      photoProof(ticket, user.subject, await photoDigest(bytes)),
    );
    const site = process.env.NEXT_PUBLIC_CONVEX_SITE_URL!;
    const response = await fetch(new URL("/photos?ticket=" + encodeURIComponent(ticket), site), {
      method: "POST",
      headers: {
        Authorization: "Bearer " + user.token,
        "Content-Type": "image/webp",
        "x-photo-timestamp": timestamp,
        "x-photo-signature": signature,
      },
      body: new Uint8Array(bytes).buffer,
      redirect: "error",
      signal: AbortSignal.timeout(20000),
      cache: "no-store",
    });
    if (!response.ok) return reply("Photo could not be saved. Please retry.", 502);
    return Response.json({ ok: true }, { headers });
  } catch (e) {
    return reply(
      e instanceof PhotoError ? e.message : "Photo could not be saved.",
      e instanceof PhotoError ? e.status : 500,
    );
  } finally {
    inFlight--;
  }
}
export async function GET(request: Request, context: Context) {
  const user = await session();
  if (!user) return reply("Sign in to view photos.", 401);
  try {
    const { id } = await context.params;
    const response = await fetch(
      new URL("/photos?tool=" + encodeURIComponent(id), process.env.NEXT_PUBLIC_CONVEX_SITE_URL!),
      {
        headers: { Authorization: "Bearer " + user.token },
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!response.ok) return reply("Photo unavailable.", response.status === 401 ? 401 : 404);
    return new Response(response.body, {
      headers: {
        ...headers,
        "Content-Type": "image/webp",
        "Content-Disposition": 'inline; filename="tool.webp"',
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch {
    return reply("Photo unavailable.", 502);
  }
}
