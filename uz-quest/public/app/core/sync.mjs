// Events and server sync: apply an event locally, queue it, and send the queue when online.
import { BADGES, GIFT_STAMPS, OFFERS } from "../../shared/content.mjs";
import { applyEvent, earnedBadges, earnedGiftStamps, findQuest, levelInfo, replay } from "../../shared/engine.mjs";
import { toast } from "./feedback.mjs";
import { render } from "./router.mjs";
import { session, testAllowed } from "./session.mjs";
import { KEYS, store, uuid } from "./storage.mjs";
import { L, t } from "./ui.mjs";

export const apiUrl = (path) => new URL(`../api/v1/${path}`, location.href).href;

export function dispatch(partial) {
  const event = { id: uuid(), at: Date.now(), ...partial };
  const before = session.state;
  if (event.test && !testAllowed()) return { ok: false, error: "TEST_DISABLED" };
  const result = applyEvent(session.state, event);
  if (!result.ok) return result;
  session.state = result.state;
  store.set(KEYS.state, session.state);
  if (session.log) { session.log.push(event); store.set(KEYS.log, session.log); }
  store.set(KEYS.outbox, [...store.get(KEYS.outbox, []), event]);
  const diff = (fn) => { const old = new Set(fn(before)); return fn(session.state).filter((id) => !old.has(id)); };
  const newBadges = diff(earnedBadges), newGifts = diff(earnedGiftStamps);
  const oldLevel = levelInfo(before.xp).level, newLevel = levelInfo(session.state.xp);
  const leveledUp = newLevel.level > oldLevel;
  if (result.placeCompleted) {
    // The chapter-complete screen celebrates everything at once, so skip toasts.
    const placeId = findQuest(event.questId)?.place.id;
    session.lastCompletion = { placeId, newBadges, newGifts, coupons: result.coupons, levelUp: leveledUp ? newLevel : null, cityCompleted: result.cityCompleted };
  } else {
    if (result.gained) toast(t("gained", { n: result.gained }), "xp");
    newBadges.forEach((id) => toast(t("badgeNew", { name: L(BADGES.find((b) => b.id === id).name) }), "gold"));
    newGifts.forEach((id) => toast(t("newGift", { name: L(GIFT_STAMPS.find((g) => g.id === id).name) }), "gold"));
    result.coupons.forEach((id) => toast(t("newCoupon", { partner: L(OFFERS.find((o) => o.id === id).partner) }), "gold"));
    if (leveledUp) toast(t("levelUp", { title: L(newLevel.title) }), "gold");
  }
  navigator.vibrate?.(result.placeCompleted ? [40, 60, 40] : 30);
  flush();
  return result;
}

let flushing = null;
// One sync at a time; a call made meanwhile runs once the current one finishes.
export function flush() {
  const run = (flushing ?? Promise.resolve()).then(syncOutbox).finally(() => { if (flushing === run) flushing = null; });
  flushing = run;
  return run;
}

async function syncOutbox() {
  if (!session.server.online || !navigator.onLine) return;
  const outbox = store.get(KEYS.outbox, []);
  if (!outbox.length) return;
  try {
    const response = await fetch(apiUrl("sync"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deviceId: session.deviceId, lang: session.profile.lang, events: outbox }) });
    if (!response.ok) return;
    const data = await response.json();
    // TRY_LATER: the server did not judge the event yet (too many wrong secret words), so keep it queued.
    const judged = data.rejected.filter((item) => item.error !== "TRY_LATER");
    const settled = new Set([...data.accepted, ...judged.map((item) => item.id)]);
    store.set(KEYS.outbox, store.get(KEYS.outbox, []).filter((event) => !settled.has(event.id)));
    // A DUPLICATE means the server already has that progress; anything else never counted there.
    const dropped = new Set(judged.filter((item) => item.error !== "DUPLICATE").map((item) => item.id));
    if (dropped.size && session.log) {
      session.log = session.log.filter((event) => !dropped.has(event.id));
      store.set(KEYS.log, session.log);
      session.state = replay(session.log);
      store.set(KEYS.state, session.state);
      toast(t("syncRejected"), "error");
      render();
    }
  } catch { /* retry later */ }
}

// Asks the server whether a meet quest's secret word is right, since only the server knows it.
// Returns "ok", "wrong", "later" (too many wrong words), "offline" (the phone has no connection; the
// next sync decides) or "unchecked" (no server to ask, e.g. the static demo).
export async function checkMeetCode(questId, code) {
  if (!navigator.onLine) return "offline";
  if (!session.server.online) return "unchecked";
  try {
    const response = await fetch(apiUrl("meet/check"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questId, code }) });
    if (response.status === 429) return "later";
    if (!response.ok) return "unchecked";
    return (await response.json()).ok ? "ok" : "wrong";
  } catch { return "unchecked"; }
}

export async function checkServer() {
  const wasAllowed = testAllowed();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const response = await fetch(apiUrl("health"), { cache: "no-store", signal: controller.signal });
    clearTimeout(timer);
    const data = response.ok ? await response.json() : null;
    session.server.online = data?.service === "uzquest-api";
    session.server.guide = Boolean(data?.guide);
    session.server.testEvents = data?.testEvents !== false;
  } catch { session.server.online = false; session.server.guide = false; }
  if (testAllowed() !== wasAllowed && session.profile.done) render();
  flush();
}
