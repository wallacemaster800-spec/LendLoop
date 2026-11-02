import { existsSync, copyFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
if (!existsSync(".env.local")) copyFileSync(".env.example", ".env.local");
if (!existsSync(".env.n8n")) {
  const secret = () => randomBytes(32).toString("hex");
  writeFileSync(
    ".env.n8n",
    [
      "N8N_ENCRYPTION_KEY=" + secret(),
      "CONVEX_TO_N8N_SECRET=" + secret(),
      "N8N_TO_CONVEX_SECRET=" + secret(),
      "CONVEX_SITE_URL=",
      "N8N_PUBLIC_URL=",
      "",
    ].join("\n"),
  );
}
console.log("Local env files are ready. Existing values were preserved; no secrets were printed.");
