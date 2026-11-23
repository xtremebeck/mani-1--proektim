import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const publicRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../public");
const read = (file) => readFileSync(path.join(publicRoot, file), "utf8");

// Every module the web app can load, relative to public/.
function appModules() {
  const list = ["app/app.mjs", "app/i18n.mjs", "app/local-guide.mjs", "shared/content.mjs", "shared/engine.mjs"];
  for (const dir of ["core", "components", "screens"]) {
    for (const file of readdirSync(path.join(publicRoot, "app", dir))) if (file.endsWith(".mjs")) list.push(`app/${dir}/${file}`);
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
