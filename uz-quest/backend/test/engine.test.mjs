import test from "node:test";
import assert from "node:assert/strict";
import { CITIES, OFFERS, XP } from "../../public/shared/content.mjs";
import {
  applyEvent, collectedCards, dailyFor, dayKey, earnedBadges, earnedGiftStamps, emptyState, levelInfo,
  normalizeAnswer, placeXp, questXp, replay, storyNext, suggestions
} from "../../public/shared/engine.mjs";

const samarkand = CITIES.find((city) => city.id === "samarkand");
const tashkent = CITIES.find((city) => city.id === "tashkent");
let clock = Date.UTC(2026, 8, 19, 5); // 10:00 in Uzbekistan
let ids = 0;

// Builds a valid completion event for any quest type.
function solve(quest, extra = {}) {
  const event = { id: `evt-${++ids}`, type: "quest", questId: quest.id, at: clock++ };
  if (quest.type === "quiz") event.answer = quest.answer;
  if (quest.type === "riddle") event.text = quest.answers[0];
  if (quest.type === "meet") event.code = quest.code;
  if (quest.type === "timeline") event.order = quest.order;
  if (quest.type === "photo") event.hasPhoto = true;
  if (quest.type === "hunt") Object.assign(event, { lat: quest.lat, lng: quest.lng, accuracy: 10 });
  return Object.assign(event, extra);
}
const finishPlace = (place) => place.quests.map((q) => solve(q));
const questOfType = (type) => CITIES.flatMap((c) => c.places.flatMap((p) => p.quests)).find((q) => q.type === type);

test("content is complete: unique ids, valid answers, three languages", () => {
  const quests = CITIES.flatMap((c) => c.places.flatMap((p) => p.quests));
  assert.equal(new Set(quests.map((q) => q.id)).size, quests.length);
  for (const q of quests) {
    for (const lang of ["uz", "en", "ru"]) assert.ok(q.title[lang] && q.prompt[lang], `${q.id} ${lang}`);
    if (q.type === "quiz") assert.ok(q.options[q.answer], q.id);
    if (q.type === "timeline") assert.deepEqual([...q.order].sort(), q.items.map((_, i) => i), q.id);
    if (q.type === "meet") assert.ok(q.code && q.reveal.en && q.person.name.en, q.id);
    if (q.type === "hunt") assert.ok(q.radius > 0 && Number.isFinite(q.lat), q.id);
  }
  for (const c of CITIES) for (const p of c.places) assert.ok(p.chapter.en && p.clue.en && p.card.name.en, p.id);
  for (const o of OFFERS) assert.ok(o.partner.en.includes("demo"), `${o.id} must be marked as a demo partner`);
});

test("answers are forgiving about case, apostrophes and punctuation", () => {
  assert.equal(normalizeAnswer("Qog‘oz!"), normalizeAnswer("qog'oz"));
  assert.equal(normalizeAnswer(" KO'K "), "kok");
  const riddle = tashkent.places.find((p) => p.id === "chorsu").quests.find((q) => q.type === "riddle");
  assert.equal(applyEvent(emptyState(), solve(riddle, { text: "Turquoise" })).ok, true);
  assert.equal(applyEvent(emptyState(), solve(riddle, { text: "red" })).error, "WRONG_ANSWER");
});

test("meet quests need the secret word from the local", () => {
  const meet = questOfType("meet");
  assert.equal(applyEvent(emptyState(), solve(meet, { code: "wrong" })).error, "WRONG_CODE");
  assert.equal(applyEvent(emptyState(), solve(meet, { code: meet.code.toUpperCase() })).ok, true);
});

test("timeline must be in the right order", () => {
  const timeline = questOfType("timeline");
  assert.equal(applyEvent(emptyState(), solve(timeline, { order: [...timeline.order].reverse() })).error, "WRONG_ORDER");
  assert.equal(applyEvent(emptyState(), solve(timeline)).ok, true);
});

test("treasure hunts check GPS, unless test mode is allowed", () => {
  const hunt = questOfType("hunt");
  assert.equal(applyEvent(emptyState(), solve(hunt, { lat: hunt.lat + 0.02 })).error, "TOO_FAR");
  assert.equal(applyEvent(emptyState(), solve(hunt)).ok, true);
  const simulated = { id: "evt-sim", type: "quest", questId: hunt.id, test: true, at: clock++ };
  assert.equal(applyEvent(emptyState(), simulated).ok, true);
  assert.equal(applyEvent(emptyState(), simulated, { allowTest: false }).error, "TEST_DISABLED");
});

test("photo spots need a photo outside test mode", () => {
  const photo = questOfType("photo");
  assert.equal(applyEvent(emptyState(), solve(photo, { hasPhoto: false })).error, "PHOTO_REQUIRED");
  assert.equal(applyEvent(emptyState(), solve(photo, { hasPhoto: false, test: true })).ok, true);
});

test("rarity drives XP", () => {
  assert.equal(questXp(questOfType("checkin")), 30);
  assert.equal(questXp(questOfType("hunt")), 80);
  const legendary = tashkent.places.at(-1).quests.find((q) => q.rarity === "legendary");
  assert.equal(questXp(legendary), 150);
});

test("finishing a place completes the chapter, gives a card and unlocks its partner coupon", () => {
  const place = tashkent.places.find((p) => p.id === "chorsu");
  let state = emptyState(), last;
  for (const event of finishPlace(place)) { last = applyEvent(state, event); state = last.state; }
  assert.equal(last.placeCompleted, true);
  assert.ok(last.coupons.includes("tas-bakery"));
  assert.match(state.coupons["tas-bakery"].code, /^UZQ-[0-9A-Z]{6}$/);
  assert.ok(collectedCards(state).includes("chorsu"));
  assert.ok(earnedGiftStamps(state).includes("local-friend"));
  assert.ok(earnedGiftStamps(state).includes("first-deal"));
});

test("story moves chapter by chapter and the city finale unlocks rewards", () => {
  assert.equal(storyNext(emptyState(), samarkand).place.id, "registan");
  const state = replay(samarkand.places.flatMap(finishPlace));
  assert.equal(storyNext(state, samarkand), null);
  const expected = samarkand.places.reduce((sum, p) => sum + placeXp(p), 0) + XP.cityComplete;
  assert.equal(state.xp, expected);
  assert.ok(earnedBadges(state).includes("samarkand"));
  assert.ok(earnedGiftStamps(state).includes("star-keeper"));
  assert.ok(state.coupons["sam-restaurant"], "city coupon unlocked");
  const reward = applyEvent(state, { type: "reward", cityId: "samarkand", id: "evt-r", at: clock++ });
  assert.match(reward.state.rewards.samarkand.voucher, /^UZQ-SAM-[0-9A-Z]{6}$/);
});

test("time-of-day gift stamps use Uzbekistan time", () => {
  const quest = questOfType("checkin");
  const at = (hourUz) => Date.UTC(2026, 8, 19, hourUz - 5);
  assert.ok(earnedGiftStamps(applyEvent(emptyState(), solve(quest, { at: at(7) })).state).includes("early-bird"));
  assert.ok(earnedGiftStamps(applyEvent(emptyState(), solve(quest, { at: at(18) })).state).includes("golden-hour"));
  assert.ok(earnedGiftStamps(applyEvent(emptyState(), solve(quest, { at: at(21) })).state).includes("night-owl"));
});

test("suggestions favour the next story chapter, interests and started places", () => {
  assert.equal(suggestions(emptyState(), tashkent)[0].place.id, "hazrati-imam");
  const food = suggestions(emptyState(), tashkent, { interests: ["food"] });
  assert.ok(food.slice(0, 3).some((s) => s.place.interests.includes("food")));
  const started = applyEvent(emptyState(), { type: "start", placeId: "tv-tower", at: 1 }).state;
  assert.equal(suggestions(started, tashkent)[0].place.id, "tv-tower");
});

test("daily quest, detox and levels", () => {
  const at = Date.UTC(2026, 8, 19, 8);
  const daily = dailyFor(tashkent, dayKey(at));
  const done = applyEvent(emptyState(), { type: "daily", cityId: "tashkent", dailyId: daily.id, at });
  assert.equal(done.ok, true);
  assert.equal(applyEvent(done.state, { type: "daily", cityId: "tashkent", dailyId: daily.id, at: at + 1 }).error, "DUPLICATE");
  assert.equal(applyEvent(emptyState(), { type: "detox", startedAt: at - 5 * 60000, at }).error, "DETOX_TOO_SHORT");
  assert.equal(levelInfo(0).level, 1);
  assert.equal(levelInfo(250).level, 2);
});
