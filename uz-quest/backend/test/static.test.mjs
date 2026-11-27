import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const publicRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../public");
const read = (file) => readFileSync(path.join(publicRoot, file), "utf8");

// Every module the web app can load, relative to public/.
function appModules() {
  const list = ["app/app.mjs", "app/i18n.mjs", "app/local-guide.mjs"];
  for (const dir of ["app/core", "app/components", "app/screens", "shared", "shared/lang"]) {
    for (const file of readdirSync(path.join(publicRoot, dir))) if (file.endsWith(".mjs")) list.push(`${dir}/${file}`);
  }
  return list.sort();
}

test("every app module is preloaded by app/index.html", () => {
  const preloaded = [...read("app/index.html").matchAll(/<link rel="modulepreload" href="([^"]+)"/g)].map((m) => path.posix.normalize(`app/${m[1]}`));
  const missing = appModules().filter((file) => !preloaded.includes(file));
  assert.deepEqual(missing, [], `add <link rel="modulepreload"> to app/index.html for: ${missing.join(", ")}`);
  const stale = preloaded.filter((file) => !existsSync(path.join(publicRoot, file)));
  assert.deepEqual(stale, [], `app/index.html preloads files that do not exist: ${stale.join(", ")}`);
});

test("every app module is precached by the service worker", () => {
  const sw = read("sw.js");
  const shell = [...sw.slice(sw.indexOf("const SHELL = ["), sw.indexOf("];", sw.indexOf("const SHELL = ["))).matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  const missing = appModules().filter((file) => !shell.includes(file));
  assert.deepEqual(missing, [], `add to SHELL in sw.js (and bump CACHE): ${missing.join(", ")}`);
  const stale = shell.filter((file) => !file.endsWith("/") && !existsSync(path.join(publicRoot, file)));
  assert.deepEqual(stale, [], `sw.js precaches files that do not exist: ${stale.join(", ")}`);
});

test("the redirect build sends every page to the server and retires the offline copy", async () => {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const { mkdtemp, readFile: read, readdir: list, rm: remove, cp: copy } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const run = promisify(execFile);
  // Build in a copy, so the test never touches the project's own dist/.
  const dir = await mkdtemp(path.join(tmpdir(), "uzq-build-"));
  try {
    await copy(path.join(publicRoot, "../scripts"), path.join(dir, "scripts"), { recursive: true });
    await copy(publicRoot, path.join(dir, "public"), { recursive: true });
    const build = (env) => run(process.execPath, [path.join(dir, "scripts/build.mjs")], { env: { PATH: process.env.PATH, ...env } });
    await build({ REDIRECT_TO: "https://example.org/" });
    const dist = path.join(dir, "dist");
    assert.deepEqual((await list(dist, { recursive: true })).sort(), ["404.html", "app", "app/index.html", "index.html", "sw.js"]);
    const app = await read(path.join(dist, "app/index.html"), "utf8");
    assert.match(app, /location\.replace\("https:\/\/example\.org\/app\/" \+ location\.search \+ location\.hash\)/);
    assert.match(app, /unregister\(\)/);
    assert.match(await read(path.join(dist, "index.html"), "utf8"), /"https:\/\/example\.org\/"/);
    assert.match(await read(path.join(dist, "sw.js"), "utf8"), /caches\.delete[\s\S]*registration\.unregister\(\)/);
    await assert.rejects(build({ REDIRECT_TO: "http://example.org" }), /must be an https/);
    await build({});
    assert.ok((await list(dist)).includes("landing.mjs"), "without REDIRECT_TO the full static app is built");
  } finally { await remove(dir, { recursive: true, force: true }); }
});
