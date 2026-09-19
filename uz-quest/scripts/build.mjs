// Copies public/ into dist/ for static hosting (no backend). The app then runs
// fully offline-first: progress lives on the device and the guide uses its
// built-in answers.
import { cp, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
await rm(dist, { recursive: true, force: true });
await cp(path.join(root, "public"), dist, { recursive: true, filter: (source) => !/admin\.(html|mjs)$/.test(source) });
console.log(`Static build written to ${dist}`);
