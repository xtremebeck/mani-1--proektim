import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { CITIES } from "../../public/shared/content.mjs";
import { DEV_CODES, post, start } from "./support/server.mjs";
import { fakeTelegram } from "./support/telegram.mjs";

const [hazratiImam, chorsu] = CITIES.find((city) => city.id === "tashkent").places;
const ALICE = { id: 1001, first_name: "Alice", username: "alice_uz", language_code: "en" };
const MALLORY = { id: 6666, first_name: "Mallory", language_code: "en" };
const admin = { "x-admin-key": "uzquest-dev-admin" };

// Valid completion events for every quest of a place.
function placeEvents(place, prefix) {
  return place.quests.map((quest, i) => {
    const event = { id: `${prefix}-${quest.id}`.slice(0, 64), type: "quest", questId: quest.id, at: Date.now() - 60000 + i };
    if (quest.type === "quiz") event.answer = quest.answer;
    if (quest.type === "riddle") event.text = quest.answers[0];
    if (quest.type === "meet") event.code = DEV_CODES[quest.id];
    if (quest.type === "timeline") event.order = quest.order;
    if (quest.type === "photo") event.hasPhoto = true;
    if (quest.type === "hunt") Object.assign(event, { lat: quest.lat, lng: quest.lng, accuracy: 5 });
    return event;
  });
}

async function withServer(env, fn) {
  const tg = await fakeTelegram();
  const server = await start({ TELEGRAM_BOT_TOKEN: "test-token", TELEGRAM_API_URL: tg.url, ...env });
  try {
    for (let i = 0; i < 50 && (await (await fetch(`${server.base}/api/v1/health`)).json()).telegram == null; i++) await new Promise((r) => setTimeout(r, 50));
    await fn(server, tg);
  } finally { await server.stop(); await tg.close(); }
}

const sync = (server, deviceId, events = [], session = null) => post(server.base, "/api/v1/sync", { deviceId, events }, session ? { Authorization: `Bearer ${session}` } : {});
const status = async (server, token) => (await post(server.base, "/api/v1/auth/telegram/status", { token })).json();

// The whole login: app asks for a link, the user taps Start and then Yes, the app polls.
async function login(server, tg, deviceId, user) {
  const { token } = await (await post(server.base, "/api/v1/auth/telegram/start", { deviceId })).json();
  const since = tg.calls.length;
  tg.say(user, `/start ${token}`);
  const ask = await tg.waitFor("sendMessage", (body) => body.reply_markup, since);
  tg.tap(user, ask.body.reply_markup.inline_keyboard[0][0].callback_data, ask.result);
  for (let i = 0; i < 100; i++) {
    const body = await status(server, token);
    if (body.status === "ok") return body;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw Error("login never completed");
}

test("health names the bot and a login starts with a t.me link", async () => {
  await withServer({}, async (server) => {
    assert.equal((await (await fetch(`${server.base}/api/v1/health`)).json()).telegram, "uzquest_test_bot");
    const body = await (await post(server.base, "/api/v1/auth/telegram/start", { deviceId: "device-acc-0001" })).json();
    assert.match(body.token, /^[A-Za-z0-9_-]{32}$/);
    assert.equal(body.url, `https://t.me/uzquest_test_bot?start=${body.token}`);
    assert.deepEqual(await status(server, body.token), { status: "pending" });
  });
});

test("without a bot token, Telegram login is off", async () => {
  const server = await start();
  try {
    assert.equal((await (await fetch(`${server.base}/api/v1/health`)).json()).telegram, null);
    assert.equal((await post(server.base, "/api/v1/auth/telegram/start", { deviceId: "device-acc-0002" })).status, 503);
  } finally { await server.stop(); }
});

test("logging in keeps the device's progress, and syncing then needs the session", async () => {
  await withServer({}, async (server, tg) => {
    const guest = await (await sync(server, "device-acc-0003", placeEvents(hazratiImam, "a"))).json();
    const result = await login(server, tg, "device-acc-0003", ALICE);
    assert.deepEqual(result.account, { name: "Alice", username: "alice_uz" });
    assert.equal(result.state.xp, guest.state.xp);
    assert.ok(result.state.places[hazratiImam.id]);
    assert.equal((await sync(server, "device-acc-0003")).status, 401, "a linked device cannot sync without its session");
    const synced = await sync(server, "device-acc-0003", [], result.session);
    assert.equal(synced.status, 200);
    assert.equal((await synced.json()).state.xp, guest.state.xp);
  });
});

test("a second phone's progress is merged into the account, and a repeated quest counts once", async () => {
  await withServer({}, async (server, tg) => {
    const phone = await (await sync(server, "device-acc-0004", placeEvents(hazratiImam, "p"))).json();
    const first = await login(server, tg, "device-acc-0004", ALICE);
    // The tablet played the same chapter and another one before logging in.
    await sync(server, "device-acc-0005", [...placeEvents(hazratiImam, "t"), ...placeEvents(chorsu, "t")]);
    const second = await login(server, tg, "device-acc-0005", ALICE);
    assert.ok(second.state.places[hazratiImam.id] && second.state.places[chorsu.id]);
    const chorsuOnly = await (await sync(server, "device-acc-0006", placeEvents(chorsu, "x"))).json();
    assert.equal(second.state.xp, phone.state.xp + chorsuOnly.state.xp, "the first chapter is counted once");
    // The coupon the phone already showed keeps its code.
    assert.deepEqual(second.state.coupons, { ...first.state.coupons, ...second.state.coupons });
    // The phone sees the tablet's progress on its next sync.
    const pulled = await (await sync(server, "device-acc-0004", [], first.session)).json();
    assert.equal(pulled.state.xp, second.state.xp);
  });
});

test("only the Telegram user who started a login can confirm it, in time, and No cancels it", async () => {
  await withServer({ TELEGRAM_LOGIN_TTL_MS: "1500" }, async (server, tg) => {
    const { token } = await (await post(server.base, "/api/v1/auth/telegram/start", { deviceId: "device-acc-0007" })).json();
    let since = tg.calls.length;
    tg.say(ALICE, `/start ${token}`);
    const ask = await tg.waitFor("sendMessage", (body) => body.reply_markup, since);
    assert.match(ask.body.text, /Never confirm a link someone sent you/);
    const [yes, no] = ask.body.reply_markup.inline_keyboard[0].map((button) => button.callback_data);
    since = tg.calls.length;
    tg.tap(MALLORY, yes, ask.result);
    await tg.waitFor("answerCallbackQuery", (body) => body.show_alert, since);
    assert.deepEqual(await status(server, token), { status: "pending" });
    tg.tap(ALICE, no, ask.result);
    await tg.waitFor("editMessageText", (body) => /cancelled/.test(body.text));
    assert.deepEqual(await status(server, token), { status: "cancelled" });
    // A link used after it expired is refused by the bot.
    const late = await (await post(server.base, "/api/v1/auth/telegram/start", { deviceId: "device-acc-0007" })).json();
    await new Promise((r) => setTimeout(r, 1700));
    since = tg.calls.length;
    tg.say(ALICE, `/start ${late.token}`);
    await tg.waitFor("sendMessage", (body) => /expired/.test(body.text), since);
    assert.deepEqual(await status(server, late.token), { status: "expired" });
  });
});

test("a session is handed out once, and logging out ends it", async () => {
  await withServer({}, async (server, tg) => {
    const { token } = await (await post(server.base, "/api/v1/auth/telegram/start", { deviceId: "device-acc-0008" })).json();
    tg.say(ALICE, `/start ${token}`);
    const ask = await tg.waitFor("sendMessage", (body) => body.reply_markup);
    tg.tap(ALICE, ask.body.reply_markup.inline_keyboard[0][0].callback_data, ask.result);
    let first;
    for (let i = 0; i < 100 && first?.status !== "ok"; i++) { first = await status(server, token); await new Promise((r) => setTimeout(r, 50)); }
    assert.equal(first.status, "ok");
    assert.deepEqual(await status(server, token), { status: "used" });
    assert.equal((await post(server.base, "/api/v1/auth/telegram/start", { deviceId: "device-acc-0008" })).status, 409, "already logged in");
    await post(server.base, "/api/v1/auth/logout", {}, { Authorization: `Bearer ${first.session}` });
    assert.equal((await sync(server, "device-acc-0008", [], first.session)).status, 401);
  });
});

test("an account's coupons are redeemed like a device's, and the dashboard counts accounts", async () => {
  await withServer({}, async (server, tg) => {
    await sync(server, "device-acc-0009", placeEvents(chorsu, "c"));
    const result = await login(server, tg, "device-acc-0009", ALICE);
    const code = result.state.coupons["tas-bakery"].code;
    assert.equal((await post(server.base, "/api/v1/admin/redeem", { voucher: code }, admin)).status, 200);
    assert.equal((await post(server.base, "/api/v1/admin/redeem", { voucher: code }, admin)).status, 409);
    const overview = await (await fetch(`${server.base}/api/v1/admin/overview`, { headers: admin })).json();
    assert.equal(overview.metrics.accounts, 1);
    assert.ok(overview.recent.some((row) => /^acct-\d+$/.test(row.id)));
    assert.doesNotMatch(JSON.stringify(overview), /alice/i, "partners do not see Telegram names");
  });
});

test("a database from before accounts is migrated and its codes still redeem", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "uzq-test-"));
  const file = path.join(dir, "uzquest.db");
  // The schema the server created before this change (user_version 0).
  const db = new DatabaseSync(file);
  db.exec(`CREATE TABLE devices (id TEXT PRIMARY KEY, created_at INTEGER NOT NULL, last_seen_at INTEGER, lang TEXT NOT NULL, state TEXT NOT NULL, redeemed TEXT NOT NULL DEFAULT '{}');
    CREATE TABLE events (device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE, id TEXT NOT NULL, received_at INTEGER NOT NULL, data TEXT NOT NULL, PRIMARY KEY (device_id, id));
    CREATE TABLE codes (device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE, key TEXT NOT NULL, code TEXT NOT NULL, PRIMARY KEY (device_id, key));`);
  const state = { v: 3, xp: 1, started: {}, quests: {}, places: {}, dailies: {}, detox: {}, rewards: { tashkent: { at: 1, voucher: "UZQ-TAS-OLD001" } }, coupons: {} };
  db.prepare("INSERT INTO devices VALUES ('device-old-0001', 1, 2, 'en', ?, '{}')").run(JSON.stringify(state));
  db.prepare("INSERT INTO codes VALUES ('device-old-0001', 'tashkent', 'UZQ-TAS-OLD001')").run();
  db.close();
  const server = await start({ DATABASE_FILE: file });
  try {
    assert.equal(server.exitCode, null, server.output());
    assert.equal((await post(server.base, "/api/v1/admin/redeem", { voucher: "UZQ-TAS-OLD001" }, admin)).status, 200);
    const check = new DatabaseSync(file, { readOnly: true });
    assert.equal(check.prepare("PRAGMA user_version").get().user_version, 2);
    check.close();
  } finally { await server.stop(); await rm(dir, { recursive: true, force: true }); }
});

test("deleting an account removes everything kept about it, and only it", async () => {
  const BOB = { id: 3003, first_name: "Bob", language_code: "en" };
  await withServer({}, async (server, tg) => {
    await sync(server, "device-del-0001", placeEvents(chorsu, "d1"));
    const alice = await login(server, tg, "device-del-0001", ALICE);
    await sync(server, "device-del-0002", placeEvents(hazratiImam, "d2"));
    await login(server, tg, "device-del-0002", ALICE);
    await sync(server, "device-del-0003", placeEvents(chorsu, "d3"));
    const bob = await login(server, tg, "device-del-0003", BOB);
    const aliceCode = alice.state.coupons["tas-bakery"].code;

    assert.equal((await post(server.base, "/api/v1/auth/delete", {})).status, 401, "a session is required");
    const deleted = await post(server.base, "/api/v1/auth/delete", {}, { Authorization: `Bearer ${alice.session}` });
    assert.equal(deleted.status, 200);
    assert.deepEqual(await deleted.json(), { deleted: true, devices: 2 });

    const db = new DatabaseSync(server.dbFile, { readOnly: true });
    const count = (sql, ...args) => db.prepare(sql).get(...args).n;
    try {
      assert.equal(count("SELECT COUNT(*) AS n FROM accounts WHERE telegram_id = ?", ALICE.id), 0);
      assert.equal(count("SELECT COUNT(*) AS n FROM devices WHERE id IN ('device-del-0001', 'device-del-0002')"), 0);
      assert.equal(count("SELECT COUNT(*) AS n FROM events WHERE device_id IN ('device-del-0001', 'device-del-0002')"), 0);
      assert.equal(count("SELECT COUNT(*) AS n FROM logins WHERE device_id IN ('device-del-0001', 'device-del-0002')"), 0);
      assert.equal(count("SELECT COUNT(*) AS n FROM codes WHERE code = ?", aliceCode), 0);
      assert.equal(count("SELECT COUNT(*) AS n FROM sessions"), 1, "only Bob's session is left");
      assert.equal(count("SELECT COUNT(*) AS n FROM devices WHERE id = 'device-del-0003'"), 1, "Bob is untouched");
    } finally { db.close(); }

    assert.equal((await post(server.base, "/api/v1/admin/redeem", { voucher: aliceCode }, admin)).status, 404);
    assert.equal((await sync(server, "device-del-0002", [], alice.session)).status, 401, "the other phone hears that its session ended");
    assert.equal((await (await sync(server, "device-del-0001")).json()).state.xp, 0, "a deleted phone id starts over as a guest");
    assert.equal((await sync(server, "device-del-0003", [], bob.session)).status, 200);
    // Logging in again makes a new, empty account.
    const again = await login(server, tg, "device-del-0004", ALICE);
    assert.equal(again.state.xp, 0);
  });
});
