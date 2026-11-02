import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);
mkdirSync(".local", { recursive: true });
const code = (name) => readFileSync("n8n/code/" + name + ".js", "utf8");
const node = (name, source, x) => ({
  id: name,
  name,
  type: "n8n-nodes-base.code",
  typeVersion: 2,
  position: [x, 0],
  parameters: { mode: "runOnceForAllItems", jsCode: source },
});
const nodes = [
  {
    id: "start",
    name: "Start",
    type: "n8n-nodes-base.manualTrigger",
    typeVersion: 1,
    position: [0, 0],
    parameters: {},
  },
  node(
    "Fixture",
    "const crypto=require('crypto'); const timestamp=String(Math.floor(Date.now()/1000)); const payload=JSON.stringify({eventId:'local-check'}); const input=['POST','/webhook/lendloop-events',timestamp,payload].join('\\n'); const signature=crypto.createHmac('sha256',$env.CONVEX_TO_N8N_SECRET).update(input).digest('hex'); return [{json:{body:{timestamp,payload,signature}}}];",
    200,
  ),
  node("Verify", code("verify-event"), 400),
  node("Sign", code("sign-request"), 600),
  node(
    "Assert",
    "const crypto=require('crypto'); const v=$input.first().json; const input=['POST','/automation/notify',v.timestamp,v.body].join('\\n'); const expected=crypto.createHmac('sha256',$env.N8N_TO_CONVEX_SECRET).update(input).digest('hex'); if(v.signature!==expected||JSON.parse(v.body).eventId!=='local-check') throw new Error('Round-trip verification failed'); return [{json:{lendloopSmokePassed:true}}];",
    800,
  ),
];
const connections = {};
for (let i = 0; i < nodes.length - 1; i++)
  connections[nodes[i].name] = { main: [[{ node: nodes[i + 1].name, type: "main", index: 0 }]] };
writeFileSync(
  ".local/n8n-smoke.json",
  JSON.stringify(
    {
      id: "lendloop-local-check",
      name: "LendLoop local signing check",
      nodes,
      connections,
      active: false,
      settings: { executionOrder: "v1" },
    },
    null,
    2,
  ),
);
function docker(args) {
  const result = spawnSync("docker", ["compose", "--env-file", ".env.n8n", ...args], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  if (result.status !== 0)
    throw new Error((result.stderr || result.stdout || "Docker command failed").slice(-2000));
  return result.stdout;
}
docker(["cp", ".local/n8n-smoke.json", "n8n:/tmp/lendloop-smoke.json"]);
docker(["exec", "-T", "n8n", "n8n", "import:workflow", "--input=/tmp/lendloop-smoke.json"]);
const result = spawnSync(
  "docker",
  [
    "compose",
    "--env-file",
    ".env.n8n",
    "exec",
    "-T",
    "-e",
    "N8N_RUNNERS_BROKER_PORT=5680",
    "-e",
    "CONVEX_SITE_URL=https://smoke-test.convex.site",
    "n8n",
    "n8n",
    "execute",
    "--id=lendloop-local-check",
    "--rawOutput",
  ],
  { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
);
writeFileSync(".local/n8n-smoke.log", (result.stdout ?? "") + "\n" + (result.stderr ?? ""));
if (result.status !== 0 || !/"lendloopSmokePassed"\s*:\s*true/.test(result.stdout ?? "")) {
  console.error(
    "n8n signing check failed. Inspect .local/n8n-smoke.log (never commit execution logs).",
  );
  process.exitCode = 1;
} else
  console.log(
    "n8n runtime check passed: crypto import, environment access, envelope verification and callback signing.",
  );
