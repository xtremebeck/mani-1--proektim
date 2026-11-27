// Deploys one commit of the server to Railway, waits until it runs, and checks its health.
// CI calls it after the tests pass on main, so only tested code reaches the live server.
//
//   RAILWAY_TOKEN           a project token for the production environment (Project Settings → Tokens)
//   RAILWAY_SERVICE_ID      the service to deploy
//   RAILWAY_ENVIRONMENT_ID  its environment
//   COMMIT                  the commit to deploy (CI passes github.sha)
//   HEALTH_URL              checked once the deploy is live
//   RAILWAY_API_URL, DEPLOY_POLL_MS, DEPLOY_TIMEOUT_MS  optional, for tests
const env = process.env;
for (const name of ["RAILWAY_TOKEN", "RAILWAY_SERVICE_ID", "RAILWAY_ENVIRONMENT_ID", "COMMIT", "HEALTH_URL"]) {
  if (!env[name]) { console.error(`${name} is not set.`); process.exit(1); }
}
const api = env.RAILWAY_API_URL ?? "https://backboard.railway.com/graphql/v2";
const pollMs = Number(env.DEPLOY_POLL_MS ?? 10_000);
const timeoutMs = Number(env.DEPLOY_TIMEOUT_MS ?? 15 * 60_000);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function graphql(query, variables) {
  const response = await fetch(api, { method: "POST", headers: { "Content-Type": "application/json", "Project-Access-Token": env.RAILWAY_TOKEN }, body: JSON.stringify({ query, variables }) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.errors?.length) throw Error(`Railway API: ${body.errors?.map((error) => error.message).join("; ") || `HTTP ${response.status}`}`);
  return body.data;
}

const { serviceInstanceDeployV2: deploymentId } = await graphql(
  "mutation($serviceId: String!, $environmentId: String!, $commitSha: String) { serviceInstanceDeployV2(serviceId: $serviceId, environmentId: $environmentId, commitSha: $commitSha) }",
  { serviceId: env.RAILWAY_SERVICE_ID, environmentId: env.RAILWAY_ENVIRONMENT_ID, commitSha: env.COMMIT }
);
console.log(`Deploying ${env.COMMIT.slice(0, 7)} (deployment ${deploymentId})`);

const FAILED = ["FAILED", "CRASHED", "REMOVED", "SKIPPED"];
let status = "";
for (const deadline = Date.now() + timeoutMs; ;) {
  // A dropped request while polling is not a failed deploy; try again on the next round.
  const next = await graphql("query($id: String!) { deployment(id: $id) { status } }", { id: deploymentId }).then((data) => data.deployment.status, (error) => { console.log(error.message); return status; });
  if (next !== status) console.log(`  ${next}`);
  status = next;
  if (status === "SUCCESS") break;
  if (FAILED.includes(status)) { console.error(`Deployment ${status.toLowerCase()}. See its logs on Railway.`); process.exit(1); }
  if (Date.now() > deadline) { console.error(`Deployment still ${status} after ${timeoutMs / 60_000} minutes.`); process.exit(1); }
  await sleep(pollMs);
}

const health = await fetch(env.HEALTH_URL, { cache: "no-store" }).then((response) => response.json()).catch(() => null);
if (health?.status !== "ok") { console.error(`Deployed, but ${env.HEALTH_URL} did not answer "ok".`); process.exit(1); }
console.log(`Live and healthy: ${env.HEALTH_URL}`);
