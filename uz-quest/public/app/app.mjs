import { BADGES, CITIES, DETOX_MINUTES, GIFT_STAMPS, INTERESTS, OFFERS, QUEST_TYPES, RARITY, XP } from "../shared/content.mjs";
import {
  cityComplete, cityDoneCount, dailyFor, dayKey, distanceMeters, findCity, findPlace, findQuest, levelInfo, placeDone,
  placeProgress, placeXp, questRarity, questXp, storyNext, suggestions
} from "../shared/engine.mjs";
import { bindOtherCity, collectibleCard, couponTile, otherCityCard, placeCard } from "./components/cards.mjs";
import { clearToasts, confetti, countUp, toast } from "./core/feedback.mjs";
import { locate } from "./core/location.mjs";
import { go, onBeforeRender, registerScreens, render, route } from "./core/router.mjs";
import { AVATARS, city, saveProfile, session, testMode } from "./core/session.mjs";
import { KEYS, photos, store } from "./core/storage.mjs";
import { checkServer, dispatch } from "./core/sync.mjs";
import { $, all, art, errorText, esc, formatDate, formatDistance, gradient, L, pad, rarityChip, t } from "./core/ui.mjs";
import { renderGuide } from "./screens/guide.mjs";
import { renderPassport } from "./screens/passport.mjs";
import { renderProfile } from "./screens/profile.mjs";
import { renderCoupon, renderRewards } from "./screens/rewards.mjs";

// State used by a single screen; each moves into its screen's module in step 5.
let pendingPhotoQuest = null;
let detoxTimer = null;
let map = null;
let exploreFilter = "all";
const timelinePicks = {};
let hunt = null; // { questId, watchId, distance, message }

// ---------- onboarding ----------
function renderWelcome(screen, { step }) {
  const steps = `<div class="steps">${[0, 1, 2, 3].map((i) => `<i class="${i <= step ? "on" : ""}"></i>`).join("")}</div>`;
  const nav = (canNext, label = t("next")) => `<div class="footer"><button class="btn primary block" data-next ${canNext ? "" : "disabled"}>${label}</button>${step ? `<button class="link" data-back>${t("back")}</button>` : ""}</div>`;
  let body = "";
  if (step === 0) {
    body = `<div class="hero-emblem">🧭</div><h1>${t("obWelcomeTitle")}</h1><p class="lead">${t("obWelcomeText")}</p>
      <div class="lang-row">${[["uz", "O'zbekcha"], ["en", "English"], ["ru", "Русский"]].map(([code, name]) => `<button class="option ${session.profile.lang === code ? "on" : ""}" data-lang="${code}">${name}</button>`).join("")}</div>${nav(true)}`;
  } else if (step === 1) {
    body = `<h1>${t("obName")}</h1><input class="text-input" id="name" maxlength="24" autocomplete="nickname" placeholder="${t("obNamePlaceholder")}" value="${esc(session.profile.name)}" />
      <p class="lead">${t("obAvatar")}</p><div class="avatars">${AVATARS.map((a) => `<button class="option ${session.profile.avatar === a ? "on" : ""}" data-avatar="${a}">${a}</button>`).join("")}</div>${nav(true)}`;
  } else if (step === 2) {
    body = `<h1>${t("obCity")}</h1><div class="city-pick">${CITIES.map((c) => `<button class="city-card ${session.profile.cityId === c.id ? "on" : ""}" data-city="${c.id}"><img src="${c.image}" alt="" /><span><strong>${c.story.icon} ${esc(L(c.name))}</strong><small>${esc(L(c.story.title))} · ${c.places.length} ${t("statPlaces").toLowerCase()}</small></span></button>`).join("")}</div>${nav(true)}`;
  } else {
    body = `<h1>${t("obInterests")}</h1><p class="lead">${t("obInterestsHint")}</p>
      <div class="interest-grid">${INTERESTS.map((i) => `<button class="option ${session.profile.interests.includes(i.id) ? "on" : ""}" data-interest="${i.id}"><span>${i.icon}</span>${esc(L(i.name))}</button>`).join("")}</div>${nav(session.profile.interests.length > 0, t("letsGo"))}`;
  }
  screen.innerHTML = `<section class="onboard">${steps}${body}</section>`;
  all("[data-lang]", screen).forEach((b) => b.addEventListener("click", () => { session.profile.lang = b.dataset.lang; saveProfile(); render(); }));
  all("[data-avatar]", screen).forEach((b) => b.addEventListener("click", () => { session.profile.avatar = b.dataset.avatar; session.profile.name = $("#name").value; saveProfile(); render(); }));
  all("[data-city]", screen).forEach((b) => b.addEventListener("click", () => { session.profile.cityId = b.dataset.city; saveProfile(); render(); }));
  all("[data-interest]", screen).forEach((b) => b.addEventListener("click", () => {
    const id = b.dataset.interest;
    session.profile.interests = session.profile.interests.includes(id) ? session.profile.interests.filter((x) => x !== id) : [...session.profile.interests, id];
    saveProfile(); render();
  }));
  $("[data-back]", screen)?.addEventListener("click", () => go(`#/welcome/${step - 1}`));
  $("[data-next]", screen)?.addEventListener("click", () => {
    if (step === 1) session.profile.name = $("#name").value.trim();
    if (step === 3) { session.profile.done = true; saveProfile(); go("#/"); return; }
    saveProfile();
    go(`#/welcome/${step + 1}`);
  });
}

// ---------- story card (Home) ----------
function storyCard(c) {
  const next = storyNext(session.state, c);
  const done = cityDoneCount(session.state, c), total = c.places.length;
  const pieces = c.places.map((p) => `<i class="${placeDone(session.state, p) ? "on" : ""}" title="${esc(L(p.chapter))}">${placeDone(session.state, p) ? c.story.icon : ""}</i>`).join("");
  const body = next
    ? `<p class="story-chapter">${t("chapterOf", { n: next.index + 1, total })} · <b>${esc(L(next.place.chapter))}</b></p>
       <div class="clue"><small>🗝️ ${t("nextClue")}</small><p>${esc(L(next.place.clue))}</p></div>
       <a class="btn primary block" href="#/place/${next.place.id}">${t("continueStory")} →</a>`
    : `<p class="story-chapter"><b>✓ ${t("storyDone")}</b></p><div class="clue"><p>${esc(L(c.story.finale))}</p></div>`;
  return `<section class="card story-card">
    <div class="row"><span class="story-icon">${c.story.icon}</span><div><span class="tag">${t("storyLabel")}</span><h2>${esc(L(c.story.title))}</h2></div></div>
    ${done === 0 && next ? `<p class="story-intro">${esc(L(c.story.intro))}</p>` : ""}
    <div class="pieces" aria-label="${t("pieceProgress", { done, total, piece: L(c.story.piece) })}">${pieces}</div>
    ${body}</section>`;
}

// ---------- home ----------
function renderHome(screen) {
  const c = city(), info = levelInfo(session.state.xp);
  const suggested = suggestions(session.state, c, { interests: session.profile.interests, position: session.position });
  const story = storyNext(session.state, c);
  const active = suggested.find((s) => session.state.started[s.place.id] && s.place.id !== story?.place.id);
  const picks = suggested.filter((s) => s !== active && s.place.id !== story?.place.id).slice(0, 3);
  const today = dayKey(Date.now()), daily = dailyFor(c, today), dailyDone = session.state.dailies[today];
  const activeCoupons = OFFERS.filter((o) => session.state.coupons[o.id] && session.state.coupons[o.id].expiresAt > Date.now()).length;
  screen.innerHTML = `
    <header class="topline">
      <a class="avatar" href="#/profile" aria-label="${t("openProfile")}">${session.profile.avatar}</a>
      <div><h1>${t("hello", { name: esc(session.profile.name || t("explorer").toLowerCase()) })}</h1><p>${t("helloSub", { city: esc(L(c.name)) })}</p></div>
      <button class="chip city-switch" data-switch>📍 ${esc(L(c.name))} ⇄</button>
    </header>
    <section class="card level-card">
      <div class="row"><div class="level-badge">${info.level}</div><div><strong>${esc(L(info.title))}</strong><small>${info.ceil ? t("toNext", { n: info.ceil - session.state.xp, level: info.level + 1 }) : t("maxLevel")}</small></div><span class="xp-pill">${session.state.xp} XP</span></div>
      <div class="bar"><i style="width:${Math.round(info.progress * 100)}%"></i></div>
      ${activeCoupons ? `<a class="coupon-hint" href="#/rewards">🎁 ${t("wallet")} · ${t("couponsCount", { n: activeCoupons })} →</a>` : ""}
    </section>
    ${storyCard(c)}
    ${!story ? otherCityCard(c) : ""}
    ${active ? `<p class="label">${t("active")}</p>
      <a class="card active-card" href="#/place/${active.place.id}">${art(active.place)}<div><h3>${esc(L(active.place.name))}</h3>
        <span class="faint">${t("adventureProgress", { done: placeProgress(session.state, active.place), total: active.place.quests.length })}</span>
        <div class="bar"><i style="width:${(placeProgress(session.state, active.place) / active.place.quests.length) * 100}%"></i></div></div></a>` : ""}
    ${picks.length ? `<div class="section-head"><h2>${t("suggested")}</h2><a href="#/explore">${t("seeAll")} →</a></div>${picks.map((s) => placeCard(s.place, s.reason)).join("")}` : ""}
    <div class="side-cards" style="margin-top:18px">
      <article class="card mini-card daily"><span class="tag">${t("dailyLabel")}</span><h3>${esc(L(daily.title))}</h3>
        <p>${esc(dailyDone ? t("dailyDone") : L(daily.prompt))}</p>
        ${dailyDone ? `<span class="done-line">✓ ${t("questDone")}</span>` : `<button class="btn primary small" data-daily>${t("dailyButton", { n: XP.daily })}</button>`}</article>
      <article class="card mini-card detox" id="detox"></article>
    </div>`;
  bindOtherCity(screen);
  $("[data-switch]", screen).addEventListener("click", () => {
    const index = CITIES.findIndex((x) => x.id === c.id);
    session.profile.cityId = CITIES[(index + 1) % CITIES.length].id;
    saveProfile(); render();
  });
  $("[data-daily]", screen)?.addEventListener("click", () => { dispatch({ type: "daily", cityId: c.id, dailyId: daily.id }); render(); });
  renderDetox($("#detox", screen));
}

function renderDetox(card) {
  clearInterval(detoxTimer);
  if (session.state.detox[dayKey(Date.now())]) {
    card.innerHTML = `<span class="tag">${t("detoxLabel")}</span><h3>🌙</h3><p>${t("detoxDone")}</p>`;
    return;
  }
  const startedAt = store.get(KEYS.detox, null);
  if (!startedAt) {
    card.innerHTML = `<span class="tag">${t("detoxLabel")}</span><h3>${t("detoxTitle", { n: DETOX_MINUTES })}</h3><p>${t("detoxText", { xp: XP.detox })}</p><button class="btn ghost small" data-detox>${t("detoxStart")}</button>`;
    $("[data-detox]", card).addEventListener("click", () => { store.set(KEYS.detox, Date.now()); renderDetox(card); });
    return;
  }
  card.innerHTML = `<span class="tag">${t("detoxLabel")}</span><div class="timer" id="detox-time"></div><p>${t("detoxText", { xp: XP.detox })}</p><button class="link" data-cancel>${t("detoxCancel")}</button>`;
  $("[data-cancel]", card).addEventListener("click", () => { store.remove(KEYS.detox); renderDetox(card); });
  const tick = () => {
    const left = startedAt + DETOX_MINUTES * 60000 - Date.now();
    if (left > 0) { $("#detox-time", card).textContent = `${pad(Math.floor(left / 60000))}:${pad(Math.floor((left % 60000) / 1000))}`; return; }
    clearInterval(detoxTimer);
    card.innerHTML = `<span class="tag">${t("detoxLabel")}</span><div class="timer">00:00</div><p>${t("detoxText", { xp: XP.detox })}</p><button class="btn primary small" data-claim>${t("detoxClaim", { xp: XP.detox })}</button>`;
    $("[data-claim]", card).addEventListener("click", () => { dispatch({ type: "detox", startedAt }); store.remove(KEYS.detox); render(); });
  };
  tick();
  detoxTimer = setInterval(tick, 1000);
}

// ---------- explore ----------
function renderExplore(screen, { id: mode }) {
  const c = city();
  const places = c.places.filter((p) => exploreFilter === "all" || p.interests.includes(exploreFilter));
  const ranked = new Map(suggestions(session.state, c, { interests: session.profile.interests, position: session.position }).map((s) => [s.place.id, s]));
  screen.innerHTML = `
    <div class="row between"><h1 class="page-title">${t("exploreTitle", { city: esc(L(c.name)) })}</h1>
      <div class="toggle"><button class="${mode !== "map" ? "on" : ""}" data-mode="list">${t("listView")}</button><button class="${mode === "map" ? "on" : ""}" data-mode="map">${t("mapView")}</button></div></div>
    <div class="filters"><button class="option ${exploreFilter === "all" ? "on" : ""}" data-filter="all">${t("all")}</button>${INTERESTS.map((i) => `<button class="option ${exploreFilter === i.id ? "on" : ""}" data-filter="${i.id}">${i.icon} ${esc(L(i.name))}</button>`).join("")}</div>
    ${mode === "map" ? `<div class="map" id="map"></div>` : `<div class="compact-list">${places.map((p) => placeCard(p, ranked.get(p.id)?.reason)).join("")}</div>`}`;
  all("[data-mode]", screen).forEach((b) => b.addEventListener("click", () => go(b.dataset.mode === "map" ? "#/explore/map" : "#/explore")));
  all("[data-filter]", screen).forEach((b) => b.addEventListener("click", () => { exploreFilter = b.dataset.filter; render(); }));
  if (mode === "map") drawMap(places);
}

function drawMap(places) {
  const box = $("#map");
  if (!window.L) {
    box.innerHTML = `<div class="compact-list" style="padding:12px">${places.map((p) => placeCard(p)).join("")}</div>`;
    box.style.height = "auto";
    return;
  }
  map = window.L.map(box, { zoomControl: false });
  window.L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(map);
  window.L.control.zoom({ position: "bottomright" }).addTo(map);
  window.L.polyline(places.map((p) => [p.lat, p.lng]), { color: "#f7c948", weight: 3, dashArray: "6 8", opacity: .8 }).addTo(map);
  places.forEach((p) => {
    const index = findPlace(p.id).index + 1;
    const icon = window.L.divIcon({ className: "", html: `<div class="map-pin ${placeDone(session.state, p) ? "done" : ""}" style="background:${gradient(p)}">${placeDone(session.state, p) ? "✅" : p.emoji}<b>${index}</b></div>`, iconSize: [42, 42], iconAnchor: [21, 21] });
    window.L.marker([p.lat, p.lng], { icon }).bindPopup(`<b>${index}. ${esc(L(p.name))}</b><br>${esc(L(p.chapter))}<br><a href="#/place/${p.id}">${t("quests", { n: p.quests.length })} →</a>`).addTo(map);
  });
  if (session.position) window.L.circleMarker([session.position.lat, session.position.lng], { radius: 8, color: "#fff", weight: 3, fillColor: "#ff6b35", fillOpacity: 1 }).addTo(map);
  if (places.length) map.fitBounds(places.map((p) => [p.lat, p.lng]), { padding: [40, 40] });
}

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

// ---------- chapter complete ----------
function renderDone(screen, { id }) {
  const found = findPlace(id);
  if (!found || !placeDone(session.state, found.place)) return go(found ? `#/place/${id}` : "#/");
  const { city: c, place, index } = found;
  const fresh = session.lastCompletion?.placeId === place.id ? session.lastCompletion : null;
  const gained = placeXp(place) + (fresh?.cityCompleted ? XP.cityComplete : 0);
  const storyAfter = storyNext(session.state, c);
  const next = suggestions(session.state, c, { interests: session.profile.interests, position: session.position })[0];
  const cityWon = cityComplete(session.state, c);
  clearToasts();
  const highlights = [
    ...(fresh?.levelUp ? [{ icon: "⬆️", name: t("levelUp", { title: L(fresh.levelUp.title) }), desc: `Lv ${fresh.levelUp.level}` }] : []),
    ...(fresh?.newGifts ?? []).map((gid) => { const g = GIFT_STAMPS.find((x) => x.id === gid); return { icon: g.icon, name: `${t("giftStamp")}: ${L(g.name)}`, desc: L(g.desc), gift: true }; }),
    ...(fresh?.newBadges ?? []).map((bid) => { const b = BADGES.find((x) => x.id === bid); return { icon: b.icon, name: L(b.name), desc: L(b.desc) }; })
  ];
  const coupons = (fresh?.coupons ?? []).map((oid) => OFFERS.find((o) => o.id === oid));
  screen.innerHTML = `
    <section class="complete">
      <div class="stamp" style="background:radial-gradient(circle,${place.colors[0]},${place.colors[1]})"><div class="inner"><span>${place.emoji}</span><b>${esc(L(place.name))}</b><small>${esc(L(c.name)).toUpperCase()} · ${formatDate(session.state.places[place.id].at)}</small></div></div>
      <h1>${t("chapterComplete")}</h1>
      <p>${t("chapterLabel", { n: index + 1 })} · ${esc(L(place.chapter))}</p>
      <div class="xp-burst"><strong id="xp-count">+0</strong><small>${t("earned")}</small></div>
      <div class="piece-found"><span>${c.story.icon}</span>${t("pieceFound", { piece: esc(L(c.story.piece)) })} · ${t("pieceProgress", { done: cityDoneCount(session.state, c), total: c.places.length, piece: esc(L(c.story.piece)) })}</div>
      <p class="label" style="text-align:left">🃏 ${t("cardUnlocked")}</p>
      ${collectibleCard(place, { big: true })}
      ${coupons.length ? `<p class="label" style="text-align:left">🎁 ${t("rewardsUnlocked")}</p><div class="coupon-list">${coupons.map(couponTile).join("")}</div>` : ""}
      ${highlights.length ? `<div class="new-badges">${highlights.map((h) => `<div class="card ${h.gift ? "gift" : ""}"><span>${h.icon}</span><div><b>${esc(h.name)}</b><small>${esc(h.desc)}</small></div></div>`).join("")}</div>` : ""}
      ${cityWon ? `<div class="card finale"><b>${c.story.icon} ${esc(L(c.story.title))}</b><p>${esc(L(c.story.finale))}</p></div>${otherCityCard(c)}` : ""}
      ${storyAfter ? `<div class="card clue-card next-clue"><p class="label">🗝️ ${t("nextClue")} · ${t("chapterLabel", { n: storyAfter.index + 1 })}</p><p>${esc(L(storyAfter.place.clue))}</p></div>` : ""}
      <div class="actions">
        ${storyAfter ? `<a class="btn primary block" href="#/place/${storyAfter.place.id}">${t("continueStory")} →</a>` : next ? `<a class="btn primary block" href="#/place/${next.place.id}">${t("goNext")} →</a>` : ""}
        ${coupons.length ? `<a class="btn ghost block" href="#/rewards">🎁 ${t("wallet")}</a>` : ""}
        <a class="btn ghost block" href="#/passport">🛂 ${t("viewPassport")}</a>
        <a class="link" href="#/">${t("backHome")}</a>
      </div>
    </section>`;
  bindOtherCity(screen);
  if (fresh) confetti();
  countUp($("#xp-count", screen), gained);
}

// ---------- city conquered ----------
function renderCity(screen, { id }) {
  const c = findCity(id) ?? city();
  if (!cityComplete(session.state, c)) return go("#/");
  const reward = session.state.rewards[c.id];
  const cityXp = c.places.reduce((sum, p) => sum + placeXp(p), 0) + XP.cityComplete;
  const finishedAt = Math.max(...c.places.map((p) => session.state.places[p.id].at));
  screen.innerHTML = `
    <section class="complete">
      <a class="back" href="#/" style="position:static;display:grid;margin-bottom:6px">←</a>
      <div class="certificate">
        <div class="medal"><span>🏆</span><b>${c.short}</b></div>
        <h2>${t("cityTitle", { city: esc(L(c.name)) })}</h2>
        <p class="muted">${esc(L(c.story.finale))}</p>
        <p class="who">${session.profile.avatar} ${esc(session.profile.name || t("explorer"))}</p>
        <p class="faint">${formatDate(finishedAt)} · ${cityXp} XP</p>
        <ul>${c.places.map((p, i) => `<li>✅ ${i + 1}. ${p.emoji} ${esc(L(p.chapter))}</li>`).join("")}</ul>
      </div>
      <section class="card" style="margin-top:16px">
        <p class="label" style="margin-top:0">${t("rewardsTitle")} · ${esc(L(c.reward.name))}</p>
        ${reward ? `<p class="muted">${t("voucher")}</p><div class="voucher">${reward.voucher}</div><p class="muted">${t("voucherHint", { prize: esc(L(c.reward.prize)) })}</p>` : `<button class="btn primary block" data-claim>🎁 ${t("claimReward")}</button>`}
      </section>
      <div class="actions">
        ${navigator.share ? `<button class="btn ghost block" data-share>↗ ${t("share")}</button>` : ""}
        <a class="btn ghost block" href="#/rewards">🎁 ${t("wallet")}</a>
        <a class="link" href="#/">${t("backHome")}</a>
      </div>
    </section>`;
  if (!reward) confetti();
  $("[data-claim]", screen)?.addEventListener("click", () => { dispatch({ type: "reward", cityId: c.id }); render(); });
  $("[data-share]", screen)?.addEventListener("click", () => navigator.share({ title: "UzQuest", text: `${t("cityTitle", { city: L(c.name) })} ${cityXp} XP 🏆`, url: location.origin }).catch(() => undefined));
}

// ---------- boot ----------
registerScreens({ welcome: renderWelcome, home: renderHome, explore: renderExplore, place: renderPlace, done: renderDone, city: renderCity, passport: renderPassport, rewards: renderRewards, coupon: renderCoupon, guide: renderGuide, profile: renderProfile });
// Leaving a screen stops what it started.
onBeforeRender(() => clearInterval(detoxTimer));
onBeforeRender(() => { if (map) { map.remove(); map = null; } });
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
