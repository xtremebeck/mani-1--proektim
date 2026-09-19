import test from "node:test";
import assert from "node:assert/strict";
import { CITIES, XP } from "../../public/shared/content.mjs";
import {
  applyEvent, dailyFor, dayKey, earnedBadges, emptyState, levelInfo, placeXp, questXp, replay, suggestions
} from "../../public/shared/engine.mjs";

const samarkand = CITIES.find((city) => city.id === "samarkand");
const tashkent = CITIES.find((city) => city.id === "tashkent");
let clock = 1;
const complete = (quest) => ({ type: "quest", questId: quest.id, answer: quest.answer, at: clock++ });
const finishPlace = (place) => place.quests.map(complete);

test("every quest id is unique and every quiz answer is a valid option", () => {
  const ids = CITIES.flatMap((c) => c.places.flatMap((p) => p.quests.map((q) => q.id)));
  assert.equal(new Set(ids).size, ids.length);
  for (const c of CITIES) for (const p of c.places) for (const q of p.quests) {
    if (q.type === "quiz") assert.ok(q.options[q.answer], q.id);
    for (const lang of ["uz", "en", "ru"]) assert.ok(q.title[lang] && q.prompt[lang], `${q.id} ${lang}`);
  }
});

test("completing a quest gives XP and auto-starts the place", () => {
  const quest = tashkent.places[0].quests[0];
  const result = applyEvent(emptyState(), complete(quest));
  assert.equal(result.state.xp, questXp(quest));
  assert.ok(result.state.started[tashkent.places[0].id]);
  assert.equal(applyEvent(result.state, complete(quest)).error, "DUPLICATE");
});

test("wrong quiz answers are rejected", () => {
  const quiz = tashkent.places[0].quests.find((q) => q.type === "quiz");
  assert.equal(applyEvent(emptyState(), { ...complete(quiz), answer: (quiz.answer + 1) % 3 }).error, "WRONG_ANSWER");
});

test("finishing every quest completes the place with a bonus", () => {
  const place = tashkent.places[1];
  let state = emptyState(), last;
  for (const event of finishPlace(place)) { last = applyEvent(state, event); state = last.state; }
  assert.equal(last.placeCompleted, true);
  assert.equal(state.xp, placeXp(place));
  assert.ok(earnedBadges(state).includes("first-place"));
});

test("finishing a city gives the city bonus and unlocks the reward", () => {
  const events = samarkand.places.flatMap(finishPlace);
  const state = replay(events);
  const expected = samarkand.places.reduce((sum, p) => sum + placeXp(p), 0) + XP.cityComplete;
  assert.equal(state.xp, expected);
  assert.ok(earnedBadges(state).includes("samarkand"));
  const reward = applyEvent(state, { type: "reward", cityId: "samarkand", id: "evt-1", at: clock++ });
  assert.match(reward.state.rewards.samarkand.voucher, /^UZQ-SAM-[0-9A-Z]{6}$/);
  assert.equal(applyEvent(emptyState(), { type: "reward", cityId: "samarkand", id: "x", at: 1 }).error, "CITY_NOT_COMPLETED");
});

test("suggestions favour started places, interests and proximity", () => {
  const food = suggestions(emptyState(), tashkent, { interests: ["food"] });
  assert.ok(food[0].place.interests.includes("food"));
  assert.equal(food[0].reason.key, "reasonInterest");
  const started = applyEvent(emptyState(), { type: "start", placeId: "tv-tower", at: 1 }).state;
  assert.equal(suggestions(started, tashkent, { interests: ["food"] })[0].place.id, "tv-tower");
  const tower = tashkent.places.find((p) => p.id === "tv-tower");
  const near = suggestions(emptyState(), tashkent, { position: { lat: tower.lat, lng: tower.lng } });
  assert.ok(["tv-tower", "plov-center"].includes(near[0].place.id));
  const done = replay(finishPlace(tashkent.places[0]));
  assert.ok(!suggestions(done, tashkent).some((s) => s.place.id === tashkent.places[0].id));
});

test("daily quest is one per day and must match today's pick", () => {
  const at = Date.UTC(2026, 8, 19, 8);
  const daily = dailyFor(tashkent, dayKey(at));
  const done = applyEvent(emptyState(), { type: "daily", cityId: "tashkent", dailyId: daily.id, at });
  assert.equal(done.ok, true);
  assert.equal(applyEvent(done.state, { type: "daily", cityId: "tashkent", dailyId: daily.id, at: at + 1000 }).error, "DUPLICATE");
});

test("digital detox needs the full timer", () => {
  const at = Date.UTC(2026, 8, 19, 8);
  assert.equal(applyEvent(emptyState(), { type: "detox", startedAt: at - 5 * 60000, at }).error, "DETOX_TOO_SHORT");
  assert.equal(applyEvent(emptyState(), { type: "detox", startedAt: at - 21 * 60000, at }).ok, true);
});

test("levels progress with XP", () => {
  assert.equal(levelInfo(0).level, 1);
  assert.equal(levelInfo(200).level, 2);
  assert.equal(levelInfo(99999).progress, 1);
});
