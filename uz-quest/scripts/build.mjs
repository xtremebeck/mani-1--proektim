// Copies public/ into dist/ for static hosting (no backend). The app then runs
// fully offline-first: progress lives on the device and the guide uses its
// built-in answers.
//
// With REDIRECT_TO=https://… the build instead sends every visitor to the server at that
// address, keeping the page and the app screen they asked for. It also ships a service worker
// that clears the old offline copy and removes itself, so phones that installed the static
// app follow too. GitHub Pages uses this once the real server runs elsewhere.
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
await rm(dist, { recursive: true, force: true });

const target = process.env.REDIRECT_TO?.replace(/\/+$/, "");
if (target) {
  if (!/^https:\/\/[^/]+$/.test(target)) { console.error("REDIRECT_TO must be an https:// address without a path."); process.exit(1); }
  const page = (to) => {
    const url = JSON.stringify(`${target}${to}`);
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>UzQuest has moved</title>
    <meta name="robots" content="noindex" />
    <link rel="canonical" href=${url} />
    <meta http-equiv="refresh" content="2; url=${target}${to}" />
    <script>
      // Remove the old offline copy first, or an installed app keeps showing it; never wait long.
      const go = () => location.replace(${url} + location.search + location.hash);
      setTimeout(go, 1500);
      Promise.all([
        navigator.serviceWorker?.getRegistrations().then((all) => Promise.all(all.map((registration) => registration.unregister()))),
        self.caches?.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      ]).catch(() => {}).finally(go);
    </script>
  </head>
  <body style="font-family: system-ui, sans-serif; padding: 24px">
    <p>UzQuest has moved to <a href=${url}>${target}${to}</a>.</p>
  </body>
</html>
`;
  };
  await mkdir(path.join(dist, "app"), { recursive: true });
  await writeFile(path.join(dist, "index.html"), page("/"));
  await writeFile(path.join(dist, "app", "index.html"), page("/app/"));
  await writeFile(path.join(dist, "404.html"), page("/"));
  await writeFile(path.join(dist, "sw.js"), `// The app moved to ${target}. This replaces the old offline copy: it deletes the caches,
// unregisters itself and reloads open pages, which then redirect.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil((async () => {
  for (const key of await caches.keys()) await caches.delete(key);
  await self.clients.claim();
  await self.registration.unregister();
  for (const client of await self.clients.matchAll({ type: "window" })) client.navigate(client.url).catch(() => {});
})()));
`);
  console.log(`Redirect build written to ${dist} (to ${target})`);
} else {
  await cp(path.join(root, "public"), dist, { recursive: true, filter: (source) => !/admin\.(html|mjs)$/.test(source) });
  console.log(`Static build written to ${dist}`);
}
