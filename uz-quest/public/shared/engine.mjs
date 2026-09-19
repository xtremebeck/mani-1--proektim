// Pure game rules. The browser applies events locally (offline-first) and the
// backend replays the same events to keep an authoritative copy.
import { BADGES, CITIES, DETOX_MINUTES, LEVELS, QUEST_TYPES, XP } from "./content.mjs";

export const emptyState = () => ({ v: 2, xp: 0, started: {}, quests: {}, places: {}, dailies: {}, detox: {}, rewards: {} });

export const findCity = (cityId) => CITIES.find((city) => city.id === cityId) ?? null;

export function findPlace(placeId) {
  for (const city of CITIES) {
    const place = city.places.find((item) => item.id === placeId);
    if (place) return { city, place };
  }
  return null;
}

export function findQuest(questId) {
  for (const city of CITIES) for (const place of city.places) {
    const quest = place.quests.find((item) => item.id === questId);
    if (quest) return { city, place, quest };
  }
  return null;
}

export const questXp = (quest) => quest.xp ?? QUEST_TYPES[quest.type].xp;
export const placeXp = (place) => place.quests.reduce((sum, quest) => sum + questXp(quest), 0) + XP.placeComplete;
export const placeProgress = (state, place) => place.quests.filter((quest) => state.quests[quest.id]).length;
export const placeDone = (state, place) => Boolean(state.places[place.id]);
export const cityDoneCount = (state, city) => city.places.filter((place) => state.places[place.id]).length;
export const cityComplete = (state, city) => cityDoneCount(state, city) === city.places.length;

// Uzbekistan is UTC+5 all year, so "today" is the same for every traveller.
export const dayKey = (timestamp) => new Date(timestamp + 5 * 3600 * 1000).toISOString().slice(0, 10);

export function dailyFor(city, day) {
  let seed = 0;
  for (const char of `${city.id}:${day}`) seed = (seed * 31 + char.charCodeAt(0)) >>> 0;
  return city.dailies[seed % city.dailies.length];
}

export function levelInfo(xp) {
  let index = 0;
  while (index + 1 < LEVELS.length && xp >= LEVELS[index + 1].xp) index++;
  const floor = LEVELS[index].xp, ceil = LEVELS[index + 1]?.xp ?? null;
  return { level: index + 1, title: LEVELS[index].title, xp, floor, ceil, progress: ceil ? (xp - floor) / (ceil - floor) : 1 };
}

export function distanceMeters(aLat, aLng, bLat, bLng) {
  const rad = Math.PI / 180, dLat = (bLat - aLat) * rad, dLng = (bLng - aLng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

// Ranks the places the traveller hasn't finished. Returns [{ place, score, reason }].
export function suggestions(state, city, { interests = [], position = null } = {}) {
  return city.places
    .map((place, index) => {
      if (placeDone(state, place)) return null;
      let score = 20 - index; // gentle default: the classic route order
      const reasons = [];
      if (state.started[place.id]) { score += 100; reasons.push({ key: "reasonContinue" }); }
      const matches = place.interests.filter((id) => interests.includes(id));
      if (matches.length) { score += 30 * matches.length; reasons.push({ key: "reasonInterest", interest: matches[0] }); }
      let distance = null;
      if (position) {
        distance = distanceMeters(position.lat, position.lng, place.lat, place.lng);
        score += Math.max(0, 40 - distance / 250);
        if (distance < 2500) reasons.push({ key: "reasonNear", distance });
      }
      return { place, score, distance, reason: reasons[0] ?? { key: "reasonPopular" } };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
}

const fail = (error) => ({ ok: false, error });

// Applies one event. Returns { ok, state, gained, placeCompleted, cityCompleted } or { ok: false, error }.
export function applyEvent(state, event) {
  const at = Number(event?.at);
  if (!Number.isFinite(at)) return fail("BAD_EVENT");
  switch (event.type) {
    case "start": return applyStart(state, event, at);
    case "quest": return applyQuest(state, event, at);
    case "daily": return applyDaily(state, event, at);
    case "detox": return applyDetox(state, event, at);
    case "reward": return applyReward(state, event, at);
    default: return fail("BAD_EVENT");
  }
}

function applyStart(state, event, at) {
  const found = findPlace(event.placeId);
  if (!found) return fail("PLACE_NOT_FOUND");
  if (state.started[found.place.id]) return fail("DUPLICATE");
  const next = structuredClone(state);
  next.started[found.place.id] = at;
  return { ok: true, state: next, gained: 0 };
}

function applyQuest(state, event, at) {
  const found = findQuest(event.questId);
  if (!found) return fail("QUEST_NOT_FOUND");
  const { city, place, quest } = found;
  if (state.quests[quest.id]) return fail("DUPLICATE");
  if (quest.type === "quiz" && Number(event.answer) !== quest.answer) return fail("WRONG_ANSWER");
  const next = structuredClone(state);
  next.started[place.id] ??= at;
  next.quests[quest.id] = { at, photo: Boolean(event.hasPhoto) };
  let gained = questXp(quest);
  let placeCompleted = false, cityCompleted = false;
  if (placeProgress(next, place) === place.quests.length) {
    next.places[place.id] = { at };
    gained += XP.placeComplete;
    placeCompleted = true;
    if (cityComplete(next, city)) { gained += XP.cityComplete; cityCompleted = true; }
  }
  next.xp += gained;
  return { ok: true, state: next, gained, placeCompleted, cityCompleted };
}

function applyDaily(state, event, at) {
  const city = findCity(event.cityId);
  if (!city) return fail("CITY_NOT_FOUND");
  const day = dayKey(at);
  if (state.dailies[day]) return fail("DUPLICATE");
  if (dailyFor(city, day).id !== event.dailyId) return fail("DAILY_EXPIRED");
  const next = structuredClone(state);
  next.dailies[day] = { at, dailyId: event.dailyId, cityId: city.id };
  next.xp += XP.daily;
  return { ok: true, state: next, gained: XP.daily };
}

function applyDetox(state, event, at) {
  const startedAt = Number(event.startedAt);
  if (!Number.isFinite(startedAt) || startedAt > at) return fail("BAD_EVENT");
  if (at - startedAt < DETOX_MINUTES * 60 * 1000) return fail("DETOX_TOO_SHORT");
  const day = dayKey(at);
  if (state.detox[day]) return fail("DUPLICATE");
  const next = structuredClone(state);
  next.detox[day] = { at, startedAt };
  next.xp += XP.detox;
  return { ok: true, state: next, gained: XP.detox };
}

function applyReward(state, event, at) {
  const city = findCity(event.cityId);
  if (!city) return fail("CITY_NOT_FOUND");
  if (!cityComplete(state, city)) return fail("CITY_NOT_COMPLETED");
  if (state.rewards[city.id]) return fail("DUPLICATE");
  if (typeof event.id !== "string" || !event.id) return fail("BAD_EVENT");
  const next = structuredClone(state);
  next.rewards[city.id] = { at, voucher: voucherCode(city, event.id) };
  return { ok: true, state: next, gained: 0 };
}

// Short, readable, deterministic code so the phone and server always agree.
function voucherCode(city, seed) {
  let hash = 2166136261;
  for (const char of seed + city.id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return `UZQ-${city.short}-${hash.toString(36).toUpperCase().padStart(6, "0").slice(-6)}`;
}

export function replay(events) {
  let state = emptyState();
  for (const event of events) { const result = applyEvent(state, event); if (result.ok) state = result.state; }
  return state;
}

export function earnedBadges(state) {
  const allQuests = CITIES.flatMap((city) => city.places.flatMap((place) => place.quests));
  const doneOfType = (type) => allQuests.filter((quest) => quest.type === type && state.quests[quest.id]).length;
  const totalOfType = (type) => allQuests.filter((quest) => quest.type === type).length;
  const complete = (id) => cityComplete(state, findCity(id));
  const rules = {
    "first-quest": Object.keys(state.quests).length > 0,
    "first-place": Object.keys(state.places).length > 0,
    tashkent: complete("tashkent"),
    samarkand: complete("samarkand"),
    "silk-road": complete("tashkent") && complete("samarkand"),
    foodie: doneOfType("taste") === totalOfType("taste"),
    scholar: doneOfType("quiz") >= 6,
    photographer: doneOfType("photo") >= 5,
    unplugged: Object.keys(state.detox).length >= 1
  };
  return BADGES.filter((badge) => rules[badge.id]).map((badge) => badge.id);
}
