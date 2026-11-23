import { mkdirSync, readFileSync, renameSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

// SQLite store, using Node's built-in driver so the server keeps no native dependencies.
// A sync reads and writes one traveller's rows instead of the whole data set. Calls are
// synchronous, so wrap every read-modify-write in transaction() to keep it atomic.
//
// devices: one row per phone, with the game state as JSON (the engine owns its shape).
// events:  every accepted event, so repeats are recognized and history can be replayed.
// codes:   an index of each device's voucher and coupon codes, for redemption.
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS devices (
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
  );
  CREATE INDEX IF NOT EXISTS codes_by_code ON codes(code);
`;

// City vouchers are keyed by city id, partner coupons by "coupon:<offer id>".
const codesOf = (state) => [
  ...Object.entries(state.rewards ?? {}).map(([cityId, reward]) => [cityId, reward.voucher]),
  ...Object.entries(state.coupons ?? {}).map(([offerId, coupon]) => [`coupon:${offerId}`, coupon.code])
];

const toDevice = (row) => row && {
  id: row.id, createdAt: row.created_at, lastSeenAt: row.last_seen_at, lang: row.lang,
  state: JSON.parse(row.state), redeemed: JSON.parse(row.redeemed)
};

export class SqliteStore {
  #db;
  #sql = {};

  constructor(file) {
    mkdirSync(path.dirname(file), { recursive: true });
    try {
      this.#db = new DatabaseSync(file);
      this.#db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
      this.#db.exec(SCHEMA);
    } catch (error) {
      // Fail at startup rather than answering every request with a 500.
      throw Error(`Database ${file} could not be opened (${error.message}). Restore it from a backup or move it away to start fresh.`);
    }
    const sql = (text) => this.#db.prepare(text);
    this.#sql = {
      device: sql("SELECT * FROM devices WHERE id = ?"),
      devices: sql("SELECT * FROM devices"),
      count: sql("SELECT COUNT(*) AS n FROM devices"),
      putDevice: sql(`INSERT INTO devices (id, created_at, last_seen_at, lang, state, redeemed) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET last_seen_at = excluded.last_seen_at, lang = excluded.lang, state = excluded.state, redeemed = excluded.redeemed`),
      eventIds: sql("SELECT id FROM events WHERE device_id = ?"),
      addEvent: sql("INSERT OR IGNORE INTO events (device_id, id, received_at, data) VALUES (?, ?, ?, ?)"),
      events: sql("SELECT data, received_at FROM events WHERE device_id = ? ORDER BY received_at, rowid"),
      clearEvents: sql("DELETE FROM events WHERE device_id = ?"),
      clearCodes: sql("DELETE FROM codes WHERE device_id = ?"),
      addCode: sql("INSERT OR REPLACE INTO codes (device_id, key, code) VALUES (?, ?, ?)"),
      owners: sql("SELECT device_id AS deviceId, key FROM codes WHERE code = ?")
    };
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

  device(id) { return toDevice(this.#sql.device.get(id)); }
  devices() { return this.#sql.devices.all().map(toDevice); }
  eventIds(deviceId) { return new Set(this.#sql.eventIds.all(deviceId).map((row) => row.id)); }
  events(deviceId) { return this.#sql.events.all(deviceId).map((row) => ({ ...JSON.parse(row.data), receivedAt: row.received_at })); }

  // Inserts or updates a device and refreshes its code index.
  putDevice(device) {
    this.#sql.putDevice.run(device.id, device.createdAt, device.lastSeenAt ?? null, device.lang, JSON.stringify(device.state), JSON.stringify(device.redeemed ?? {}));
    this.#sql.clearCodes.run(device.id);
    for (const [key, code] of codesOf(device.state)) if (code) this.#sql.addCode.run(device.id, key, code);
  }

  addEvent(deviceId, event, receivedAt) { this.#sql.addEvent.run(deviceId, event.id, receivedAt, JSON.stringify(event)); }

  // Forgets a device's history, before it starts over with a fresh state.
  clearDevice(deviceId) {
    this.#sql.clearEvents.run(deviceId);
    this.#sql.clearCodes.run(deviceId);
  }

  // Devices holding a voucher or coupon code: [{ deviceId, key }].
  owners(code) { return this.#sql.owners.all(code); }

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
