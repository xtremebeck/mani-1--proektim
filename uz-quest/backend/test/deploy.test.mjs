import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const script = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../scripts/deploy-railway.mjs");

// A fake Railway API that walks one deployment through the given statuses, plus a health check.
async function fakeRailway(statuses, health = { status: "ok" }) {
  const seen = [];
  const server = createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk;
    if (req.url === "/health") return res.end(JSON.stringify(health));
    const { query, variables } = JSON.parse(body);
    seen.push({ token: req.headers["project-access-token"], query, variables });
    const data = query.includes("serviceInstanceDeployV2") ? { serviceInstanceDeployV2: "dep-1" } : { deployment: { status: statuses.shift() ?? "SUCCESS" } };
    res.end(JSON.stringify({ data }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return { seen, base: `http://127.0.0.1:${server.address().port}`, close: () => server.close() };
}

function run(base, extra = {}) {
  const child = spawn(process.execPath, [script], {
    env: { PATH: process.env.PATH, RAILWAY_TOKEN: "t0ken", RAILWAY_SERVICE_ID: "svc", RAILWAY_ENVIRONMENT_ID: "env", COMMIT: "abc1234def", HEALTH_URL: `${base}/health`, RAILWAY_API_URL: `${base}/graphql`, DEPLOY_POLL_MS: "5", ...extra },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });
  return new Promise((resolve) => child.on("exit", (code) => resolve({ code, output })));
}

test("the deploy script deploys the given commit and waits until it is live and healthy", async () => {
  const railway = await fakeRailway(["QUEUED", "BUILDING", "DEPLOYING", "SUCCESS"]);
  try {
    const { code, output } = await run(railway.base);
    assert.equal(code, 0, output);
    assert.deepEqual(railway.seen[0].variables, { serviceId: "svc", environmentId: "env", commitSha: "abc1234def" });
    assert.ok(railway.seen.every((call) => call.token === "t0ken"));
    assert.match(output, /BUILDING[\s\S]*SUCCESS[\s\S]*Live and healthy/);
  } finally { railway.close(); }
});

test("the deploy script fails on a failed deploy, an unhealthy server, or a timeout", async () => {
  const failed = await fakeRailway(["BUILDING", "FAILED"]);
  try { assert.equal((await run(failed.base)).code, 1); } finally { failed.close(); }
  const sick = await fakeRailway(["SUCCESS"], { status: "down" });
  try { assert.match((await run(sick.base)).output, /did not answer "ok"/); } finally { sick.close(); }
  const stuck = await fakeRailway(Array(1000).fill("BUILDING"));
  try {
    const { code, output } = await run(stuck.base, { DEPLOY_TIMEOUT_MS: "50" });
    assert.equal(code, 1);
    assert.match(output, /still BUILDING/);
  } finally { stuck.close(); }
  const { code, output } = await run("http://127.0.0.1:9", { RAILWAY_TOKEN: "" });
  assert.equal(code, 1);
  assert.match(output, /RAILWAY_TOKEN is not set/);
});
