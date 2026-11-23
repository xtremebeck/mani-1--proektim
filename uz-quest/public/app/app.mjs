import { QUEST_TYPES, RARITY } from "../shared/content.mjs";
import {
  distanceMeters, findPlace, findQuest, placeDone, placeProgress, placeXp, questRarity, questXp
} from "../shared/engine.mjs";
import { toast } from "./core/feedback.mjs";
import { locate } from "./core/location.mjs";
import { go, onBeforeRender, registerScreens, render, route } from "./core/router.mjs";
import { saveProfile, session, testMode } from "./core/session.mjs";
import { photos } from "./core/storage.mjs";
import { checkServer, dispatch } from "./core/sync.mjs";
import { $, all, errorText, esc, formatDistance, gradient, L, rarityChip, t } from "./core/ui.mjs";
import { renderCity } from "./screens/city.mjs";
import { renderDone } from "./screens/done.mjs";
import { renderExplore } from "./screens/explore.mjs";
import { renderGuide } from "./screens/guide.mjs";
import { renderHome } from "./screens/home.mjs";
import { renderPassport } from "./screens/passport.mjs";
import { renderProfile } from "./screens/profile.mjs";
import { renderCoupon, renderRewards } from "./screens/rewards.mjs";
import { renderWelcome } from "./screens/welcome.mjs";

// State used by a single screen; each moves into its screen's module in step 5.
let pendingPhotoQuest = null;
const timelinePicks = {};
let hunt = null; // { questId, watchId, distance, message }

// ---------- place (chapter) ----------
function renderPlace(screen, { id }) {
  const found = findPlace(id);
  if (!found) return go("#/explore");
  const { city: c, place, index } = found;
  if (c.id !== session.profile.cityId) { session.profile.cityId = c.id; saveProfile(); }
  const started = Boolean(session.state.started[place.id]), done = placeDone(session.state, place);
  const progress = placeProgress(session.state, place);
  screen.innerHTML = `
    <div class="place-hero" style="background:${gradient(place)}"><a class="back" href="#/explore">←</a><span class="big">${place.emoji}</span></div>
    <section class="place-head">
      <span class="chapter-tag">${c.story.icon} ${t("chapterLabel", { n: index + 1 })} · ${esc(L(c.story.title))}</span>
      <h1>${esc(L(place.chapter))}</h1>
      <p class="place-name">📍 ${esc(L(place.name))}</p>
      <div class="row" style="flex-wrap:wrap;gap:6px"><span class="chip">⏱ ${t("minutes", { n: place.minutes })}</span><span class="chip">🎯 ${t("quests", { n: place.quests.length })}</span><span class="chip gold">⭐ ${t("xp", { n: placeXp(place) })}</span>${done ? `<span class="chip green">✓ ${t("done")}</span>` : ""}</div>
      ${started || done ? `<div class="progress-block"><div class="row between"><span>${t("adventureProgress", { done: progress, total: place.quests.length })}</span><span class="faint">${Math.round((progress / place.quests.length) * 100)}%</span></div><div class="bar"><i style="width:${(progress / place.quests.length) * 100}%"></i></div></div>` : ""}
    </section>
    <section class="card clue-card"><p class="label">🗝️ ${t("howToFind")}</p><p>${esc(L(place.clue))}</p>
      <div class="direction"><a href="https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}" target="_blank" rel="noopener">Google Maps ↗</a><a href="https://yandex.com/maps/?rtext=~${place.lat},${place.lng}&rtt=pd" target="_blank" rel="noopener">Yandex ↗</a></div></section>
    <section class="card info"><p class="label">${t("story")}</p><p>${esc(L(place.story))}</p><p class="tip">💡 ${esc(L(place.tip))}</p></section>
    <p class="label">${t("yourQuests")}</p>
    <div id="quests">${place.quests.map((q) => questCard(q, started || done)).join("")}</div>
    ${!started && !done ? `<div style="height:70px"></div><div class="sticky-cta"><button class="btn primary block" data-start>🚀 ${t("startAdventure")}</button></div>` : ""}
    ${done ? `<button class="btn ghost block" style="margin-top:8px" data-again>🏅 ${t("chapterComplete")}</button>` : ""}`;
  bindPlace(screen, place);
  loadQuestPhotos(place);
}

function questCard(quest, unlocked) {
  const done = session.state.quests[quest.id];
  const type = QUEST_TYPES[quest.type];
  const rarity = questRarity(quest);
  let body = "";
  if (quest.type === "meet") {
    body = `<div class="person"><span>${quest.person.emoji}</span><div><b>${esc(L(quest.person.name))}</b><small>${t("findThem")}: ${esc(L(quest.person.where))}</small></div></div>`;
  }
  let actions = "";
  if (done) {
    actions = `<span class="done-line">✓ ${t("questDone")}</span><img class="photo-thumb" data-thumb="${quest.id}" hidden alt="" />`;
    if (quest.type === "meet") actions += `<blockquote class="letter"><small>✉️ ${t("messageFrom", { name: esc(L(quest.person.name)) })}</small>${esc(L(quest.reveal))}</blockquote>`;
  } else if (quest.type === "quiz") {
    actions = `<div class="quiz"><small>${t("chooseAnswer")}</small>${quest.options.map((o, i) => `<button data-answer="${i}" data-quest="${quest.id}">${esc(L(o))}</button>`).join("")}</div>`;
  } else if (quest.type === "riddle") {
    actions = `<form class="answer-form" data-riddle="${quest.id}"><input name="a" autocomplete="off" placeholder="${t("answerPlaceholder")}" required /><button class="btn primary small">${t("check")}</button></form>`;
  } else if (quest.type === "meet") {
    actions = `<form class="answer-form" data-meet="${quest.id}"><input name="a" autocomplete="off" placeholder="${t("codePlaceholder")}" required /><button class="btn primary small">${t("confirm")}</button></form>
      ${testMode() ? `<small class="test-hint">🧪 ${t("testHint", { code: esc(quest.code) })}</small>` : ""}`;
  } else if (quest.type === "timeline") {
    const picks = timelinePicks[quest.id] ?? [];
    actions = `<div class="timeline"><small>${t("timelineHint")}</small>${quest.items.map((item, i) => {
      const pos = picks.indexOf(i);
      return `<button data-pick="${i}" data-quest="${quest.id}" class="${pos >= 0 ? "picked" : ""}"><b>${pos >= 0 ? pos + 1 : ""}</b>${esc(L(item))}</button>`;
    }).join("")}</div>`;
  } else if (quest.type === "hunt") {
    const active = hunt?.questId === quest.id;
    actions = active
      ? `<div class="hunt-panel ${hunt.heat ?? ""}"><strong id="hunt-status">${esc(hunt.message ?? t("huntSearching"))}</strong><div class="radar"><i></i></div></div>`
      : `<button class="btn primary small" data-hunt="${quest.id}">🧭 ${t("huntStart")}</button>`;
    if (testMode()) actions += `<button class="link" data-simulate="${quest.id}">🧪 ${t("huntSimulate")}</button>`;
  } else if (quest.type === "photo") {
    actions = `<button class="btn primary small" data-photo="${quest.id}">📷 ${t("takePhoto")}</button>${testMode() ? `<button class="link" data-skip="${quest.id}">🧪 ${t("skipPhoto")}</button>` : ""}`;
  } else {
    actions = `<button class="btn primary small" data-complete="${quest.id}">✓ ${t("markComplete")}</button>`;
  }
  return `<article class="quest ${done ? "done" : ""} ${unlocked ? "" : "locked"} r-${rarity}" id="q-${quest.id}" style="--c:${RARITY[rarity].color}">
    <div class="head"><div class="icon">${done ? "✓" : type.icon}</div><div><div class="type">${esc(L(type.label))} ${rarityChip(rarity)}</div><h3>${esc(L(quest.title))}</h3></div><span class="xp">+${questXp(quest)}</span></div>
    ${body}<p>${esc(L(quest.prompt))}</p><div class="actions">${actions}</div></article>`;
}

function bindPlace(screen, place) {
  $("[data-start]", screen)?.addEventListener("click", () => { dispatch({ type: "start", placeId: place.id }); render(); document.getElementById("quests")?.scrollIntoView({ behavior: "smooth", block: "start" }); });
  $("[data-again]", screen)?.addEventListener("click", () => { session.lastCompletion = null; go(`#/done/${place.id}`); });
  all("[data-complete]", screen).forEach((b) => b.addEventListener("click", () => completeQuest(place, { questId: b.dataset.complete })));
  all("[data-skip]", screen).forEach((b) => b.addEventListener("click", () => completeQuest(place, { questId: b.dataset.skip, test: true })));
  all("[data-simulate]", screen).forEach((b) => b.addEventListener("click", () => { stopHunt(); completeQuest(place, { questId: b.dataset.simulate, test: true }); }));
  all("[data-photo]", screen).forEach((b) => b.addEventListener("click", () => { pendingPhotoQuest = { place, questId: b.dataset.photo }; $("#photo-input").click(); }));
  all("[data-answer]", screen).forEach((b) => b.addEventListener("click", () => {
    const result = completeQuest(place, { questId: b.dataset.quest, answer: Number(b.dataset.answer) });
    if (result?.error === "WRONG_ANSWER") { b.classList.add("wrong"); b.disabled = true; toast(t("wrong"), "error"); }
  }));
  const bindForm = (attr, field, wrongKey) => all(`[data-${attr}]`, screen).forEach((form) => form.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = form.elements.a;
    const result = completeQuest(place, { questId: form.dataset[attr], [field]: input.value });
    if (result && !result.ok) { input.classList.add("wrong"); input.select(); toast(t(wrongKey), "error"); setTimeout(() => input.classList.remove("wrong"), 500); }
  }));
  bindForm("riddle", "text", "wrong");
  bindForm("meet", "code", "wrongCode");
  all("[data-pick]", screen).forEach((b) => b.addEventListener("click", () => {
    const questId = b.dataset.quest, i = Number(b.dataset.pick);
    const quest = findQuest(questId).quest;
    const picks = timelinePicks[questId] ??= [];
    if (picks.includes(i)) picks.splice(picks.indexOf(i), 1); else picks.push(i);
    if (picks.length === quest.items.length) {
      const result = completeQuest(place, { questId, order: [...picks] });
      if (!result.ok) { delete timelinePicks[questId]; toast(t("timelineWrong"), "error"); rerenderPlace(questId, "shake"); }
      return;
    }
    rerenderPlace(questId);
  }));
  all("[data-hunt]", screen).forEach((b) => b.addEventListener("click", () => startHunt(place, b.dataset.hunt)));
}

function rerenderPlace(questId, effect = "") {
  const scrollY = window.scrollY;
  render();
  window.scrollTo(0, scrollY);
  if (effect) document.getElementById(`q-${questId}`)?.classList.add(effect);
}

function completeQuest(place, fields) {
  const result = dispatch({ type: "quest", ...fields });
  if (!result.ok) {
    if (!["WRONG_ANSWER", "WRONG_CODE", "WRONG_ORDER"].includes(result.error)) toast(result.error === "TOO_FAR" ? t("tooFar") : result.error === "PHOTO_REQUIRED" ? t("photoRequired") : errorText(result.error), "error");
    return result;
  }
  if (result.placeCompleted) { go(`#/done/${place.id}`); return result; }
  rerenderPlace(fields.questId, "pop");
  return result;
}

// ---------- treasure hunt (hot / cold) ----------
function startHunt(place, questId) {
  stopHunt();
  const quest = findQuest(questId).quest;
  if (!navigator.geolocation) { toast(t("huntNoGps"), "error"); return; }
  hunt = { questId, message: t("huntSearching") };
  rerenderPlace(questId);
  hunt.watchId = navigator.geolocation.watchPosition((pos) => {
    if (!hunt || hunt.questId !== questId) return;
    const { latitude: lat, longitude: lng, accuracy } = pos.coords;
    const d = distanceMeters(lat, lng, quest.lat, quest.lng);
    if (d <= quest.radius + Math.min(accuracy, 50)) {
      stopHunt();
      completeQuest(place, { questId, lat, lng, accuracy });
      return;
    }
    hunt.heat = d < 250 ? "hot" : d < 1000 ? "warm" : "cold";
    hunt.message = t(hunt.heat === "hot" ? "huntHot" : hunt.heat === "warm" ? "huntWarm" : "huntCold", { d: formatDistance(d) });
    const panel = document.querySelector(".hunt-panel");
    if (panel) { panel.className = `hunt-panel ${hunt.heat}`; $("#hunt-status").textContent = hunt.message; }
  }, (error) => {
    if (!hunt || hunt.questId !== questId) return;
    // Only a refused permission ends the hunt. A lost signal (tunnel, indoors) or a slow fix
    // is temporary and the watch keeps running, so show "searching" until the next position.
    if (error.code === error.PERMISSION_DENIED) { toast(t("huntNoGps"), "error"); stopHunt(); rerenderPlace(questId); return; }
    hunt.heat = null;
    hunt.message = t("huntSearching");
    const panel = document.querySelector(".hunt-panel");
    if (panel) { panel.className = "hunt-panel"; $("#hunt-status").textContent = hunt.message; }
  }, { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 });
}

function stopHunt() {
  if (hunt?.watchId != null) navigator.geolocation.clearWatch(hunt.watchId);
  hunt = null;
}

// ---------- photos ----------
async function loadQuestPhotos(place) {
  const shots = await photos.all();
  for (const shot of shots) {
    const img = document.querySelector(`[data-thumb="${shot.questId}"]`);
    if (img && place.quests.some((q) => q.id === shot.questId)) { img.src = shot.dataUrl; img.hidden = false; }
  }
}

async function handlePhoto(file) {
  const pending = pendingPhotoQuest;
  pendingPhotoQuest = null;
  if (!file || !pending) return;
  const dataUrl = await downscale(file, 900);
  await photos.put({ questId: pending.questId, placeId: pending.place.id, dataUrl, at: Date.now() });
  completeQuest(pending.place, { questId: pending.questId, hasPhoto: true });
}

async function downscale(file, maxSide) {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return new Promise((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsDataURL(file); });
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.74);
}

// ---------- boot ----------
registerScreens({ welcome: renderWelcome, home: renderHome, explore: renderExplore, place: renderPlace, done: renderDone, city: renderCity, passport: renderPassport, rewards: renderRewards, coupon: renderCoupon, guide: renderGuide, profile: renderProfile });
// Leaving a screen stops what it started.
onBeforeRender((r) => { if (hunt && !(r.name === "place" && findQuest(hunt.questId)?.place.id === r.id)) stopHunt(); });

window.addEventListener("hashchange", () => { render(); window.scrollTo(0, 0); });
window.addEventListener("online", () => { render(); checkServer(); });
window.addEventListener("offline", render);
$("#photo-input").addEventListener("change", (e) => { handlePhoto(e.target.files[0]); e.target.value = ""; });
document.addEventListener("visibilitychange", () => { if (!document.hidden && route().name === "home") render(); });

render();
checkServer();
locate(false);
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("../sw.js", { scope: "../" }).catch(() => undefined);
