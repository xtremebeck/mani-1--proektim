import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serverFile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../src/server.mjs");
let nextPort = 4300 + Math.floor(Math.random() * 500);

// The public demo secret words. A production server needs its own file (MEET_CODES_FILE).
export const DEV_CODES_FILE = path.resolve(path.dirname(serverFile), "../meet-codes.dev.json");
export const DEV_CODES = JSON.parse(readFileSync(DEV_CODES_FILE, "utf8"));

// Starts a server on a fresh database. Resolves once it listens, or with the exit code if it quits.
// DATA_FILE (the old JSON store to import) and MEET_CODES_FILE also point into the temp dir, so a
// test never picks up the repository's own data/store.json or data/meet-codes.json.
export async function start(env = {}) {
  const dir = await mkdtemp(path.join(tmpdir(), "uzq-test-"));
  const port = nextPort++;
  const dbFile = env.DATABASE_FILE ?? path.join(dir, "uzquest.db");
  const child = spawn(process.execPath, [serverFile], {
    env: { PATH: process.env.PATH, PORT: String(port), DATABASE_FILE: dbFile, DATA_FILE: path.join(dir, "store.json"), MEET_CODES_FILE: path.join(dir, "meet-codes.json"), ...env },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let output = "";
  child.stderr.on("data", (chunk) => { output += chunk; });
  const exitCode = await new Promise((resolve) => {
    child.stdout.on("data", (chunk) => { if (String(chunk).includes("UzQuest:")) resolve(null); });
    child.on("exit", (code) => resolve(code));
  });
  const base = `http://127.0.0.1:${port}`;
  return {
    base, dir, dbFile, child, exitCode, output: () => output,
    alive: () => child.exitCode === null,
    async stop() { child.kill(); await rm(dir, { recursive: true, force: true }); }
  };
}

// Reads one device straight from a server's database: { state, redeemed, events } or null.
export function readDevice(dbFile, deviceId) {
  const db = new DatabaseSync(dbFile, { readOnly: true });
  try {
    const row = db.prepare("SELECT state, redeemed FROM devices WHERE id = ?").get(deviceId);
    if (!row) return null;
    const events = db.prepare("SELECT data FROM events WHERE device_id = ? ORDER BY received_at, rowid").all(deviceId).map((e) => JSON.parse(e.data));
    return { state: JSON.parse(row.state), redeemed: JSON.parse(row.redeemed), events };
  } finally { db.close(); }
}

export const post = (base, route, body, headers = {}) => fetch(`${base}${route}`, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) });
