import { BADGES, CITIES, DETOX_MINUTES, GIFT_STAMPS, INTERESTS, LEVELS, OFFERS, QUEST_TYPES, RARITY, XP } from "../shared/content.mjs";
import {
  applyEvent, cityComplete, cityDoneCount, collectedCards, dailyFor, dayKey, distanceMeters, earnedBadges, earnedGiftStamps,
  emptyState, findCity, findPlace, findQuest, levelInfo, offerUnlocked, placeDone, placeProgress, placeXp, questRarity, questXp,
  storyNext, suggestions
} from "../shared/engine.mjs";
import { translate } from "./i18n.mjs";
import { localGuideReply } from "./local-guide.mjs";

// ---------- storage ----------
const KEYS = { state: "uzq3-state", profile: "uzq2-profile", outbox: "uzq3-outbox", device: "uzq2-device", detox: "uzq2-detox" };
const store = {
  get(key, fallback) { try { const raw = localStorage.getItem(key); return raw == null ? fallback : JSON.parse(raw); } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full or blocked */ } },
  remove(key) { try { localStorage.removeItem(key); } catch { /* ignore */ } }
};

const photos = (() => {
  let dbPromise = null;
  const open = () => dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open("uzquest-photos", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("photos", { keyPath: "questId" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const run = async (mode, operation) => {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("photos", mode);
      const request = operation(tx.objectStore("photos"));
      tx.oncomplete = () => resolve(request?.result);
      tx.onerror = () => reject(tx.error);
    });
  };
  return {
    put: (record) => run("readwrite", (s) => s.put(record)).catch(() => undefined),
    all: () => run("readonly", (s) => s.getAll()).catch(() => []),
    clear: () => run("readwrite", (s) => s.clear()).catch(() => undefined)
  };
})();

const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
  const r = (Math.random() * 16) | 0; return (c === "x" ? r : (r & 3) | 8).toString(16);
}));

// ---------- state ----------
const guessLang = () => { const nav = (navigator.language || "en").toLowerCase(); return nav.startsWith("ru") ? "ru" : nav.startsWith("uz") ? "uz" : "en"; };
const AVATARS = ["🧭", "🐫", "🦅", "🧕", "🧔", "👩‍🚀", "🦊", "🐯"];
let profile = store.get(KEYS.profile, null) ?? { name: "", avatar: AVATARS[0], lang: guessLang(), cityId: "tashkent", interests: [], done: false };
profile.testMode ??= true; // MVP default: lets people try GPS hunts and photo spots from home
let state = store.get(KEYS.state, null);
if (!state || state.v !== 3) state = emptyState();
let deviceId = store.get(KEYS.device, null);
if (!deviceId) { deviceId = uuid(); store.set(KEYS.device, deviceId); }

const server = { online: false, guide: false };
const chat = [];
let position = null;
let lastCompletion = null;
let pendingPhotoQuest = null;
let detoxTimer = null;
let map = null;
let exploreFilter = "all";
const timelinePicks = {};
let hunt = null; // { questId, watchId, distance, message }

const $ = (selector, root = document) => root.querySelector(selector);
const all = (selector, root = document) => [...root.querySelectorAll(selector)];
const t = (key, vars) => translate(profile.lang, key, vars);
const L = (value) => value?.[profile.lang] ?? value?.en ?? "";
const city = () => findCity(profile.cityId) ?? CITIES[0];
const esc = (text) => String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad = (n) => String(n).padStart(2, "0");
const formatDistance = (m) => (m < 1000 ? `${Math.round(m / 5) * 5} m` : `${(m / 1000).toFixed(1)} km`);
const formatDate = (ms) => new Date(ms).toLocaleDateString(profile.lang === "uz" ? "uz-UZ" : profile.lang);
const saveProfile = () => store.set(KEYS.profile, profile);
const gradient = (place) => `linear-gradient(135deg,${place.colors[0]},${place.colors[1]})`;
const art = (place, cls = "art") => `<div class="${cls}" style="background:${gradient(place)}">${place.emoji}</div>`;
const interestName = (id) => L(INTERESTS.find((item) => item.id === id)?.name);
const apiUrl = (path) => new URL(`../api/v1/${path}`, location.href).href;
const rarityChip = (rarity) => `<span class="rarity" style="--c:${RARITY[rarity].color}">${esc(L(RARITY[rarity].name))}</span>`;
const errorText = (code) => (translate(profile.lang, `err_${code}`) !== `err_${code}` ? t(`err_${code}`) : t("err_generic"));

// ---------- events & sync ----------
function dispatch(partial) {
  const event = { id: uuid(), at: Date.now(), ...partial };
  const before = state;
  const result = applyEvent(state, event);
  if (!result.ok) return result;
  state = result.state;
  store.set(KEYS.state, state);
  store.set(KEYS.outbox, [...store.get(KEYS.outbox, []), event]);
  const diff = (fn) => { const old = new Set(fn(before)); return fn(state).filter((id) => !old.has(id)); };
  const newBadges = diff(earnedBadges), newGifts = diff(earnedGiftStamps);
  const oldLevel = levelInfo(before.xp).level, newLevel = levelInfo(state.xp);
  const leveledUp = newLevel.level > oldLevel;
  if (result.placeCompleted) {
    // The chapter-complete screen celebrates everything at once, so skip toasts.
    const placeId = findQuest(event.questId)?.place.id;
    lastCompletion = { placeId, newBadges, newGifts, coupons: result.coupons, levelUp: leveledUp ? newLevel : null, cityCompleted: result.cityCompleted };
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

async function flush() {
  if (!server.online || !navigator.onLine) return;
  const outbox = store.get(KEYS.outbox, []);
  if (!outbox.length) return;
  try {
    const response = await fetch(apiUrl("sync"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deviceId, lang: profile.lang, events: outbox }) });
    if (!response.ok) return;
    const data = await response.json();
    const settled = new Set([...data.accepted, ...data.rejected.map((item) => item.id)]);
    store.set(KEYS.outbox, store.get(KEYS.outbox, []).filter((event) => !settled.has(event.id)));
  } catch { /* retry later */ }
}

async function checkServer() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const response = await fetch(apiUrl("health"), { cache: "no-store", signal: controller.signal });
    clearTimeout(timer);
    const data = response.ok ? await response.json() : null;
    server.online = data?.service === "uzquest-api";
    server.guide = Boolean(data?.guide);
  } catch { server.online = false; server.guide = false; }
  flush();
}

async function locate(ask = false) {
  if (!navigator.geolocation) return;
  if (!ask) {
    const permission = await navigator.permissions?.query({ name: "geolocation" }).catch(() => null);
    if (permission?.state !== "granted") return;
  }
  navigator.geolocation.getCurrentPosition((pos) => {
    position = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    if (["home", "explore"].includes(route().name)) render();
  }, () => undefined, { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 });
}

// ---------- feedback ----------
function raiseToasts() {
  const box = $("#toasts");
  if (!box.showPopover || !box.children.length) return;
  try { box.hidePopover(); } catch { /* not open */ }
  box.showPopover();
}

function clearToasts() {
  const box = $("#toasts");
  box.replaceChildren();
  try { box.hidePopover?.(); } catch { /* not open */ }
}

function toast(text, kind = "") {
  const box = $("#toasts");
  const node = document.createElement("div");
  node.className = `toast ${kind}`;
  node.textContent = text;
  box.append(node);
  raiseToasts();
  setTimeout(() => node.classList.add("leaving"), 2600);
  setTimeout(() => { node.remove(); if (!box.children.length) try { box.hidePopover?.(); } catch { /* ignore */ } }, 3100);
}

function confetti() {
  const layer = document.createElement("div");
  layer.className = "confetti";
  const colors = ["#ff6b35", "#f7c948", "#2ec4b6", "#7c3aed", "#22c55e", "#fff"];
  layer.innerHTML = Array.from({ length: 70 }, () => `<i style="left:${Math.random() * 100}%;background:${colors[Math.floor(Math.random() * colors.length)]};animation-duration:${1.8 + Math.random() * 1.8}s;animation-delay:${Math.random() * .6}s;transform:rotate(${Math.random() * 360}deg)"></i>`).join("");
  document.body.append(layer);
  setTimeout(() => layer.remove(), 4500);
}

// ---------- router ----------
function route() {
  const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (!profile.done) return { name: "welcome", step: Number(parts[0] === "welcome" ? parts[1] : 0) || 0 };
  const [name = "home", id] = parts;
  return { name, id };
}
const go = (hash) => { if (location.hash === hash) render(); else location.hash = hash; };

function render() {
  clearInterval(detoxTimer);
  if (map) { map.remove(); map = null; }
  const r = route();
  if (hunt && !(r.name === "place" && findQuest(hunt.questId)?.place.id === r.id)) stopHunt();
  document.documentElement.lang = profile.lang;
  all("[data-i18n]").forEach((node) => { node.textContent = t(node.dataset.i18n); });
  const screens = { welcome: renderWelcome, home: renderHome, explore: renderExplore, place: renderPlace, done: renderDone, city: renderCity, passport: renderPassport, rewards: renderRewards, coupon: renderCoupon, guide: renderGuide, profile: renderProfile };
  const screen = $("#screen");
  const fullScreens = ["welcome", "done", "city", "coupon"];
  $("#tabbar").hidden = fullScreens.includes(r.name);
  screen.className = `screen ${fullScreens.includes(r.name) ? "full" : ""}`;
  void screen.offsetWidth; // restart the enter animation
  (screens[r.name] ?? renderHome)(screen, r);
  const tab = { place: "explore", profile: "home" }[r.name] ?? r.name;
  all("#tabbar a").forEach((a) => a.classList.toggle("on", a.dataset.tab === tab));
  $("#offline").hidden = navigator.onLine;
  $("#offline").textContent = t("offline");
}

// ---------- onboarding ----------
function renderWelcome(screen, { step }) {
  const steps = `<div class="steps">${[0, 1, 2, 3].map((i) => `<i class="${i <= step ? "on" : ""}"></i>`).join("")}</div>`;
  const nav = (canNext, label = t("next")) => `<div class="footer"><button class="btn primary block" data-next ${canNext ? "" : "disabled"}>${label}</button>${step ? `<button class="link" data-back>${t("back")}</button>` : ""}</div>`;
  let body = "";
  if (step === 0) {
    body = `<div class="hero-emblem">🧭</div><h1>${t("obWelcomeTitle")}</h1><p class="lead">${t("obWelcomeText")}</p>
      <div class="lang-row">${[["uz", "O'zbekcha"], ["en", "English"], ["ru", "Русский"]].map(([code, name]) => `<button class="option ${profile.lang === code ? "on" : ""}" data-lang="${code}">${name}</button>`).join("")}</div>${nav(true)}`;
  } else if (step === 1) {
    body = `<h1>${t("obName")}</h1><input class="text-input" id="name" maxlength="24" autocomplete="nickname" placeholder="${t("obNamePlaceholder")}" value="${esc(profile.name)}" />
      <p class="lead">${t("obAvatar")}</p><div class="avatars">${AVATARS.map((a) => `<button class="option ${profile.avatar === a ? "on" : ""}" data-avatar="${a}">${a}</button>`).join("")}</div>${nav(true)}`;
  } else if (step === 2) {
    body = `<h1>${t("obCity")}</h1><div class="city-pick">${CITIES.map((c) => `<button class="city-card ${profile.cityId === c.id ? "on" : ""}" data-city="${c.id}"><img src="${c.image}" alt="" /><span><strong>${c.story.icon} ${esc(L(c.name))}</strong><small>${esc(L(c.story.title))} · ${c.places.length} ${t("statPlaces").toLowerCase()}</small></span></button>`).join("")}</div>${nav(true)}`;
  } else {
    body = `<h1>${t("obInterests")}</h1><p class="lead">${t("obInterestsHint")}</p>
      <div class="interest-grid">${INTERESTS.map((i) => `<button class="option ${profile.interests.includes(i.id) ? "on" : ""}" data-interest="${i.id}"><span>${i.icon}</span>${esc(L(i.name))}</button>`).join("")}</div>${nav(profile.interests.length > 0, t("letsGo"))}`;
  }
  screen.innerHTML = `<section class="onboard">${steps}${body}</section>`;
  all("[data-lang]", screen).forEach((b) => b.addEventListener("click", () => { profile.lang = b.dataset.lang; saveProfile(); render(); }));
  all("[data-avatar]", screen).forEach((b) => b.addEventListener("click", () => { profile.avatar = b.dataset.avatar; profile.name = $("#name").value; saveProfile(); render(); }));
  all("[data-city]", screen).forEach((b) => b.addEventListener("click", () => { profile.cityId = b.dataset.city; saveProfile(); render(); }));
  all("[data-interest]", screen).forEach((b) => b.addEventListener("click", () => {
    const id = b.dataset.interest;
    profile.interests = profile.interests.includes(id) ? profile.interests.filter((x) => x !== id) : [...profile.interests, id];
    saveProfile(); render();
  }));
  $("[data-back]", screen)?.addEventListener("click", () => go(`#/welcome/${step - 1}`));
  $("[data-next]", screen)?.addEventListener("click", () => {
    if (step === 1) profile.name = $("#name").value.trim();
    if (step === 3) { profile.done = true; saveProfile(); go("#/"); return; }
    saveProfile();
    go(`#/welcome/${step + 1}`);
  });
}

// ---------- shared pieces ----------
function placeCard(place, reason) {
  const done = placeDone(state, place), progress = placeProgress(state, place);
  const started = state.started[place.id] && !done;
  const found = findPlace(place.id);
  const status = done ? `<span class="chip green status">✓ ${t("done")}</span>` : started ? `<span class="chip gold status">${t("inProgress", { done: progress, total: place.quests.length })}</span>` : "";
  const why = reason ? `<span class="chip reason">${esc(reasonText(reason))}</span>` : "";
  return `<a class="place-card ${done ? "done" : ""}" href="#/place/${place.id}">
    <div class="cover" style="background:${gradient(place)}">${place.emoji}${why}${status}</div>
    <div class="body"><span class="chapter-tag">${t("chapterLabel", { n: found.index + 1 })} · ${esc(L(place.chapter))}</span><h3>${esc(L(place.name))}</h3>
      <div class="meta"><span class="chip">⏱ ${t("minutes", { n: place.minutes })}</span><span class="chip">🎯 ${t("quests", { n: place.quests.length })}</span><span class="chip gold">⭐ ${t("xp", { n: placeXp(place) })}</span></div>
      ${started ? `<div class="bar"><i style="width:${(progress / place.quests.length) * 100}%"></i></div>` : ""}
    </div></a>`;
}

function reasonText(reason) {
  if (reason.key === "reasonInterest") return t("reasonInterest", { interest: interestName(reason.interest) });
  if (reason.key === "reasonNear") return t("reasonNear", { distance: formatDistance(reason.distance) });
  return t(reason.key);
}

function storyCard(c) {
  const next = storyNext(state, c);
  const done = cityDoneCount(state, c), total = c.places.length;
  const pieces = c.places.map((p) => `<i class="${placeDone(state, p) ? "on" : ""}" title="${esc(L(p.chapter))}">${placeDone(state, p) ? c.story.icon : ""}</i>`).join("");
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
  const c = city(), info = levelInfo(state.xp);
  const suggested = suggestions(state, c, { interests: profile.interests, position });
  const story = storyNext(state, c);
  const active = suggested.find((s) => state.started[s.place.id] && s.place.id !== story?.place.id);
  const picks = suggested.filter((s) => s !== active && s.place.id !== story?.place.id).slice(0, 3);
  const today = dayKey(Date.now()), daily = dailyFor(c, today), dailyDone = state.dailies[today];
  const activeCoupons = OFFERS.filter((o) => state.coupons[o.id] && state.coupons[o.id].expiresAt > Date.now()).length;
  screen.innerHTML = `
    <header class="topline">
      <a class="avatar" href="#/profile" aria-label="${t("openProfile")}">${profile.avatar}</a>
      <div><h1>${t("hello", { name: esc(profile.name || L({ uz: "sayyoh", en: "explorer", ru: "путешественник" })) })}</h1><p>${t("helloSub", { city: esc(L(c.name)) })}</p></div>
      <button class="chip city-switch" data-switch>📍 ${esc(L(c.name))} ⇄</button>
    </header>
    <section class="card level-card">
      <div class="row"><div class="level-badge">${info.level}</div><div><strong>${esc(L(info.title))}</strong><small>${info.ceil ? t("toNext", { n: info.ceil - state.xp, level: info.level + 1 }) : t("maxLevel")}</small></div><span class="xp-pill">${state.xp} XP</span></div>
      <div class="bar"><i style="width:${Math.round(info.progress * 100)}%"></i></div>
      ${activeCoupons ? `<a class="coupon-hint" href="#/rewards">🎁 ${t("wallet")} · ${t("couponsCount", { n: activeCoupons })} →</a>` : ""}
    </section>
    ${storyCard(c)}
    ${!story ? otherCityCard(c) : ""}
    ${active ? `<p class="label">${t("active")}</p>
      <a class="card active-card" href="#/place/${active.place.id}">${art(active.place)}<div><h3>${esc(L(active.place.name))}</h3>
        <span class="faint">${t("adventureProgress", { done: placeProgress(state, active.place), total: active.place.quests.length })}</span>
        <div class="bar"><i style="width:${(placeProgress(state, active.place) / active.place.quests.length) * 100}%"></i></div></div></a>` : ""}
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
    profile.cityId = CITIES[(index + 1) % CITIES.length].id;
    saveProfile(); render();
  });
  $("[data-daily]", screen)?.addEventListener("click", () => { dispatch({ type: "daily", cityId: c.id, dailyId: daily.id }); render(); });
  renderDetox($("#detox", screen));
}

function otherCityCard(c) {
  const other = CITIES.find((x) => x.id !== c.id && !cityComplete(state, x));
  return `<a class="card city-win row" href="#/city/${c.id}" style="margin-top:14px"><span style="font-size:34px">🏆</span><div><b>${t("cityTitle", { city: esc(L(c.name)) })}</b><br><small class="muted">${t("claimReward")} →</small></div></a>
    ${other ? `<button class="btn primary block" style="margin-top:12px" data-other="${other.id}">✈️ ${t("exploreOther", { city: esc(L(other.name)) })}</button>` : ""}`;
}

function bindOtherCity(screen) {
  $("[data-other]", screen)?.addEventListener("click", (e) => { profile.cityId = e.currentTarget.dataset.other; saveProfile(); go("#/"); });
}

function renderDetox(card) {
  clearInterval(detoxTimer);
  if (state.detox[dayKey(Date.now())]) {
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
  const ranked = new Map(suggestions(state, c, { interests: profile.interests, position }).map((s) => [s.place.id, s]));
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
    const icon = window.L.divIcon({ className: "", html: `<div class="map-pin ${placeDone(state, p) ? "done" : ""}" style="background:${gradient(p)}">${placeDone(state, p) ? "✅" : p.emoji}<b>${index}</b></div>`, iconSize: [42, 42], iconAnchor: [21, 21] });
    window.L.marker([p.lat, p.lng], { icon }).bindPopup(`<b>${index}. ${esc(L(p.name))}</b><br>${esc(L(p.chapter))}<br><a href="#/place/${p.id}">${t("quests", { n: p.quests.length })} →</a>`).addTo(map);
  });
  if (position) window.L.circleMarker([position.lat, position.lng], { radius: 8, color: "#fff", weight: 3, fillColor: "#ff6b35", fillOpacity: 1 }).addTo(map);
  if (places.length) map.fitBounds(places.map((p) => [p.lat, p.lng]), { padding: [40, 40] });
}

// ---------- place (chapter) ----------
function renderPlace(screen, { id }) {
  const found = findPlace(id);
  if (!found) return go("#/explore");
  const { city: c, place, index } = found;
  if (c.id !== profile.cityId) { profile.cityId = c.id; saveProfile(); }
  const started = Boolean(state.started[place.id]), done = placeDone(state, place);
  const progress = placeProgress(state, place);
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
  const done = state.quests[quest.id];
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
      ${profile.testMode ? `<small class="test-hint">🧪 ${t("testHint", { code: esc(quest.code) })}</small>` : ""}`;
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
    if (profile.testMode) actions += `<button class="link" data-simulate="${quest.id}">🧪 ${t("huntSimulate")}</button>`;
  } else if (quest.type === "photo") {
    actions = `<button class="btn primary small" data-photo="${quest.id}">📷 ${t("takePhoto")}</button>${profile.testMode ? `<button class="link" data-skip="${quest.id}">🧪 ${t("skipPhoto")}</button>` : ""}`;
  } else {
    actions = `<button class="btn primary small" data-complete="${quest.id}">✓ ${t("markComplete")}</button>`;
  }
  return `<article class="quest ${done ? "done" : ""} ${unlocked ? "" : "locked"} r-${rarity}" id="q-${quest.id}" style="--c:${RARITY[rarity].color}">
    <div class="head"><div class="icon">${done ? "✓" : type.icon}</div><div><div class="type">${esc(L(type.label))} ${rarityChip(rarity)}</div><h3>${esc(L(quest.title))}</h3></div><span class="xp">+${questXp(quest)}</span></div>
    ${body}<p>${esc(L(quest.prompt))}</p><div class="actions">${actions}</div></article>`;
}

function bindPlace(screen, place) {
  $("[data-start]", screen)?.addEventListener("click", () => { dispatch({ type: "start", placeId: place.id }); render(); document.getElementById("quests")?.scrollIntoView({ behavior: "smooth", block: "start" }); });
  $("[data-again]", screen)?.addEventListener("click", () => { lastCompletion = null; go(`#/done/${place.id}`); });
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
  }, () => { toast(t("huntNoGps"), "error"); stopHunt(); rerenderPlace(questId); }, { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 });
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
function collectibleCard(place, { big = false } = {}) {
  const card = place.card, rarity = RARITY[card.rarity];
  return `<div class="collect-card ${big ? "big flip" : ""} r-${card.rarity}" style="--c:${rarity.color};background:${gradient(place)}">
    <span class="card-rarity">${esc(L(rarity.name))}</span><span class="card-icon">${card.icon}</span><b>${esc(L(card.name))}</b><small>${esc(L(card.fact))}</small></div>`;
}

function couponTile(offer) {
  const coupon = state.coupons[offer.id];
  const expired = coupon && coupon.expiresAt < Date.now();
  return `<a class="coupon ${coupon ? "" : "locked"} ${expired ? "expired" : ""}" ${coupon ? `href="#/coupon/${offer.id}"` : ""}>
    <span class="coupon-icon">${coupon ? offer.icon : "🔒"}</span>
    <div><b>${esc(L(offer.deal))}</b><small>${esc(L(offer.partner))} · ${esc(L(offer.where))}</small>
      ${coupon ? `<small class="${expired ? "danger" : "ok"}">${expired ? t("expired") : t("validUntil", { date: formatDate(coupon.expiresAt) })}</small>` : `<small class="unlock">🔓 ${unlockText(offer)}</small>`}</div>
    ${coupon ? `<span class="coupon-go">›</span>` : ""}</a>`;
}

function unlockText(offer) {
  const rule = offer.unlock;
  if (rule.place) return t("unlockPlace", { place: esc(L(findPlace(rule.place).place.name)) });
  if (rule.city) return t("unlockCity", { city: esc(L(findCity(rule.city).name)) });
  return t("unlockLevel", { n: rule.level });
}

function renderDone(screen, { id }) {
  const found = findPlace(id);
  if (!found || !placeDone(state, found.place)) return go(found ? `#/place/${id}` : "#/");
  const { city: c, place, index } = found;
  const fresh = lastCompletion?.placeId === place.id ? lastCompletion : null;
  const gained = placeXp(place) + (fresh?.cityCompleted ? XP.cityComplete : 0);
  const storyAfter = storyNext(state, c);
  const next = suggestions(state, c, { interests: profile.interests, position })[0];
  const cityWon = cityComplete(state, c);
  clearToasts();
  const highlights = [
    ...(fresh?.levelUp ? [{ icon: "⬆️", name: t("levelUp", { title: L(fresh.levelUp.title) }), desc: `Lv ${fresh.levelUp.level}` }] : []),
    ...(fresh?.newGifts ?? []).map((gid) => { const g = GIFT_STAMPS.find((x) => x.id === gid); return { icon: g.icon, name: `${t("giftStamp")}: ${L(g.name)}`, desc: L(g.desc), gift: true }; }),
    ...(fresh?.newBadges ?? []).map((bid) => { const b = BADGES.find((x) => x.id === bid); return { icon: b.icon, name: L(b.name), desc: L(b.desc) }; })
  ];
  const coupons = (fresh?.coupons ?? []).map((oid) => OFFERS.find((o) => o.id === oid));
  screen.innerHTML = `
    <section class="complete">
      <div class="stamp" style="background:radial-gradient(circle,${place.colors[0]},${place.colors[1]})"><div class="inner"><span>${place.emoji}</span><b>${esc(L(place.name))}</b><small>${esc(L(c.name)).toUpperCase()} · ${formatDate(state.places[place.id].at)}</small></div></div>
      <h1>${t("chapterComplete")}</h1>
      <p>${t("chapterLabel", { n: index + 1 })} · ${esc(L(place.chapter))}</p>
      <div class="xp-burst"><strong id="xp-count">+0</strong><small>${t("earned")}</small></div>
      <div class="piece-found"><span>${c.story.icon}</span>${t("pieceFound", { piece: esc(L(c.story.piece)) })} · ${t("pieceProgress", { done: cityDoneCount(state, c), total: c.places.length, piece: esc(L(c.story.piece)) })}</div>
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

function countUp(node, target) {
  const start = performance.now();
  const step = (now) => {
    const p = Math.min(1, (now - start) / 900);
    node.textContent = `+${Math.round(target * (1 - (1 - p) ** 3))} XP`;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ---------- city conquered ----------
function renderCity(screen, { id }) {
  const c = findCity(id) ?? city();
  if (!cityComplete(state, c)) return go("#/");
  const reward = state.rewards[c.id];
  const cityXp = c.places.reduce((sum, p) => sum + placeXp(p), 0) + XP.cityComplete;
  const finishedAt = Math.max(...c.places.map((p) => state.places[p.id].at));
  screen.innerHTML = `
    <section class="complete">
      <a class="back" href="#/" style="position:static;display:grid;margin-bottom:6px">←</a>
      <div class="certificate">
        <div class="medal"><span>🏆</span><b>${c.short}</b></div>
        <h2>${t("cityTitle", { city: esc(L(c.name)) })}</h2>
        <p class="muted">${esc(L(c.story.finale))}</p>
        <p class="who">${profile.avatar} ${esc(profile.name || "Explorer")}</p>
        <p class="faint">${formatDate(finishedAt)} · ${cityXp} XP</p>
        <ul>${c.places.map((p, i) => `<li>✅ ${i + 1}. ${p.emoji} ${esc(L(p.chapter))}</li>`).join("")}</ul>
      </div>
      <section class="card" style="margin-top:16px">
        <p class="label" style="margin-top:0">${t("rewardsTitle")} · ${esc(L(c.reward.name))}</p>
        ${reward ? `<p class="muted">${t("voucher")}</p><div class="voucher">${reward.voucher}</div><p class="muted">${t("voucherHint", { prize: esc(L(c.reward.prize)) })}</p>` : `<button class="btn primary block" data-claim>🎁 ${t("claimReward")}</button>`}
      </section>
      <div class="actions">
        ${navigator.share ? `<button class="btn ghost block" data-share>↗ Share</button>` : ""}
        <a class="btn ghost block" href="#/rewards">🎁 ${t("wallet")}</a>
        <a class="link" href="#/">${t("backHome")}</a>
      </div>
    </section>`;
  if (!reward) confetti();
  $("[data-claim]", screen)?.addEventListener("click", () => { dispatch({ type: "reward", cityId: c.id }); render(); });
  $("[data-share]", screen)?.addEventListener("click", () => navigator.share({ title: "UzQuest", text: `${t("cityTitle", { city: L(c.name) })} ${cityXp} XP 🏆`, url: location.origin }).catch(() => undefined));
}

// ---------- rewards wallet ----------
function renderRewards(screen) {
  const ordered = [city(), ...CITIES.filter((c) => c.id !== city().id)];
  const unlocked = OFFERS.filter((o) => state.coupons[o.id]).sort((a, b) => state.coupons[b.id].at - state.coupons[a.id].at);
  const locked = OFFERS.filter((o) => !state.coupons[o.id]);
  screen.innerHTML = `
    <h1 class="page-title">🎁 ${t("rewardsTitle")}</h1>
    <p class="label">${t("wallet")}</p>
    ${unlocked.length ? `<div class="coupon-list">${unlocked.map(couponTile).join("")}</div>` : `<div class="card empty-card">🎟️ ${t("noCoupons")}</div>`}
    ${locked.length ? `<p class="label">${t("lockedOffers")}</p><div class="coupon-list">${locked.map(couponTile).join("")}</div>` : ""}
    <p class="label">${t("cityVouchers")}</p>
    ${ordered.map((c) => {
      const reward = state.rewards[c.id];
      const body = reward ? `<div class="voucher">${reward.voucher}</div><small class="muted">${t("voucherHint", { prize: esc(L(c.reward.prize)) })}</small>`
        : cityComplete(state, c) ? `<a class="btn primary small" href="#/city/${c.id}">🎁 ${t("claimReward")}</a>`
        : `<small class="muted">${t("rewardLocked", { n: c.places.length, city: esc(L(c.name)), prize: esc(L(c.reward.prize)) })}</small><div class="bar teal" style="margin-top:10px"><i style="width:${(cityDoneCount(state, c) / c.places.length) * 100}%"></i></div>`;
      return `<section class="card" style="margin-bottom:10px"><div class="row between" style="margin-bottom:8px"><b>🏆 ${esc(L(c.reward.name))}</b><span class="chip">${cityDoneCount(state, c)}/${c.places.length}</span></div>${body}</section>`;
    }).join("")}
    <p class="faint small-note">ℹ️ ${t("demoPartner")}</p>`;
}

function renderCoupon(screen, { id }) {
  const offer = OFFERS.find((o) => o.id === id);
  const coupon = offer && state.coupons[offer.id];
  if (!coupon) return go("#/rewards");
  const expired = coupon.expiresAt < Date.now();
  screen.innerHTML = `
    <section class="complete coupon-detail">
      <a class="back" href="#/rewards" style="position:static;display:grid;margin-bottom:6px">←</a>
      <div class="ticket">
        <span class="ticket-icon">${offer.icon}</span>
        <h2>${esc(L(offer.deal))}</h2>
        <p class="muted">${esc(L(offer.partner))}<br>📍 ${esc(L(offer.where))}</p>
        <div class="ticket-cut"></div>
        <p class="label" style="margin:0 0 8px">${t("showCashier")}</p>
        <div class="voucher ${expired ? "expired" : ""}">${coupon.code}</div>
        <p class="${expired ? "danger" : "ok"}">${expired ? t("expired") : t("validUntil", { date: formatDate(coupon.expiresAt) })}</p>
      </div>
      <p class="faint small-note">ℹ️ ${t("demoPartner")}</p>
    </section>`;
}

// ---------- passport ----------
function renderPassport(screen) {
  const ordered = [city(), ...CITIES.filter((c) => c.id !== city().id)];
  const earned = new Set(earnedBadges(state)), gifts = new Set(earnedGiftStamps(state)), cards = new Set(collectedCards(state));
  const allPlaces = CITIES.flatMap((c) => c.places);
  screen.innerHTML = `
    <h1 class="page-title">🛂 ${t("passportTitle")}</h1>
    <div class="stats">
      <div><b>${state.xp}</b><small>${t("statXp")}</small></div>
      <div><b>${Object.keys(state.quests).length}</b><small>${t("statQuests")}</small></div>
      <div><b>${cards.size}</b><small>${t("cards")}</small></div>
      <div><b>${earned.size + gifts.size}</b><small>${t("statBadges")}</small></div>
    </div>
    ${ordered.map((c) => `
      <div class="section-head"><h2>${c.story.icon} ${esc(L(c.name))}</h2><span class="chip ${cityComplete(state, c) ? "green" : ""}">${cityDoneCount(state, c)} / ${c.places.length}</span></div>
      <div class="stamp-grid">${c.places.map((p, i) => {
        const on = placeDone(state, p);
        return `<a class="mini-stamp ${on ? "on" : ""}" href="#/place/${p.id}" style="--tilt:${((i * 37) % 11) - 5}deg;${on ? `background:radial-gradient(circle,${p.colors[0]},${p.colors[1]})` : ""}"><span>${p.emoji}</span><b>${esc(L(p.name))}</b></a>`;
      }).join("")}</div>`).join("")}
    <div class="section-head"><h2>🎁 ${t("giftStamps")}</h2><span class="chip gold">${gifts.size} / ${GIFT_STAMPS.length}</span></div>
    <div class="stamp-grid gifts">${GIFT_STAMPS.map((g) => `<div class="mini-stamp gift ${gifts.has(g.id) ? "on" : ""}" title="${esc(L(g.desc))}"><span>${g.icon}</span><b>${esc(L(g.name))}</b></div>`).join("")}</div>
    <div class="section-head"><h2>🃏 ${t("cards")}</h2><span class="chip gold">${cards.size} / ${allPlaces.length}</span></div>
    <div class="card-grid">${allPlaces.map((p) => cards.has(p.id) ? collectibleCard(p) : `<div class="collect-card locked"><span class="card-icon">?</span><b>${esc(L(RARITY[p.card.rarity].name))}</b></div>`).join("")}</div>
    <div class="section-head"><h2>${t("badges")}</h2><span class="chip gold">${earned.size} / ${BADGES.length}</span></div>
    <div class="badge-grid">${BADGES.map((b) => `<div class="badge ${earned.has(b.id) ? "on" : ""}"><span>${b.icon}</span><b>${esc(L(b.name))}</b><small>${esc(L(b.desc))}</small></div>`).join("")}</div>
    <div class="section-head"><h2>${t("journal")}</h2></div>
    <div class="journal" id="journal"><p class="faint">${t("journalEmpty")}</p></div>`;
  photos.all().then((shots) => {
    if (!shots.length) return;
    $("#journal").innerHTML = shots.sort((a, b) => b.at - a.at).map((s) => `<figure><img src="${s.dataUrl}" alt="" loading="lazy" /><figcaption>${esc(L(findPlace(s.placeId)?.place.name))}</figcaption></figure>`).join("");
  });
}

// ---------- guide ----------
function renderGuide(screen) {
  if (!chat.length) chat.push({ role: "assistant", text: t("guideWelcome") });
  screen.innerHTML = `
    <header class="guide-head"><div class="avatar">🧞</div><div><h1>${t("guideTitle")}</h1><p>${t("guideSub")}</p></div><span class="chip source ${server.guide ? "green" : ""}">${server.guide ? "AI" : "Offline"}</span></header>
    <div class="feed" id="feed">${chat.map((m) => `<div class="msg ${m.role === "user" ? "me" : "bot"}">${esc(m.text)}</div>`).join("")}</div>
    <div class="guide-pad"></div>
    <div class="chat-dock">
      <div class="suggest-row">${["guideNext", "guideStory", "guideFood", "guideTransport"].map((k) => `<button data-ask>${t(k)}</button>`).join("")}</div>
      <form class="chat-form" id="chat-form"><input id="chat-input" maxlength="500" autocomplete="off" placeholder="${t("guidePlaceholder")}" /><button aria-label="Send">↑</button></form>
    </div>`;
  all("[data-ask]", screen).forEach((b) => b.addEventListener("click", () => askGuide(b.textContent)));
  $("#chat-form", screen).addEventListener("submit", (e) => { e.preventDefault(); const text = $("#chat-input").value.trim(); if (text) askGuide(text); });
  $("#feed").lastElementChild?.scrollIntoView({ block: "end" });
}

async function askGuide(message) {
  $("#chat-input").value = "";
  const feed = $("#feed");
  const add = (cls, text) => { const node = document.createElement("div"); node.className = `msg ${cls}`; node.textContent = text; feed.append(node); node.scrollIntoView({ behavior: "smooth", block: "end" }); return node; };
  add("me", message);
  const thinking = add("bot thinking", t("guideThinking"));
  const c = city();
  const next = storyNext(state, c)?.place ?? null;
  const last = [...c.places].reverse().find((p) => state.started[p.id]);
  let reply = null;
  if (server.guide && navigator.onLine) {
    try {
      const response = await fetch(apiUrl("guide"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, history: chat.slice(-8), cityId: c.id, placeId: next?.id, interests: profile.interests, lang: profile.lang }) });
      if (response.ok) reply = (await response.json()).reply;
    } catch { /* fall back to the offline guide */ }
  }
  reply ??= localGuideReply({ message, lang: profile.lang, city: c, next, last, distance: position && next ? distanceMeters(position.lat, position.lng, next.lat, next.lng) : null });
  thinking.classList.remove("thinking");
  thinking.textContent = reply;
  chat.push({ role: "user", text: message }, { role: "assistant", text: reply });
}

// ---------- profile ----------
function renderProfile(screen) {
  const info = levelInfo(state.xp);
  screen.innerHTML = `
    <section class="profile-head"><div class="avatar">${profile.avatar}</div><h1>${esc(profile.name || "Explorer")}</h1><p class="muted">Lv ${info.level} · ${esc(L(info.title))} · ${state.xp} XP</p></section>
    <section class="card level-card"><div class="bar"><i style="width:${Math.round(info.progress * 100)}%"></i></div><small>${info.ceil ? t("toNext", { n: info.ceil - state.xp, level: info.level + 1 }) : t("maxLevel")}</small></section>
    <p class="label">${t("levels")}</p>
    <div class="levels">${LEVELS.map((l, i) => `<div class="${i + 1 === info.level ? "current" : i + 1 < info.level ? "reached" : ""}"><b>${i + 1}</b><span>${esc(L(l.title))}</span><small>${l.xp} XP</small></div>`).join("")}</div>
    <p class="label">${t("settings")}</p>
    <div class="setting"><span>${t("language")}</span><div class="seg">${[["uz", "O'zbekcha"], ["en", "English"], ["ru", "Русский"]].map(([code, name]) => `<button class="option ${profile.lang === code ? "on" : ""}" data-lang="${code}">${name}</button>`).join("")}</div></div>
    <div class="setting"><span>${t("city")}</span><div class="seg">${CITIES.map((c) => `<button class="option ${profile.cityId === c.id ? "on" : ""}" data-city="${c.id}">${esc(L(c.name))}</button>`).join("")}</div></div>
    <div class="setting"><span>${t("interests")}</span><div class="chips-wrap">${INTERESTS.map((i) => `<button class="option ${profile.interests.includes(i.id) ? "on" : ""}" data-interest="${i.id}">${i.icon} ${esc(L(i.name))}</button>`).join("")}</div></div>
    <label class="card toggle-row"><div><b>🧪 ${t("testMode")}</b><small class="muted">${t("testModeHint")}</small></div><input type="checkbox" id="test-mode" ${profile.testMode ? "checked" : ""} /></label>
    <button class="btn ghost block danger" style="margin-top:14px" data-reset>${t("reset")}</button>`;
  all("[data-lang]", screen).forEach((b) => b.addEventListener("click", () => { profile.lang = b.dataset.lang; saveProfile(); render(); }));
  all("[data-city]", screen).forEach((b) => b.addEventListener("click", () => { profile.cityId = b.dataset.city; saveProfile(); render(); }));
  all("[data-interest]", screen).forEach((b) => b.addEventListener("click", () => {
    const id = b.dataset.interest;
    const nextInterests = profile.interests.includes(id) ? profile.interests.filter((x) => x !== id) : [...profile.interests, id];
    if (!nextInterests.length) return;
    profile.interests = nextInterests; saveProfile(); render();
  }));
  $("#test-mode", screen).addEventListener("change", (e) => { profile.testMode = e.target.checked; saveProfile(); });
  $("[data-reset]", screen).addEventListener("click", async () => {
    if (!confirm(t("resetConfirm"))) return;
    [KEYS.state, KEYS.outbox, KEYS.detox, KEYS.profile].forEach(store.remove);
    deviceId = uuid(); store.set(KEYS.device, deviceId);
    await photos.clear();
    state = emptyState();
    profile = { name: "", avatar: AVATARS[0], lang: profile.lang, cityId: "tashkent", interests: [], done: false, testMode: true };
    chat.length = 0;
    go("#/welcome/0");
  });
}

// ---------- boot ----------
window.addEventListener("hashchange", () => { render(); window.scrollTo(0, 0); });
window.addEventListener("online", () => { render(); checkServer(); });
window.addEventListener("offline", render);
$("#photo-input").addEventListener("change", (e) => { handlePhoto(e.target.files[0]); e.target.value = ""; });
document.addEventListener("visibilitychange", () => { if (!document.hidden && route().name === "home") render(); });

render();
checkServer();
locate(false);
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("../sw.js", { scope: "../" }).catch(() => undefined);
