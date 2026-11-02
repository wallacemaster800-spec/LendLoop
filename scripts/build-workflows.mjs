import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const code = (name) => readFileSync(resolve(root, "n8n/code", name + ".js"), "utf8");
const node = (name, type, parameters, position, extra = {}) => ({
  id: name.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-"),
  name,
  type: "n8n-nodes-base." + type,
  typeVersion: 1,
  position,
  parameters,
  ...extra,
});
const js = (name, source, position) =>
  node(name, "code", { jsCode: source, mode: "runOnceForAllItems" }, position, { typeVersion: 2 });
const http = (name, position) =>
  node(
    name,
    "httpRequest",
    {
      method: "POST",
      url: "={{ $json.url }}",
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: "Content-Type", value: "application/json" },
          { name: "x-lendloop-timestamp", value: "={{ $json.timestamp }}" },
          { name: "x-lendloop-signature", value: "={{ $json.signature }}" },
        ],
      },
      sendBody: true,
      contentType: "raw",
      rawContentType: "application/json",
      body: "={{ $json.body }}",
      options: { timeout: 15000, redirect: { redirect: { followRedirects: false } } },
    },
    position,
    { typeVersion: 4.2, retryOnFail: true, maxTries: 3, waitBetweenTries: 2000 },
  );
function workflow(name, nodes, edges) {
  const connections = {};
  for (const [from, to] of edges) {
    connections[from] = { main: [[{ node: to, type: "main", index: 0 }]] };
  }
  return {
    name,
    nodes,
    connections,
    active: false,
    pinData: {},
    settings: {
      executionOrder: "v1",
      timezone: "Etc/UTC",
      saveDataErrorExecution: "all",
      saveDataSuccessExecution: "all",
      saveManualExecutions: true,
      executionTimeout: 300,
    },
    tags: [],
  };
}
const request = workflow(
  "LendLoop — request notifications",
  [
    node(
      "Signed event",
      "webhook",
      { httpMethod: "POST", path: "lendloop-events", responseMode: "responseNode", options: {} },
      [0, 0],
      { typeVersion: 2, webhookId: "lendloop-events" },
    ),
    js("Verify event", code("verify-event"), [240, 0]),
    js("Sign notification receipt", code("sign-request"), [480, 0]),
    http("Record mock notification", [720, 0]),
    node(
      "Acknowledge",
      "respondToWebhook",
      { respondWith: "json", responseBody: "={{ { ok: true } }}", options: { responseCode: 200 } },
      [960, 0],
      { typeVersion: 1.4 },
    ),
  ],
  [
    ["Signed event", "Verify event"],
    ["Verify event", "Sign notification receipt"],
    ["Sign notification receipt", "Record mock notification"],
    ["Record mock notification", "Acknowledge"],
  ],
);
const overdue = workflow(
  "LendLoop — daily overdue reminders",
  [
    node(
      "Every morning UTC",
      "scheduleTrigger",
      {
        rule: {
          interval: [{ field: "days", daysInterval: 1, triggerAtHour: 9, triggerAtMinute: 0 }],
        },
      },
      [0, 0],
      { typeVersion: 1.2 },
    ),
    node("Run manually", "manualTrigger", {}, [0, 180]),
    js("Prepare overdue query", 'return [{json:{path:"/automation/overdue",data:{}}}];', [220, 0]),
    js("Sign overdue query", code("sign-request"), [440, 0]),
    http("Fetch overdue loans", [660, 0]),
    node("One item per loan", "splitOut", { fieldToSplitOut: "loans", options: {} }, [880, 0]),
    js(
      "Prepare reminders",
      'return $input.all().map(item=>({json:{path:"/automation/remind",data:{loanId:item.json.loanId,day:item.json.day}}}));',
      [1100, 0],
    ),
    js("Sign reminder receipts", code("sign-request"), [1320, 0]),
    http("Record mock reminders", [1540, 0]),
  ],
  [
    ["Every morning UTC", "Prepare overdue query"],
    ["Run manually", "Prepare overdue query"],
    ["Prepare overdue query", "Sign overdue query"],
    ["Sign overdue query", "Fetch overdue loans"],
    ["Fetch overdue loans", "One item per loan"],
    ["One item per loan", "Prepare reminders"],
    ["Prepare reminders", "Sign reminder receipts"],
    ["Sign reminder receipts", "Record mock reminders"],
  ],
);
const errors = workflow(
  "LendLoop — workflow failures",
  [
    node("Workflow failed", "errorTrigger", {}, [0, 0]),
    js(
      "Minimal failure log",
      'const e=$input.first().json; const failure={workflow:e.workflow?.name??"unknown",execution:e.execution?.id??null,failedAt:new Date().toISOString(),action:"Inspect the failed execution and retry after correcting configuration."}; console.error(JSON.stringify(failure)); return [{json:failure}];',
      [260, 0],
    ),
  ],
  [["Workflow failed", "Minimal failure log"]],
);
mkdirSync(resolve(root, "n8n/workflows"), { recursive: true });
for (const [name, value] of [
  ["request-notifications", request],
  ["overdue-reminders", overdue],
  ["workflow-errors", errors],
])
  writeFileSync(
    resolve(root, "n8n/workflows", name + ".json"),
    JSON.stringify(value, null, 2) + "\n",
  );
console.log("Wrote 3 n8n workflows. No secrets or execution data included.");
