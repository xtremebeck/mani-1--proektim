import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { CITIES } from "../../public/shared/content.mjs";
import { dailyFor, dayKey } from "../../public/shared/engine.mjs";
import { DEV_CODES, DEV_CODES_FILE, post, start } from "./support/server.mjs";

test("a malformed URL gets a 400 and does not crash the server", async () => {
  const server = await start();
  try {
    const response = await fetch(`${server.base}/%E0%A4%A`);
    assert.equal(response.status, 400);
    assert.equal((await fetch(`${server.base}/api/v1/health`)).status, 200);
    assert.equal(server.alive(), true);
  } finally { await server.stop(); }
});

test("oversized and malformed bodies get 413 and 400", async () => {
  const server = await start();
  try {
    assert.equal((await post(server.base, "/api/v1/sync", "x".repeat(300 * 1024))).status, 413);
    assert.equal((await post(server.base, "/api/v1/sync", "{nope")).status, 400);
    assert.equal((await post(server.base, "/api/v1/sync", "null")).status, 400);
  } finally { await server.stop(); }
});

test("sync rejects back-dated daily claims", async () => {
  const server = await start();
  try {
    const tashkent = CITIES.find((city) => city.id === "tashkent");
    const now = Date.now();
    const events = [1, 2, 3].map((days) => {
      const at = now - days * 86400000;
      return { id: `evt-old-daily-${days}`, type: "daily", cityId: "tashkent", dailyId: dailyFor(tashkent, dayKey(at)).id, at };
    });
    events.push({ id: "evt-today-daily", type: "daily", cityId: "tashkent", dailyId: dailyFor(tashkent, dayKey(now)).id, at: now });
    const data = await (await post(server.base, "/api/v1/sync", { deviceId: "device-test-0001", events })).json();
    // One day back is inside the 48h window; two and three days back are not.
    assert.deepEqual(data.rejected.map((item) => item.error), ["CLAIM_EXPIRED", "CLAIM_EXPIRED"]);
    assert.equal(data.accepted.length, 2);
  } finally { await server.stop(); }
});

test("test events follow NODE_ENV and ALLOW_TEST_EVENTS", async () => {
  const hunt = CITIES.flatMap((c) => c.places.flatMap((p) => p.quests)).find((q) => q.type === "hunt");
  const event = { id: "evt-test-hunt-1", type: "quest", questId: hunt.id, test: true, at: Date.now() };
  const dev = await start();
  try {
    assert.equal((await (await fetch(`${dev.base}/api/v1/health`)).json()).testEvents, true);
    assert.equal((await (await post(dev.base, "/api/v1/sync", { deviceId: "device-test-0002", events: [event] })).json()).accepted.length, 1);
  } finally { await dev.stop(); }
  const prod = await start({ NODE_ENV: "production", ADMIN_KEY: "a-real-secret-key", MEET_CODES_FILE: DEV_CODES_FILE });
  try {
    assert.equal((await (await fetch(`${prod.base}/api/v1/health`)).json()).testEvents, false);
    const data = await (await post(prod.base, "/api/v1/sync", { deviceId: "device-test-0003", events: [event] })).json();
    assert.equal(data.rejected[0].error, "TEST_DISABLED");
  } finally { await prod.stop(); }
});

test("the dev admin key is refused outside local development", async () => {
  for (const env of [{ NODE_ENV: "production" }, { HOST: "0.0.0.0" }]) {
    const server = await start(env);
    try {
      assert.equal(server.exitCode, 1);
      assert.match(server.output(), /ADMIN_KEY must be set/);
    } finally { await server.stop(); }
  }
});

test("admin key guessing is rate-limited", async () => {
  const server = await start();
  try {
    const statuses = [];
    for (let i = 0; i < 12; i++) statuses.push((await fetch(`${server.base}/api/v1/admin/overview`, { headers: { "x-admin-key": `guess-${i}` } })).status);
    assert.deepEqual(statuses.slice(0, 10), Array(10).fill(401));
    assert.deepEqual(statuses.slice(10), [429, 429]);
    // Even the right key is blocked until the window resets.
    assert.equal((await fetch(`${server.base}/api/v1/admin/overview`, { headers: { "x-admin-key": "uzquest-dev-admin" } })).status, 429);
  } finally { await server.stop(); }
});

test("a corrupt data file stops startup with a clear message", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "uzq-test-"));
  const file = path.join(dir, "store.json");
  await writeFile(file, "{broken");
  const server = await start({ DATA_FILE: file });
  try {
    assert.equal(server.exitCode, 1);
    assert.match(server.output(), /not valid JSON/);
  } finally { await server.stop(); await rm(dir, { recursive: true, force: true }); }
});

test("stored events keep only known fields and responses carry security headers", async () => {
  const server = await start();
  try {
    const place = CITIES[0].places[0];
    const response = await post(server.base, "/api/v1/sync", { deviceId: "device-test-0004", events: [{ id: "evt-padded-start", type: "start", placeId: place.id, at: Date.now(), junk: "x".repeat(100000) }] });
    assert.equal((await response.json()).accepted.length, 1);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    const stored = JSON.parse(await (await import("node:fs/promises")).readFile(path.join(server.dir, "store.json"), "utf8"));
    const event = stored.devices["device-test-0004"].events[0];
    assert.equal(event.junk, undefined);
    assert.equal(event.placeId, place.id);
  } finally { await server.stop(); }
});

test("new devices per address are rate-limited", async () => {
  const server = await start();
  try {
    const statuses = [];
    for (let i = 0; i < 12; i++) statuses.push((await post(server.base, "/api/v1/sync", { deviceId: `device-flood-${String(i).padStart(4, "0")}`, events: [] })).status);
    assert.deepEqual(statuses.slice(0, 10), Array(10).fill(200));
    assert.deepEqual(statuses.slice(10), [429, 429]);
    // Devices that already exist keep syncing.
    assert.equal((await post(server.base, "/api/v1/sync", { deviceId: "device-flood-0000", events: [] })).status, 200);
  } finally { await server.stop(); }
});

test("redeeming a voucher works once and an empty code is refused", async () => {
  const server = await start();
  try {
    const admin = { "x-admin-key": "uzquest-dev-admin" };
    const city = CITIES[0];
    const events = [];
    let at = Date.now() - 3600000;
    for (const place of city.places) for (const quest of place.quests) {
      const event = { id: `evt-redeem-${quest.id}`.slice(0, 64), type: "quest", questId: quest.id, at: at++ };
      if (quest.type === "quiz") event.answer = quest.answer;
      if (quest.type === "riddle") event.text = quest.answers[0];
      if (quest.type === "meet") event.code = DEV_CODES[quest.id];
      if (quest.type === "timeline") event.order = quest.order;
      if (quest.type === "photo") event.hasPhoto = true;
      if (quest.type === "hunt") Object.assign(event, { lat: quest.lat, lng: quest.lng, accuracy: 5 });
      events.push(event);
    }
    events.push({ id: "evt-redeem-reward", type: "reward", cityId: city.id, at: at++ });
    const data = await (await post(server.base, "/api/v1/sync", { deviceId: "device-test-0005", events })).json();
    assert.deepEqual(data.rejected, []);
    const voucher = data.state.rewards[city.id].voucher;
    const first = await post(server.base, "/api/v1/admin/redeem", { voucher: voucher.toLowerCase() }, admin);
    assert.equal(first.status, 200);
    assert.equal((await first.json()).label, city.name.en);
    assert.equal((await post(server.base, "/api/v1/admin/redeem", { voucher }, admin)).status, 409);
    assert.equal((await post(server.base, "/api/v1/admin/redeem", { voucher: "  " }, admin)).status, 400);
  } finally { await server.stop(); }
});

const PROD_ENV = { NODE_ENV: "production", ADMIN_KEY: "a-real-secret-key" };
const meetEvent = (id, questId, code) => ({ id, type: "quest", questId, code, at: Date.now() });

test("a production server refuses to start without a secret word for every meet quest", async () => {
  const missing = await start({ ...PROD_ENV, MEET_CODES_FILE: "/nonexistent/meet-codes.json" });
  try {
    assert.equal(missing.exitCode, 1);
    assert.match(missing.output(), /Secret words for meet quests are missing/);
  } finally { await missing.stop(); }
  const dir = await mkdtemp(path.join(tmpdir(), "uzq-test-"));
  const file = path.join(dir, "meet-codes.json");
  await writeFile(file, JSON.stringify({ "tas-chorsu-meet": "only-one" }));
  const partial = await start({ ...PROD_ENV, MEET_CODES_FILE: file });
  try {
    assert.equal(partial.exitCode, 1);
    assert.match(partial.output(), /no secret word for: .*tas-plov-meet/);
  } finally { await partial.stop(); await rm(dir, { recursive: true, force: true }); }
});

test("the server checks its own secret words, not the public demo ones", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "uzq-test-"));
  const file = path.join(dir, "meet-codes.json");
  const words = Object.fromEntries(Object.keys(DEV_CODES).map((id) => [id, `${id}-word-42`]));
  await writeFile(file, JSON.stringify(words));
  const server = await start({ ...PROD_ENV, MEET_CODES_FILE: file });
  try {
    const questId = "tas-chorsu-meet";
    const check = async (code) => (await post(server.base, "/api/v1/meet/check", { questId, code })).json();
    assert.deepEqual(await check(DEV_CODES[questId]), { ok: false });
    assert.deepEqual(await check(words[questId].toUpperCase()), { ok: true });
    assert.equal((await post(server.base, "/api/v1/meet/check", { questId: "tas-chorsu-riddle", code: "x" })).status, 400);
    const sync = async (event) => (await post(server.base, "/api/v1/sync", { deviceId: "device-test-meet1", events: [event] })).json();
    assert.deepEqual((await sync(meetEvent("evt-meet-demo-word", questId, DEV_CODES[questId]))).rejected, [{ id: "evt-meet-demo-word", error: "WRONG_CODE" }]);
    assert.deepEqual((await sync(meetEvent("evt-meet-real-word", questId, words[questId]))).accepted, ["evt-meet-real-word"]);
  } finally { await server.stop(); await rm(dir, { recursive: true, force: true }); }
});

test("guessing secret words is limited per address, in the check endpoint and in sync", async () => {
  const server = await start();
  try {
    const questId = "tas-chorsu-meet";
    for (let i = 0; i < 10; i++) assert.deepEqual(await (await post(server.base, "/api/v1/meet/check", { questId, code: `guess-${i}` })).json(), { ok: false });
    const blocked = await post(server.base, "/api/v1/meet/check", { questId, code: DEV_CODES[questId] });
    assert.equal(blocked.status, 429, "even the right word is not judged once the budget is spent");
    // Sync does not judge meet events either; the phone keeps them and retries.
    const data = await (await post(server.base, "/api/v1/sync", { deviceId: "device-test-meet2", events: [meetEvent("evt-meet-blocked", questId, DEV_CODES[questId])] })).json();
    assert.deepEqual(data.rejected, [{ id: "evt-meet-blocked", error: "TRY_LATER" }]);
  } finally { await server.stop(); }
});
