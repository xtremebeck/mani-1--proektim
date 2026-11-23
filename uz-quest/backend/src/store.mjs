import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

// Tiny JSON-file store with serialized writes. Good enough for a pilot;
// swap for Postgres/SQLite before real traffic.
export class JsonStore {
  #file;
  #queue = Promise.resolve();

  constructor(file) { this.#file = file; }

  async initialize() {
    await mkdir(path.dirname(this.#file), { recursive: true });
    let raw;
    try { raw = await readFile(this.#file, "utf8"); } catch (error) {
      if (error.code !== "ENOENT") throw error;
      return this.#write({ devices: {} });
    }
    // Fail at startup rather than answering every request with a 500.
    try { JSON.parse(raw); } catch { throw Error(`Data file ${this.#file} is not valid JSON. Restore it from a backup or move it away to start fresh.`); }
  }

  snapshot() { return this.#read(); }

  mutate(operation) {
    const run = this.#queue.then(async () => {
      const data = await this.#read();
      const result = await operation(data);
      await this.#write(data);
      return result;
    });
    this.#queue = run.catch(() => undefined);
    return run;
  }

  async #read() { return JSON.parse(await readFile(this.#file, "utf8")); }

  async #write(data) {
    const temp = `${this.#file}.${randomUUID()}.tmp`;
    await writeFile(temp, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
    await rename(temp, this.#file);
  }
}
