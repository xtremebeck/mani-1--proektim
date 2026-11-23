import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serverFile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../src/server.mjs");
let nextPort = 4300 + Math.floor(Math.random() * 500);

// The public demo secret words. A production server needs its own file (MEET_CODES_FILE).
export const DEV_CODES_FILE = path.resolve(path.dirname(serverFile), "../meet-codes.dev.json");
export const DEV_CODES = JSON.parse(readFileSync(DEV_CODES_FILE, "utf8"));

// Starts a server on a fresh data file. Resolves once it listens, or with the exit code if it quits.
export async function start(env = {}) {
  const dir = await mkdtemp(path.join(tmpdir(), "uzq-test-"));
  const port = nextPort++;
  const dataFile = env.DATA_FILE ?? path.join(dir, "store.json");
  const child = spawn(process.execPath, [serverFile], {
    env: { PATH: process.env.PATH, PORT: String(port), DATA_FILE: dataFile, ...env },
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
    base, dir, dataFile, child, exitCode, output: () => output,
    alive: () => child.exitCode === null,
    async stop() { child.kill(); await rm(dir, { recursive: true, force: true }); }
  };
}

export const post = (base, route, body, headers = {}) => fetch(`${base}${route}`, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) });
