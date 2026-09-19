// Pure game rules. The browser applies events locally (offline-first) and the
// backend replays the same events to keep an authoritative copy.
import { BADGES, CITIES, COUPON_DAYS, DETOX_MINUTES, GIFT_STAMPS, LEVELS, OFFERS, QUEST_TYPES, RARITY, XP } from "./content.mjs";

export const emptyState = () => ({ v: 3, xp: 0, started: {}, quests: {}, places: {}, dailies: {}, detox: {}, rewards: {}, coupons: {} });

export const findCity = (cityId) => CITIES.find((city) => city.id === cityId) ?? null;

export function findPlace(placeId) {
  for (const city of CITIES) {
    const index = city.places.findIndex((item) => item.id === placeId);
    if (index !== -1) return { city, place: city.places[index], index };
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

export const questRarity = (quest) => quest.rarity ?? QUEST_TYPES[quest.type].rarity;
export const questXp = (quest) => quest.xp ?? RARITY[questRarity(quest)].xp;
export const placeXp = (place) => place.quests.reduce((sum, quest) => sum + questXp(quest), 0) + XP.placeComplete;
export const placeProgress = (state, place) => place.quests.filter((quest) => state.quests[quest.id]).length;
export const placeDone = (state, place) => Boolean(state.places[place.id]);
export const cityDoneCount = (state, city) => city.places.filter((place) => state.places[place.id]).length;
export const cityComplete = (state, city) => cityDoneCount(state, city) === city.places.length;

// The story chapter to play next: the first unfinished place in story order.
export function storyNext(state, city) {
  const index = city.places.findIndex((place) => !placeDone(state, place));
  return index === -1 ? null : { place: city.places[index], index };
}

// Uzbekistan is UTC+5 all year, so "today" is the same for every traveller.
const UZ_OFFSET = 5 * 3600 * 1000;
export const dayKey = (timestamp) => new Date(timestamp + UZ_OFFSET).toISOString().slice(0, 10);
const localHour = (timestamp) => new Date(timestamp + UZ_OFFSET).getUTCHours();

// Lowercase, drop apostrophes, spaces and punctuation so "Qog'oz", "qogoz" and "QOG‘OZ" match.
export const normalizeAnswer = (value) => String(value ?? "").toLowerCase().normalize("NFKC").replace(/ё/g, "е").replace(/[^\p{L}\p{N}]/gu, "");

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
  const story = storyNext(state, city);
  return city.places
    .map((place, index) => {
      if (placeDone(state, place)) return null;
      let score = 20 - index;
      const reasons = [];
      if (state.started[place.id]) { score += 100; reasons.push({ key: "reasonContinue" }); }
      if (story?.place.id === place.id) { score += 40; reasons.push({ key: "reasonStory" }); }
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

// Applies one event. Returns { ok, state, gained, placeCompleted, cityCompleted, coupons } or { ok: false, error }.
// allowTest: accept test-mode shortcuts (simulated GPS arrival, photo skipped). Turn off for real rewards.
export function applyEvent(state, event, { allowTest = true } = {}) {
  const at = Number(event?.at);
  if (!Number.isFinite(at)) return fail("BAD_EVENT");
  if (event.test && !allowTest) return fail("TEST_DISABLED");
  let result;
  switch (event.type) {
    case "start": result = applyStart(state, event, at); break;
    case "quest": result = applyQuest(state, event, at); break;
    case "daily": result = applyDaily(state, event, at); break;
    case "detox": result = applyDetox(state, event, at); break;
    case "reward": result = applyReward(state, event, at); break;
    default: return fail("BAD_EVENT");
  }
  if (!result.ok) return result;
  result.coupons = unlockCoupons(result.state, event, at);
  return result;
}

function applyStart(state, event, at) {
  const found = findPlace(event.placeId);
  if (!found) return fail("PLACE_NOT_FOUND");
  if (state.started[found.place.id]) return fail("DUPLICATE");
  const next = structuredClone(state);
  next.started[found.place.id] = at;
  return { ok: true, state: next, gained: 0 };
}

function checkQuest(quest, event) {
  switch (quest.type) {
    case "quiz": return Number(event.answer) === quest.answer ? null : "WRONG_ANSWER";
    case "riddle": return quest.answers.some((a) => normalizeAnswer(a) === normalizeAnswer(event.text)) ? null : "WRONG_ANSWER";
    case "meet": return normalizeAnswer(event.code) === normalizeAnswer(quest.code) ? null : "WRONG_CODE";
    case "timeline": return Array.isArray(event.order) && event.order.length === quest.order.length && event.order.every((v, i) => Number(v) === quest.order[i]) ? null : "WRONG_ORDER";
    case "photo": return event.hasPhoto || event.test ? null : "PHOTO_REQUIRED";
    case "hunt": {
      if (event.test) return null;
      const lat = Number(event.lat), lng = Number(event.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "BAD_EVENT";
      const slack = Math.min(Math.max(Number(event.accuracy) || 0, 0), 50);
      return distanceMeters(lat, lng, quest.lat, quest.lng) <= quest.radius + slack ? null : "TOO_FAR";
    }
    default: return null;
  }
}

function applyQuest(state, event, at) {
  const found = findQuest(event.questId);
  if (!found) return fail("QUEST_NOT_FOUND");
  const { city, place, quest } = found;
  if (state.quests[quest.id]) return fail("DUPLICATE");
  const problem = checkQuest(quest, event);
  if (problem) return fail(problem);
  const next = structuredClone(state);
  next.started[place.id] ??= at;
  next.quests[quest.id] = { at, photo: Boolean(event.hasPhoto), test: Boolean(event.test) };
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
  next.rewards[city.id] = { at, voucher: `UZQ-${city.short}-${shortCode(event.id + city.id)}` };
  return { ok: true, state: next, gained: 0 };
}

export function offerUnlocked(state, offer) {
  const rule = offer.unlock;
  if (rule.place) return Boolean(state.places[rule.place]);
  if (rule.city) return cityComplete(state, findCity(rule.city));
  if (rule.level) return levelInfo(state.xp).level >= rule.level;
  return false;
}

// Mutates `state` (already a fresh copy) to add any newly earned coupons.
function unlockCoupons(state, event, at) {
  const fresh = [];
  for (const offer of OFFERS) {
    if (state.coupons[offer.id] || !offerUnlocked(state, offer)) continue;
    state.coupons[offer.id] = { at, expiresAt: at + COUPON_DAYS * 86400000, code: `UZQ-${shortCode(`${event.id ?? at}:${offer.id}`)}` };
    fresh.push(offer.id);
  }
  return fresh;
}

// Short, readable, deterministic code so the phone and server always agree.
function shortCode(seed) {
  let hash = 2166136261;
  for (const char of String(seed)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return hash.toString(36).toUpperCase().padStart(6, "0").slice(-6);
}

export function replay(events, options) {
  let state = emptyState();
  for (const event of events) { const result = applyEvent(state, event, options); if (result.ok) state = result.state; }
  return state;
}

const allQuests = () => CITIES.flatMap((city) => city.places.flatMap((place) => place.quests));

export function earnedBadges(state) {
  const quests = allQuests();
  const doneOfType = (...types) => quests.filter((quest) => types.includes(quest.type) && state.quests[quest.id]).length;
  const totalOfType = (type) => quests.filter((quest) => quest.type === type).length;
  const complete = (id) => cityComplete(state, findCity(id));
  const rules = {
    "first-quest": Object.keys(state.quests).length > 0,
    "first-place": Object.keys(state.places).length > 0,
    tashkent: complete("tashkent"),
    samarkand: complete("samarkand"),
    "silk-road": complete("tashkent") && complete("samarkand"),
    foodie: doneOfType("taste") === totalOfType("taste"),
    scholar: doneOfType("quiz", "riddle") >= 6,
    photographer: doneOfType("photo") >= 5,
    unplugged: Object.keys(state.detox).length >= 1
  };
  return BADGES.filter((badge) => rules[badge.id]).map((badge) => badge.id);
}

export function earnedGiftStamps(state) {
  const done = Object.entries(state.quests).map(([id, record]) => ({ quest: findQuest(id)?.quest, hour: localHour(record.at) })).filter((item) => item.quest);
  const rules = {
    "early-bird": done.some((d) => d.hour >= 5 && d.hour < 9),
    "golden-hour": done.some((d) => d.hour >= 17 && d.hour < 20),
    "night-owl": done.some((d) => d.hour >= 20),
    "local-friend": done.some((d) => d.quest.type === "meet"),
    "treasure-hunter": done.some((d) => d.quest.type === "hunt"),
    "first-deal": Object.keys(state.coupons ?? {}).length > 0,
    courier: cityComplete(state, findCity("tashkent")),
    "star-keeper": cityComplete(state, findCity("samarkand"))
  };
  return GIFT_STAMPS.filter((stamp) => rules[stamp.id]).map((stamp) => stamp.id);
}

export function collectedCards(state) {
  return CITIES.flatMap((city) => city.places.filter((place) => state.places[place.id]).map((place) => place.id));
}
