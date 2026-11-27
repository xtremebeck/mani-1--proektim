import test from "node:test";
import assert from "node:assert/strict";
import { access, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { CITIES } from "../../public/shared/content.mjs";
import { dailyFor, dayKey } from "../../public/shared/engine.mjs";
import { DEV_CODES, DEV_CODES_FILE, post, readDevice, start } from "./support/server.mjs";

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

test("a corrupt database or old data file stops startup with a clear message", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "uzq-test-"));
  try {
    const json = path.join(dir, "store.json");
    await writeFile(json, "{broken");
    const badJson = await start({ DATA_FILE: json });
    assert.equal(badJson.exitCode, 1);
    assert.match(badJson.output(), /not valid JSON/);
    await badJson.stop();
    const db = path.join(dir, "garbage.db");
    await writeFile(db, "this is not a database ".repeat(200));
    const badDb = await start({ DATABASE_FILE: db });
    assert.equal(badDb.exitCode, 1);
    assert.match(badDb.output(), /could not be opened/);
    await badDb.stop();
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("stored events keep only known fields and responses carry security headers", async () => {
  const server = await start();
  try {
    const place = CITIES[0].places[0];
    const response = await post(server.base, "/api/v1/sync", { deviceId: "device-test-0004", events: [{ id: "evt-padded-start", type: "start", placeId: place.id, at: Date.now(), junk: "x".repeat(100000) }] });
    assert.equal((await response.json()).accepted.length, 1);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    const event = readDevice(server.dbFile, "device-test-0004").events[0];
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

// A device as the old JSON store kept it, with a city voucher and an unredeemed coupon.
function legacyDevice(voucher, couponCode) {
  return {
    createdAt: 1, lastSeenAt: 2, lang: "uz",
    events: [{ id: "evt-legacy-start", type: "start", placeId: CITIES[0].places[0].id, at: 1, receivedAt: 2 }],
    state: { v: 3, xp: 900, started: {}, quests: {}, places: {}, dailies: {}, detox: {},
      rewards: { tashkent: { at: 1, voucher } },
      coupons: { "tas-bakery": { at: 1, expiresAt: Date.now() + 86400000, code: couponCode } } }
  };
}

test("the old JSON store is imported once, kept on disk, and survives a restart", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "uzq-test-"));
  const json = path.join(dir, "store.json"), db = path.join(dir, "uzquest.db");
  await writeFile(json, JSON.stringify({ devices: { "device-legacy-01": legacyDevice("UZQ-TAS-LEG001", "UZQ-LEG001") } }));
  const env = { DATA_FILE: json, DATABASE_FILE: db };
  try {
    const first = await start(env);
    assert.equal(first.exitCode, null, first.output());
    await access(`${json}.imported`);
    await assert.rejects(access(json), "the original file is renamed, so it is not imported twice");
    const admin = { "x-admin-key": "uzquest-dev-admin" };
    assert.equal((await post(first.base, "/api/v1/admin/redeem", { voucher: "uzq-leg001" }, admin)).status, 200);
    await first.stop();
    const second = await start(env);
    try {
      const device = readDevice(db, "device-legacy-01");
      assert.equal(device.state.xp, 900);
      assert.equal(device.events[0].id, "evt-legacy-start");
      assert.ok(device.redeemed["coupon:tas-bakery"], "the redemption from before the restart is still there");
      assert.equal((await post(second.base, "/api/v1/admin/redeem", { voucher: "UZQ-LEG001" }, admin)).status, 409);
      assert.equal((await post(second.base, "/api/v1/admin/redeem", { voucher: "UZQ-TAS-LEG001" }, admin)).status, 200);
    } finally { await second.stop(); }
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("an old JSON store is not imported into a database that already has data", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "uzq-test-"));
  const json = path.join(dir, "store.json"), db = path.join(dir, "uzquest.db");
  try {
    const fresh = await start({ DATABASE_FILE: db });
    await post(fresh.base, "/api/v1/sync", { deviceId: "device-test-0006", events: [] });
    await fresh.stop();
    await writeFile(json, JSON.stringify({ devices: { "device-legacy-02": legacyDevice("UZQ-TAS-LEG002", "UZQ-LEG002") } }));
    const server = await start({ DATA_FILE: json, DATABASE_FILE: db });
    assert.equal(server.exitCode, 1);
    assert.match(server.output(), /not imported because the database already has data/);
    assert.match(await readFile(json, "utf8"), /device-legacy-02/, "the file is left untouched");
    await server.stop();
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("a code held by two travellers is refused instead of guessed", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "uzq-test-"));
  const json = path.join(dir, "store.json");
  await writeFile(json, JSON.stringify({ devices: {
    "device-legacy-03": legacyDevice("UZQ-TAS-SAME01", "UZQ-ONE001"),
    "device-legacy-04": legacyDevice("UZQ-TAS-SAME01", "UZQ-TWO002")
  } }));
  const server = await start({ DATA_FILE: json });
  try {
    const admin = { "x-admin-key": "uzquest-dev-admin" };
    assert.equal((await post(server.base, "/api/v1/admin/redeem", { voucher: "UZQ-TAS-SAME01" }, admin)).status, 409);
    assert.equal((await post(server.base, "/api/v1/admin/redeem", { voucher: "UZQ-TWO002" }, admin)).status, 200);
  } finally { await server.stop(); await rm(dir, { recursive: true, force: true }); }
});

test("static files are compressed when accepted and revalidated with ETag", async () => {
  const server = await start();
  try {
    const url = `${server.base}/shared/content.mjs`;
    const plain = await fetch(url, { headers: { "Accept-Encoding": "identity" } });
    const raw = Buffer.from(await plain.arrayBuffer());
    assert.equal(plain.headers.get("content-encoding"), null);
    for (const encoding of ["br", "gzip"]) {
      // Node's fetch decodes the body itself, so compare what it decodes with the plain file.
      const packed = await fetch(url, { headers: { "Accept-Encoding": encoding } });
      assert.equal(packed.headers.get("content-encoding"), encoding);
      assert.equal(packed.headers.get("vary"), "Accept-Encoding");
      assert.ok(Buffer.from(await packed.arrayBuffer()).equals(raw), `${encoding} decodes to the same bytes`);
    }
    const etag = plain.headers.get("etag");
    assert.match(etag, /^W\/"/);
    const again = await fetch(url, { headers: { "If-None-Match": etag } });
    assert.equal(again.status, 304);
    assert.equal((await again.arrayBuffer()).byteLength, 0);
    // Tiny files are not worth compressing.
    assert.equal((await fetch(`${server.base}/assets/app-icon.svg`, { headers: { "Accept-Encoding": "gzip" } })).headers.get("content-encoding"), null);
  } finally { await server.stop(); }
});

test("secret words can come from the MEET_CODES variable", async () => {
  const words = Object.fromEntries(Object.keys(DEV_CODES).map((id) => [id, `${id}-from-env`]));
  const server = await start({ ...PROD_ENV, MEET_CODES: JSON.stringify(words) });
  try {
    assert.equal(server.exitCode, null, server.output());
    const check = async (code) => (await post(server.base, "/api/v1/meet/check", { questId: "tas-chorsu-meet", code })).json();
    assert.deepEqual(await check(words["tas-chorsu-meet"]), { ok: true });
    assert.deepEqual(await check(DEV_CODES["tas-chorsu-meet"]), { ok: false });
  } finally { await server.stop(); }
  const broken = await start({ ...PROD_ENV, MEET_CODES: "{not json" });
  try {
    assert.equal(broken.exitCode, 1);
    assert.match(broken.output(), /MEET_CODES variable is not valid JSON/);
  } finally { await broken.stop(); }
});

test("behind a trusted proxy, each client gets its own rate limit", async () => {
  // The admin login limit allows 10 failures a minute per address.
  const fail = (server, ip) => fetch(`${server.base}/api/v1/admin/overview`, { headers: { "x-admin-key": "wrong", "X-Forwarded-For": ip } });
  const proxied = await start({ TRUST_PROXY: "1" });
  try {
    for (let i = 0; i < 10; i++) await fail(proxied, "198.51.100.1");
    assert.equal((await fail(proxied, "198.51.100.1")).status, 429);
    assert.equal((await fail(proxied, "198.51.100.2")).status, 401, "another traveller is not blocked");
    // A client cannot dodge its limit by adding its own entries in front.
    assert.equal((await fail(proxied, "10.9.9.9, 198.51.100.1")).status, 429);
  } finally { await proxied.stop(); }
  const direct = await start();
  try {
    for (let i = 0; i < 10; i++) await fail(direct, `203.0.113.${i}`);
    assert.equal((await fail(direct, "203.0.113.99")).status, 429, "without TRUST_PROXY the header is ignored");
  } finally { await direct.stop(); }
});

test("the admin can download a full backup, and the server keeps daily copies", async () => {
  const server = await start({ BACKUP_KEEP: "2" });
  try {
    assert.equal(server.exitCode, null, server.output());
    const deviceId = "device-backup-test-01";
    assert.equal((await post(server.base, "/api/v1/sync", { deviceId, events: [] })).status, 200);
    assert.equal((await fetch(`${server.base}/api/v1/admin/backup`)).status, 401);
    const response = await fetch(`${server.base}/api/v1/admin/backup`, { headers: { "x-admin-key": "uzquest-dev-admin" } });
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-disposition"), /attachment; filename="uzquest-[\d-]+\.db"/);
    const copy = path.join(server.dir, "downloaded.db");
    await writeFile(copy, Buffer.from(await response.arrayBuffer()));
    assert.ok(readDevice(copy, deviceId), "the download holds the traveller");
    const backups = path.join(server.dir, "backups");
    const files = await readdir(backups);
    assert.deepEqual(files, [`uzquest-${new Date().toISOString().slice(0, 10)}.db`], "only today's copy; the download's temp file is gone");
  } finally { await server.stop(); }
});

test("daily copies beyond BACKUP_KEEP are removed", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "uzq-backups-"));
  try {
    for (const day of ["2020-01-01", "2020-01-02", "2020-01-03"]) await writeFile(path.join(dir, `uzquest-${day}.db`), "old");
    await writeFile(path.join(dir, "notes.txt"), "kept");
    const server = await start({ BACKUP_DIR: dir, BACKUP_KEEP: "2" });
    try {
      for (let i = 0; i < 50 && (await readdir(dir)).length !== 3; i++) await new Promise((r) => setTimeout(r, 20));
      assert.deepEqual((await readdir(dir)).sort(), ["notes.txt", "uzquest-2020-01-03.db", `uzquest-${new Date().toISOString().slice(0, 10)}.db`]);
    } finally { await server.stop(); }
  } finally { await rm(dir, { recursive: true, force: true }); }
});
