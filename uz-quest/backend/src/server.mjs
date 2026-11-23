import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { JsonStore } from "./store.mjs";
import { askGuide, guideAvailable } from "./guide.mjs";
import { CITIES, OFFERS } from "../../public/shared/content.mjs";
import { applyEvent, cityDoneCount, emptyState, findCity, levelInfo } from "../../public/shared/engine.mjs";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const publicRoot = path.join(appRoot, "public");
const store = new JsonStore(process.env.DATA_FILE ?? path.join(appRoot, "data", "store.json"));
const port = Number.parseInt(process.env.PORT ?? "4174", 10);
const host = process.env.HOST ?? "127.0.0.1";
const production = process.env.NODE_ENV === "production";
const loopback = ["127.0.0.1", "::1", "localhost"].includes(host);
// The dev key is published in the README, so it is only allowed on a local, non-production server.
if (!process.env.ADMIN_KEY && (production || !loopback)) {
  console.error("ADMIN_KEY must be set when NODE_ENV=production or HOST is not a loopback address.");
  process.exit(1);
}
const adminKey = process.env.ADMIN_KEY ?? "uzquest-dev-admin";
// Test-mode shortcuts (simulated GPS, skipped photos) are fine for demos but let anyone
// earn partner coupons from home, so they are off in production unless explicitly enabled.
const allowTest = process.env.ALLOW_TEST_EVENTS ? process.env.ALLOW_TEST_EVENTS === "true" : !production;
const STATE_VERSION = emptyState().v;
const MAX_EVENTS_PER_SYNC = 100;
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json", ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon"
};

await store.initialize();

class HttpError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}

// Fixed one-minute windows per client IP. In-memory, so it resets on restart;
// behind a reverse proxy every client shares the proxy's address.
const windows = new Map();
function rateLimit(req, bucket, max, { count = true } = {}) {
  const key = `${bucket}:${req.socket.remoteAddress}`;
  const now = Date.now();
  let entry = windows.get(key);
  if (!entry || entry.reset <= now) { entry = { hits: 0, reset: now + 60_000 }; windows.set(key, entry); }
  // Counting: this hit is over the limit. Peeking: the next hit would be.
  if (count) return ++entry.hits > max;
  return entry.hits >= max;
}
setInterval(() => { const now = Date.now(); for (const [key, entry] of windows) if (entry.reset <= now) windows.delete(key); }, 60_000).unref();

// The landing page embeds /app/ in an iframe, so framing is allowed for the same origin only.
const SECURITY_HEADERS = { "X-Content-Type-Options": "nosniff", "X-Frame-Options": "SAMEORIGIN", "Referrer-Policy": "same-origin" };

function send(res, status, body, id) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { ...SECURITY_HEADERS, "Content-Type": "application/json; charset=utf-8", "Content-Length": Buffer.byteLength(payload), "Cache-Control": "no-store", "X-Request-Id": id });
  res.end(payload);
}
const fail = (res, status, code, message, id) => send(res, status, { error: { code, message }, requestId: id }, id);

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 256 * 1024) throw new HttpError(413, "REQUEST_TOO_LARGE", "Request body is too large.");
    chunks.push(chunk);
  }
  let body;
  try { body = size ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {}; } catch { throw new HttpError(400, "INVALID_JSON", "Malformed JSON."); }
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new HttpError(400, "INVALID_JSON", "Expected a JSON object.");
  return body;
}

function isAdmin(req) {
  const given = Buffer.from(String(req.headers["x-admin-key"] ?? ""));
  const expected = Buffer.from(adminKey);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

const validId = (value) => typeof value === "string" && /^[A-Za-z0-9-]{8,64}$/.test(value);
const validLang = (value) => (["uz", "en", "ru"].includes(value) ? value : "en");

// Only the fields the engine reads are stored, so a client cannot pad the data file.
const EVENT_FIELDS = ["id", "type", "at", "test", "placeId", "questId", "answer", "text", "code", "order", "hasPhoto", "lat", "lng", "accuracy", "cityId", "dailyId", "startedAt"];
function cleanEvent(raw) {
  const event = {};
  for (const field of EVENT_FIELDS) {
    const value = raw[field];
    if (value === undefined) continue;
    if (typeof value === "string") event[field] = value.slice(0, 200);
    else if (typeof value === "number" || typeof value === "boolean") event[field] = value;
    else if (field === "order" && Array.isArray(value)) event[field] = value.slice(0, 20).map(Number);
  }
  return event;
}

async function sync(input, canCreateDevice) {
  if (!validId(input.deviceId)) return { status: 400, code: "INVALID_DEVICE", message: "deviceId is required." };
  const events = Array.isArray(input.events) ? input.events.slice(0, MAX_EVENTS_PER_SYNC) : [];
  return store.mutate((data) => {
    const now = Date.now();
    let device = data.devices[input.deviceId];
    if (!device && !canCreateDevice()) return { status: 429, code: "RATE_LIMITED", message: "Too many new devices from this address." };
    if (!device || device.state?.v !== STATE_VERSION) device = data.devices[input.deviceId] = { createdAt: now, lang: "en", events: [], state: emptyState() };
    device.lastSeenAt = now;
    device.lang = validLang(input.lang);
    const known = new Set(device.events.map((event) => event.id));
    const accepted = [], rejected = [];
    for (const raw of events) {
      if (!validId(raw?.id)) { rejected.push({ id: raw?.id ?? null, error: "BAD_EVENT" }); continue; }
      if (known.has(raw.id)) { accepted.push(raw.id); continue; }
      // Never trust a timestamp from the future. Photos stay on the device.
      const event = { ...cleanEvent(raw), at: Math.min(Number(raw.at), now) };
      const result = applyEvent(device.state, event, { allowTest, now });
      if (!result.ok) { rejected.push({ id: raw.id, error: result.error }); continue; }
      device.state = result.state;
      device.events.push({ ...event, receivedAt: now });
      known.add(raw.id);
      accepted.push(raw.id);
    }
    return { status: 200, body: { accepted, rejected, state: device.state } };
  });
}

async function overview() {
  const data = await store.snapshot();
  const devices = Object.entries(data.devices).filter(([, d]) => d.state?.v === STATE_VERSION);
  const cities = CITIES.map((city) => {
    const started = devices.filter(([, d]) => city.places.some((place) => d.state.started[place.id])).length;
    const completed = devices.filter(([, d]) => cityDoneCount(d.state, city) === city.places.length).length;
    return {
      id: city.id, name: city.name.en, started, completed,
      rewardsClaimed: devices.filter(([, d]) => d.state.rewards[city.id]).length,
      funnel: city.places.map((place) => ({
        id: place.id, name: place.name.en,
        started: devices.filter(([, d]) => d.state.started[place.id]).length,
        completed: devices.filter(([, d]) => d.state.places[place.id]).length
      }))
    };
  });
  const languages = devices.reduce((acc, [, d]) => ({ ...acc, [d.lang]: (acc[d.lang] ?? 0) + 1 }), {});
  const cityVouchers = devices.flatMap(([, d]) => Object.entries(d.state.rewards).map(([cityId, reward]) => ({ kind: "city", label: cityId, voucher: reward.voucher, at: reward.at, redeemedAt: d.redeemed?.[cityId] ?? null })));
  const couponCodes = devices.flatMap(([, d]) => Object.entries(d.state.coupons ?? {}).map(([offerId, coupon]) => ({ kind: "coupon", label: OFFERS.find((o) => o.id === offerId)?.partner.en ?? offerId, voucher: coupon.code, at: coupon.at, redeemedAt: d.redeemed?.[`coupon:${offerId}`] ?? null })));
  const vouchers = [...cityVouchers, ...couponCodes].sort((a, b) => b.at - a.at).slice(0, 50);
  const offers = OFFERS.map((offer) => ({
    id: offer.id, partner: offer.partner.en, deal: offer.deal.en,
    issued: devices.filter(([, d]) => d.state.coupons?.[offer.id]).length,
    redeemed: devices.filter(([, d]) => d.redeemed?.[`coupon:${offer.id}`]).length
  }));
  const totalXp = devices.reduce((sum, [, d]) => sum + d.state.xp, 0);
  return {
    metrics: {
      travellers: devices.length,
      adventures: devices.reduce((sum, [, d]) => sum + Object.keys(d.state.places).length, 0),
      quests: devices.reduce((sum, [, d]) => sum + Object.keys(d.state.quests).length, 0),
      averageXp: devices.length ? Math.round(totalXp / devices.length) : 0
    },
    cities, languages, vouchers, offers,
    recent: devices.sort(([, a], [, b]) => b.lastSeenAt - a.lastSeenAt).slice(0, 15).map(([id, d]) => ({
      id: id.slice(0, 8), lang: d.lang, xp: d.state.xp, level: levelInfo(d.state.xp).level,
      adventures: Object.keys(d.state.places).length, lastSeenAt: d.lastSeenAt
    }))
  };
}

async function redeem(voucher) {
  const code = String(voucher ?? "").trim().toUpperCase();
  if (!code) return { status: 400, code: "INVALID_VOUCHER", message: "Enter a voucher code." };
  return store.mutate((data) => {
    // Codes are short hashes, so two travellers could in theory share one. Never guess which.
    const owners = Object.values(data.devices).filter((device) => device.state?.v === STATE_VERSION && (
      Object.values(device.state.rewards ?? {}).some((reward) => reward.voucher === code) ||
      Object.values(device.state.coupons ?? {}).some((coupon) => coupon.code === code)));
    if (owners.length > 1) return { status: 409, code: "AMBIGUOUS_VOUCHER", message: "This code belongs to more than one traveller. Check the code shown in the traveller's app before handing over the reward." };
    for (const device of owners) {
      // City vouchers are keyed by city id, partner coupons by "coupon:<offer id>".
      const codes = [
        ...Object.entries(device.state.rewards ?? {}).map(([cityId, reward]) => ({ key: cityId, code: reward.voucher, label: findCity(cityId)?.name.en ?? cityId })),
        ...Object.entries(device.state.coupons ?? {}).map(([offerId, coupon]) => ({ key: `coupon:${offerId}`, code: coupon.code, label: OFFERS.find((o) => o.id === offerId)?.deal.en ?? offerId, expiresAt: coupon.expiresAt }))
      ];
      const match = codes.find((item) => item.code === code);
      if (!match) continue;
      device.redeemed ??= {};
      if (device.redeemed[match.key]) return { status: 409, code: "ALREADY_REDEEMED", message: `Already redeemed on ${new Date(device.redeemed[match.key]).toISOString()}.` };
      if (match.expiresAt && match.expiresAt < Date.now()) return { status: 410, code: "EXPIRED", message: "This coupon has expired." };
      device.redeemed[match.key] = Date.now();
      return { status: 200, body: { voucher: code, label: match.label, redeemedAt: device.redeemed[match.key] } };
    }
    return { status: 404, code: "VOUCHER_NOT_FOUND", message: "Voucher not found. Ask the traveller to open the app online so it can sync." };
  });
}

async function serveStatic(req, res, id) {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname); } catch { return fail(res, 400, "BAD_URL", "Malformed URL.", id); }
  if (pathname.includes("\0")) return fail(res, 400, "BAD_URL", "Malformed URL.", id);
  if (pathname === "/app") { res.writeHead(301, { Location: "/app/" }); return res.end(); }
  const target = pathname.endsWith("/") ? `${pathname}index.html` : pathname === "/admin" ? "/admin.html" : pathname;
  const file = path.resolve(publicRoot, `.${target}`);
  if (!file.startsWith(publicRoot + path.sep)) return fail(res, 403, "FORBIDDEN", "Forbidden.", id);
  try {
    if (!(await stat(file)).isFile()) throw Error();
    const content = await readFile(file);
    res.writeHead(200, { ...SECURITY_HEADERS, "Content-Type": MIME[path.extname(file)] ?? "application/octet-stream", "Content-Length": content.length, "Cache-Control": "no-cache", "X-Request-Id": id });
    res.end(content);
  } catch { fail(res, 404, "NOT_FOUND", "Not found.", id); }
}

const server = createServer(async (req, res) => {
  const id = randomUUID();
  try {
    const pathname = new URL(req.url, "http://localhost").pathname;
    const route = `${req.method} ${pathname}`;
    if (route === "GET /api/v1/health") return send(res, 200, { status: "ok", service: "uzquest-api", guide: await guideAvailable(), testEvents: allowTest }, id);
    if (route === "POST /api/v1/sync") {
      if (rateLimit(req, "sync", 60)) return fail(res, 429, "RATE_LIMITED", "Too many requests.", id);
      const result = await sync(await readBody(req), () => !rateLimit(req, "new-device", 10));
      return result.status === 200 ? send(res, 200, result.body, id) : fail(res, result.status, result.code, result.message, id);
    }
    if (route === "POST /api/v1/guide") {
      if (rateLimit(req, "guide", 20)) return fail(res, 429, "RATE_LIMITED", "Too many requests.", id);
      const input = await readBody(req);
      const message = typeof input.message === "string" ? input.message.trim() : "";
      if (!message || message.length > 500) return fail(res, 400, "INVALID_MESSAGE", "Message must be 1-500 characters.", id);
      if (!(await guideAvailable())) return fail(res, 503, "GUIDE_UNAVAILABLE", "AI guide is not configured.", id);
      const reply = await askGuide({ message, history: input.history, cityId: input.cityId, placeId: input.placeId, interests: input.interests, lang: validLang(input.lang) }).catch((error) => { console.error(`[${id}] guide`, error.message); return null; });
      if (!reply) return fail(res, 502, "GUIDE_FAILED", "The AI guide could not answer right now.", id);
      return send(res, 200, { reply, source: "claude" }, id);
    }
    if (pathname.startsWith("/api/v1/admin/")) {
      // Checked before the key so a blocked client cannot keep guessing.
      if (rateLimit(req, "admin-fail", 10, { count: false })) return fail(res, 429, "RATE_LIMITED", "Too many failed attempts. Try again in a minute.", id);
      if (!isAdmin(req)) { rateLimit(req, "admin-fail", 10); return fail(res, 401, "ADMIN_REQUIRED", "Invalid admin key.", id); }
      if (route === "GET /api/v1/admin/overview") return send(res, 200, await overview(), id);
      if (route === "POST /api/v1/admin/redeem") {
        const result = await redeem((await readBody(req)).voucher);
        return result.status === 200 ? send(res, 200, result.body, id) : fail(res, result.status, result.code, result.message, id);
      }
      return fail(res, 404, "NOT_FOUND", "Not found.", id);
    }
    if (req.method !== "GET" && req.method !== "HEAD") return fail(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed.", id);
    return await serveStatic(req, res, id);
  } catch (error) {
    if (error instanceof HttpError) return fail(res, error.status, error.code, error.message, id);
    console.error(`[${id}]`, error);
    return fail(res, 500, "INTERNAL_ERROR", "Unexpected error.", id);
  }
});

server.listen(port, host, () => console.log(`UzQuest: http://${host}:${port}  (admin: /admin, test events: ${allowTest ? "on" : "off"})`));
