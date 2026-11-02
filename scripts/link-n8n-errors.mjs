import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
function docker(args) {
  const result = spawnSync("docker", ["compose", "--env-file", ".env.n8n", ...args], {
    encoding: "utf8",
  });
  if (result.status !== 0) throw new Error(result.stderr || "Docker command failed");
}
mkdirSync(".local", { recursive: true });
docker([
  "exec",
  "-T",
  "n8n",
  "n8n",
  "export:workflow",
  "--all",
  "--output=/tmp/lendloop-export.json",
]);
docker(["cp", "n8n:/tmp/lendloop-export.json", ".local/n8n-export.json"]);
const workflows = JSON.parse(readFileSync(".local/n8n-export.json", "utf8"));
const errors = workflows.find((w) => w.name === "LendLoop — workflow failures");
if (!errors) throw new Error("Import the three workflows first.");
const main = workflows.filter((w) =>
  ["LendLoop — request notifications", "LendLoop — daily overdue reminders"].includes(w.name),
);
for (const w of main) {
  w.settings = { ...w.settings, errorWorkflow: errors.id };
  w.active = false;
}
writeFileSync(".local/n8n-linked.json", JSON.stringify(main));
docker(["cp", ".local/n8n-linked.json", "n8n:/tmp/lendloop-linked.json"]);
docker(["exec", "-T", "n8n", "n8n", "import:workflow", "--input=/tmp/lendloop-linked.json"]);
console.log("Linked both local workflows to their error workflow. They remain inactive.");
