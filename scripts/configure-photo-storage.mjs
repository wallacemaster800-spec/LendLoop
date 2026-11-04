import { readFileSync, writeFileSync, mkdirSync, unlinkSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { parseEnv } from "node:util";
import { spawnSync } from "node:child_process";
const path = ".env.local";
let text = readFileSync(path, "utf8");
const env = parseEnv(text);
if (!env.CONVEX_DEPLOYMENT?.startsWith("dev:"))
  throw new Error("Select the development deployment first.");
const secret = env.PHOTO_PROCESSOR_SECRET || randomBytes(48).toString("hex");
if (secret.length < 32) throw new Error("Photo processor key must have at least 32 characters.");
if (!env.PHOTO_PROCESSOR_SECRET) {
  text += "\nPHOTO_PROCESSOR_SECRET=" + secret + "\n";
  writeFileSync(path, text);
}
mkdirSync(".local", { recursive: true });
const temporary = ".local/photo-runtime.env";
try {
  writeFileSync(temporary, "PHOTO_PROCESSOR_SECRET=" + secret + "\n");
  const r = spawnSync(
    process.execPath,
    ["node_modules/convex/bin/main.js", "env", "set", "--from-file", temporary],
    { encoding: "utf8" },
  );
  if (r.status !== 0) throw new Error("Could not configure the Convex photo processor key.");
  console.log("Photo processor key configured on Next.js and Convex; no secret printed.");
} finally {
  try {
    unlinkSync(temporary);
  } catch {}
}
