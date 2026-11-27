import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

// SQLite store, using Node's built-in driver so the server keeps no native dependencies.
// A sync reads and writes one traveller's rows instead of the whole data set. Calls are
// synchronous, so wrap every read-modify-write in transaction() to keep it atomic.
//
// Progress has one owner: a device that is not logged in, or the Telegram account a device
// is linked to. Owners are written "d:<device id>" or "a:<account id>" in the codes index.
//
// devices:  one row per phone; its own game state (JSON) until it is linked to an account.
// accounts: one row per Telegram user; the game state merged from all its devices.
// events:   every accepted event, per device, so repeats are recognized and history can be replayed.
// codes:    an index of each owner's voucher and coupon codes, for redemption.
// logins:   pending "log in with Telegram" requests. sessions: logged-in devices.
// Tokens are only stored as SHA-256 hashes.
//
// Each migration runs once, in order; PRAGMA user_version records how many have run.
const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS devices (
     id TEXT PRIMARY KEY,
     created_at INTEGER NOT NULL,
     last_seen_at INTEGER,
     lang TEXT NOT NULL,
     state TEXT NOT NULL,
     redeemed TEXT NOT NULL DEFAULT '{}'
   );
   CREATE TABLE IF NOT EXISTS events (
     device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
     id TEXT NOT NULL,
     received_at INTEGER NOT NULL,
     data TEXT NOT NULL,
     PRIMARY KEY (device_id, id)
   );
   CREATE TABLE IF NOT EXISTS codes (
     device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
     key TEXT NOT NULL,
     code TEXT NOT NULL,
     PRIMARY KEY (device_id, key)
   );`,
  // Telegram accounts. The codes index moves from devices to owners and is rebuilt below.
  `CREATE TABLE accounts (
     id INTEGER PRIMARY KEY,
     telegram_id INTEGER NOT NULL UNIQUE,
     name TEXT,
     username TEXT,
     created_at INTEGER NOT NULL,
     state TEXT NOT NULL,
     redeemed TEXT NOT NULL DEFAULT '{}'
   );
   ALTER TABLE devices ADD COLUMN account_id INTEGER REFERENCES accounts(id);
   CREATE INDEX devices_by_account ON devices(account_id);
   DROP TABLE codes;
   CREATE TABLE codes (
     owner TEXT NOT NULL,
     key TEXT NOT NULL,
     code TEXT NOT NULL,
     PRIMARY KEY (owner, key)
   );
   CREATE INDEX codes_by_code ON codes(code);
   CREATE TABLE logins (
     id INTEGER PRIMARY KEY,
     token_hash TEXT NOT NULL UNIQUE,
     device_id TEXT NOT NULL,
     created_at INTEGER NOT NULL,
     expires_at INTEGER NOT NULL,
     status TEXT NOT NULL,
     telegram_id INTEGER,
     name TEXT,
     username TEXT
   );
   CREATE TABLE sessions (
     token_hash TEXT PRIMARY KEY,
     account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
     device_id TEXT NOT NULL,
     created_at INTEGER NOT NULL
   );`
];

export const hashToken = (token) => createHash("sha256").update(String(token)).digest("hex");

// City vouchers are keyed by city id, partner coupons by "coupon:<offer id>".
const codesOf = (state) => [
  ...Object.entries(state?.rewards ?? {}).map(([cityId, reward]) => [cityId, reward.voucher]),
  ...Object.entries(state?.coupons ?? {}).map(([offerId, coupon]) => [`coupon:${offerId}`, coupon.code])
];

const toDevice = (row) => row && {
  id: row.id, accountId: row.account_id ?? null, createdAt: row.created_at, lastSeenAt: row.last_seen_at, lang: row.lang,
  state: JSON.parse(row.state), redeemed: JSON.parse(row.redeemed)
};
const toAccount = (row) => row && {
  id: row.id, telegramId: row.telegram_id, name: row.name, username: row.username, createdAt: row.created_at,
  state: JSON.parse(row.state), redeemed: JSON.parse(row.redeemed)
};
const toLogin = (row) => row && {
  id: row.id, deviceId: row.device_id, createdAt: row.created_at, expiresAt: row.expires_at, status: row.status,
  telegramId: row.telegram_id, name: row.name, username: row.username
};

export class SqliteStore {
  #db;
  #sql = {};

  constructor(file) {
    mkdirSync(path.dirname(file), { recursive: true });
    try {
      this.#db = new DatabaseSync(file);
      this.#db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
      this.#migrate();
    } catch (error) {
      // Fail at startup rather than answering every request with a 500.
      throw Error(`Database ${file} could not be opened (${error.message}). Restore it from a backup or move it away to start fresh.`);
    }
    const sql = (text) => this.#db.prepare(text);
    this.#sql = {
      device: sql("SELECT * FROM devices WHERE id = ?"),
      devices: sql("SELECT * FROM devices"),
      devicesOf: sql("SELECT * FROM devices WHERE account_id = ?"),
      count: sql("SELECT COUNT(*) AS n FROM devices"),
      putDevice: sql(`INSERT INTO devices (id, account_id, created_at, last_seen_at, lang, state, redeemed) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET account_id = excluded.account_id, last_seen_at = excluded.last_seen_at, lang = excluded.lang, state = excluded.state, redeemed = excluded.redeemed`),
      account: sql("SELECT * FROM accounts WHERE id = ?"),
      accountByTelegram: sql("SELECT * FROM accounts WHERE telegram_id = ?"),
      accounts: sql("SELECT * FROM accounts"),
      insertAccount: sql("INSERT INTO accounts (telegram_id, name, username, created_at, state, redeemed) VALUES (?, ?, ?, ?, ?, ?)"),
      updateAccount: sql("UPDATE accounts SET name = ?, username = ?, state = ?, redeemed = ? WHERE id = ?"),
      eventIds: sql("SELECT id FROM events WHERE device_id = ?"),
      addEvent: sql("INSERT OR IGNORE INTO events (device_id, id, received_at, data) VALUES (?, ?, ?, ?)"),
      events: sql("SELECT data, received_at FROM events WHERE device_id = ? ORDER BY received_at, rowid"),
      clearEvents: sql("DELETE FROM events WHERE device_id = ?"),
      clearCodes: sql("DELETE FROM codes WHERE owner = ?"),
      addCode: sql("INSERT OR REPLACE INTO codes (owner, key, code) VALUES (?, ?, ?)"),
      owners: sql("SELECT owner, key FROM codes WHERE code = ?"),
      addLogin: sql("INSERT INTO logins (token_hash, device_id, created_at, expires_at, status) VALUES (?, ?, ?, ?, 'pending')"),
      loginByHash: sql("SELECT * FROM logins WHERE token_hash = ?"),
      loginById: sql("SELECT * FROM logins WHERE id = ?"),
      updateLogin: sql("UPDATE logins SET status = ?, telegram_id = ?, name = ?, username = ? WHERE id = ?"),
      dropOldLogins: sql("DELETE FROM logins WHERE expires_at < ?"),
      addSession: sql("INSERT INTO sessions (token_hash, account_id, device_id, created_at) VALUES (?, ?, ?, ?)"),
      session: sql("SELECT account_id AS accountId, device_id AS deviceId FROM sessions WHERE token_hash = ?"),
      dropSession: sql("DELETE FROM sessions WHERE token_hash = ?"),
      dropSessions: sql("DELETE FROM sessions WHERE account_id = ?"),
      dropLogins: sql("DELETE FROM logins WHERE device_id = ?"),
      dropDevice: sql("DELETE FROM devices WHERE id = ?"),
      dropAccount: sql("DELETE FROM accounts WHERE id = ?")
    };
  }

  #migrate() {
    const done = this.#db.prepare("PRAGMA user_version").get().user_version;
    for (let version = done; version < MIGRATIONS.length; version++) {
      this.transaction(() => {
        this.#db.exec(MIGRATIONS[version]);
        if (version === 1) this.#reindexDevices();
        this.#db.exec(`PRAGMA user_version = ${version + 1}`);
      });
    }
  }

  // After migration 2 the codes index is empty; refill it from the devices that hold codes.
  #reindexDevices() {
    const add = this.#db.prepare("INSERT OR REPLACE INTO codes (owner, key, code) VALUES (?, ?, ?)");
    for (const row of this.#db.prepare("SELECT id, state FROM devices").all()) {
      for (const [key, code] of codesOf(JSON.parse(row.state))) if (code) add.run(`d:${row.id}`, key, code);
    }
  }

  // Writes a consistent copy of the whole database to file, safe while the server is writing.
  // The file must not exist yet.
  backup(file) { this.#db.prepare("VACUUM INTO ?").run(file); }

  // Rewrites stored events that mention a location: fn(event) returns the new event, or null to
  // leave it as it is.
  rewriteLocatedEvents(fn) {
    const update = this.#db.prepare("UPDATE events SET data = ? WHERE rowid = ?");
    let changed = 0;
    this.transaction(() => {
      for (const row of this.#db.prepare(`SELECT rowid, data FROM events WHERE data LIKE '%"lat"%'`).all()) {
        const next = fn(JSON.parse(row.data));
        if (next) { update.run(JSON.stringify(next), row.rowid); changed++; }
      }
    });
    return changed;
  }

  // Runs fn inside one transaction; any throw rolls everything back.
  transaction(fn) {
    this.#db.exec("BEGIN IMMEDIATE");
    try {
      const result = fn();
      this.#db.exec("COMMIT");
      return result;
    } catch (error) {
      this.#db.exec("ROLLBACK");
      throw error;
    }
  }

  #index(owner, state) {
    this.#sql.clearCodes.run(owner);
    for (const [key, code] of codesOf(state)) if (code) this.#sql.addCode.run(owner, key, code);
  }

  // ---------- devices ----------
  device(id) { return toDevice(this.#sql.device.get(id)); }
  devices() { return this.#sql.devices.all().map(toDevice); }
  devicesOf(accountId) { return this.#sql.devicesOf.all(accountId).map(toDevice); }
  eventIds(deviceId) { return new Set(this.#sql.eventIds.all(deviceId).map((row) => row.id)); }
  events(deviceId) { return this.#sql.events.all(deviceId).map((row) => ({ ...JSON.parse(row.data), receivedAt: row.received_at })); }

  // Inserts or updates a device. Only a device that is not linked owns its codes.
  putDevice(device) {
    this.#sql.putDevice.run(device.id, device.accountId ?? null, device.createdAt, device.lastSeenAt ?? null, device.lang, JSON.stringify(device.state), JSON.stringify(device.redeemed ?? {}));
    this.#index(`d:${device.id}`, device.accountId ? null : device.state);
  }

  addEvent(deviceId, event, receivedAt) { this.#sql.addEvent.run(deviceId, event.id, receivedAt, JSON.stringify(event)); }

  // Forgets a device's history, before it starts over with a fresh state.
  clearDevice(deviceId) {
    this.#sql.clearEvents.run(deviceId);
    this.#sql.clearCodes.run(`d:${deviceId}`);
  }

  // ---------- accounts ----------
  account(id) { return toAccount(this.#sql.account.get(id)); }
  accountByTelegram(telegramId) { return toAccount(this.#sql.accountByTelegram.get(telegramId)); }
  accounts() { return this.#sql.accounts.all().map(toAccount); }

  // Inserts (when it has no id yet) or updates an account and its codes. Returns its id.
  putAccount(account) {
    const state = JSON.stringify(account.state), redeemed = JSON.stringify(account.redeemed ?? {});
    if (account.id == null) account.id = Number(this.#sql.insertAccount.run(account.telegramId, account.name ?? null, account.username ?? null, account.createdAt, state, redeemed).lastInsertRowid);
    else this.#sql.updateAccount.run(account.name ?? null, account.username ?? null, state, redeemed, account.id);
    this.#index(`a:${account.id}`, account.state);
    return account.id;
  }

  // Owners of a voucher or coupon code: [{ owner: "d:<id>" | "a:<id>", key }].
  owners(code) { return this.#sql.owners.all(code); }

  // ---------- Telegram logins and sessions ----------
  addLogin(token, deviceId, now, ttlMs) {
    this.#sql.dropOldLogins.run(now - 24 * 3600 * 1000);
    this.#sql.addLogin.run(hashToken(token), deviceId, now, now + ttlMs);
  }
  loginByToken(token) { return toLogin(this.#sql.loginByHash.get(hashToken(token))); }
  loginById(id) { return toLogin(this.#sql.loginById.get(id)); }
  updateLogin(login) { this.#sql.updateLogin.run(login.status, login.telegramId ?? null, login.name ?? null, login.username ?? null, login.id); }

  addSession(token, accountId, deviceId, now) { this.#sql.addSession.run(hashToken(token), accountId, deviceId, now); }
  session(token) { return token ? this.#sql.session.get(hashToken(token)) ?? null : null; }
  dropSession(token) { this.#sql.dropSession.run(hashToken(token)); }

  // Deletes an account and everything kept about it: its devices with their events, their codes,
  // sessions and login attempts. Call inside transaction(). Returns how many devices went with it.
  deleteAccount(accountId) {
    const devices = this.devicesOf(accountId);
    for (const device of devices) {
      this.#sql.clearEvents.run(device.id);
      this.#sql.clearCodes.run(`d:${device.id}`);
      this.#sql.dropLogins.run(device.id);
      this.#sql.dropDevice.run(device.id);
    }
    this.#sql.clearCodes.run(`a:${accountId}`);
    this.#sql.dropSessions.run(accountId);
    this.#sql.dropAccount.run(accountId);
    return devices.length;
  }

  // One-time import of the old JSON store (data/store.json), only into an empty database.
  // The file is kept, renamed to <file>.imported, never deleted. Returns the number of devices.
  importJson(file) {
    let raw;
    try { raw = readFileSync(file, "utf8"); } catch (error) { if (error.code === "ENOENT") return 0; throw error; }
    if (this.#sql.count.get().n > 0) throw Error(`${file} was not imported because the database already has data. Move the file away once you have checked it.`);
    let data;
    try { data = JSON.parse(raw); } catch { throw Error(`${file} is not valid JSON. Restore it from a backup or move it away to start fresh.`); }
    const devices = Object.entries(data.devices ?? {});
    this.transaction(() => {
      for (const [id, d] of devices) {
        this.putDevice({ id, createdAt: d.createdAt ?? Date.now(), lastSeenAt: d.lastSeenAt, lang: d.lang ?? "en", state: d.state, redeemed: d.redeemed });
        for (const { receivedAt, ...event } of d.events ?? []) this.addEvent(id, event, receivedAt ?? d.lastSeenAt ?? Date.now());
      }
    });
    renameSync(file, `${file}.imported`);
    return devices.length;
  }
}
