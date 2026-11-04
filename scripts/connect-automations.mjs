import { spawnSync } from "node:child_process";
const compose = [
  "compose",
  "--env-file",
  ".env.n8n",
  "-f",
  "compose.yml",
  "-f",
  "compose.tunnel.yml",
];
function docker(args) {
  const r = spawnSync("docker", [...compose, ...args], { encoding: "utf8", maxBuffer: 5e6 });
  if (r.status !== 0) throw new Error(r.stderr || "Docker command failed");
  return r.stdout + r.stderr;
}
const logs = docker(["logs", "tunnel"]);
const matches = [...logs.matchAll(/https:\/\/([a-z0-9-]+)\.trycloudflare\.com/g)];
if (!matches.length) throw new Error("Tunnel is not ready. Wait a few seconds and retry.");
const origin = matches.at(-1)[0];
const target = origin + "/webhook/lendloop-events";
const result = spawnSync(
  process.execPath,
  ["node_modules/convex/bin/main.js", "env", "set", "N8N_WEBHOOK_URL", target],
  { encoding: "utf8" },
);
if (result.status !== 0) throw new Error("Could not set the Convex webhook URL.");
for (const [path, options, expected] of [
  ["/", {}, 404],
  [
    "/webhook/lendloop-events",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
    401,
  ],
]) {
  const r = await fetch(origin + path, { ...options, signal: AbortSignal.timeout(20000) });
  if (r.status !== expected) throw new Error("Gateway verification failed: " + r.status);
}
console.log("Convex webhook updated. Editor route blocked; unsigned requests rejected.");
