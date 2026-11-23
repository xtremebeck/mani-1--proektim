// Home: level, the story chapter to play next, suggestions, the daily quest and the digital detox timer.
import { CITIES, DETOX_MINUTES, OFFERS, XP } from "../../shared/content.mjs";
import {
  cityDoneCount, dailyFor, dayKey, levelInfo, placeDone, placeProgress, storyNext, suggestions
} from "../../shared/engine.mjs";
import { bindOtherCity, otherCityCard, placeCard } from "../components/cards.mjs";
import { onBeforeRender, render } from "../core/router.mjs";
import { city, saveProfile, session } from "../core/session.mjs";
import { KEYS, store } from "../core/storage.mjs";
import { dispatch } from "../core/sync.mjs";
import { $, art, esc, L, pad, t } from "../core/ui.mjs";

let detoxTimer = null;

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

export function renderHome(screen) {
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

// Leaving the screen stops the detox countdown.
onBeforeRender(() => clearInterval(detoxTimer));
