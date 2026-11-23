// Profile: level, language, city, interests, test mode and reset.
import { CITIES, INTERESTS, LEVELS } from "../../shared/content.mjs";
import { emptyState, levelInfo } from "../../shared/engine.mjs";
import { go, render } from "../core/router.mjs";
import { AVATARS, saveProfile, session, testAllowed, testMode } from "../core/session.mjs";
import { KEYS, photos, store, uuid } from "../core/storage.mjs";
import { $, all, esc, L, t } from "../core/ui.mjs";

export function renderProfile(screen) {
  const info = levelInfo(session.state.xp);
  screen.innerHTML = `
    <section class="profile-head"><div class="avatar">${session.profile.avatar}</div><h1>${esc(session.profile.name || t("explorer"))}</h1><p class="muted">Lv ${info.level} · ${esc(L(info.title))} · ${session.state.xp} XP</p></section>
    <section class="card level-card"><div class="bar"><i style="width:${Math.round(info.progress * 100)}%"></i></div><small>${info.ceil ? t("toNext", { n: info.ceil - session.state.xp, level: info.level + 1 }) : t("maxLevel")}</small></section>
    <p class="label">${t("levels")}</p>
    <div class="levels">${LEVELS.map((l, i) => `<div class="${i + 1 === info.level ? "current" : i + 1 < info.level ? "reached" : ""}"><b>${i + 1}</b><span>${esc(L(l.title))}</span><small>${l.xp} XP</small></div>`).join("")}</div>
    <p class="label">${t("settings")}</p>
    <div class="setting"><span>${t("language")}</span><div class="seg">${[["uz", "O'zbekcha"], ["en", "English"], ["ru", "Русский"]].map(([code, name]) => `<button class="option ${session.profile.lang === code ? "on" : ""}" data-lang="${code}">${name}</button>`).join("")}</div></div>
    <div class="setting"><span>${t("city")}</span><div class="seg">${CITIES.map((c) => `<button class="option ${session.profile.cityId === c.id ? "on" : ""}" data-city="${c.id}">${esc(L(c.name))}</button>`).join("")}</div></div>
    <div class="setting"><span>${t("interests")}</span><div class="chips-wrap">${INTERESTS.map((i) => `<button class="option ${session.profile.interests.includes(i.id) ? "on" : ""}" data-interest="${i.id}">${i.icon} ${esc(L(i.name))}</button>`).join("")}</div></div>
    <label class="card toggle-row"><div><b>🧪 ${t("testMode")}</b><small class="muted">${t(testAllowed() ? "testModeHint" : "testModeOff")}</small></div><input type="checkbox" id="test-mode" ${testMode() ? "checked" : ""} ${testAllowed() ? "" : "disabled"} /></label>
    <button class="btn ghost block danger" style="margin-top:14px" data-reset>${t("reset")}</button>`;
  all("[data-lang]", screen).forEach((b) => b.addEventListener("click", () => { session.profile.lang = b.dataset.lang; saveProfile(); render(); }));
  all("[data-city]", screen).forEach((b) => b.addEventListener("click", () => { session.profile.cityId = b.dataset.city; saveProfile(); render(); }));
  all("[data-interest]", screen).forEach((b) => b.addEventListener("click", () => {
    const id = b.dataset.interest;
    const nextInterests = session.profile.interests.includes(id) ? session.profile.interests.filter((x) => x !== id) : [...session.profile.interests, id];
    if (!nextInterests.length) return;
    session.profile.interests = nextInterests; saveProfile(); render();
  }));
  $("#test-mode", screen).addEventListener("change", (e) => { session.profile.testMode = e.target.checked; saveProfile(); });
  $("[data-reset]", screen).addEventListener("click", async () => {
    if (!confirm(t("resetConfirm"))) return;
    [KEYS.state, KEYS.outbox, KEYS.detox, KEYS.profile].forEach(store.remove);
    session.log = []; store.set(KEYS.log, session.log);
    session.deviceId = uuid(); store.set(KEYS.device, session.deviceId);
    await photos.clear();
    session.state = emptyState();
    session.profile = { name: "", avatar: AVATARS[0], lang: session.profile.lang, cityId: "tashkent", interests: [], done: false, testMode: true };
    session.chat.length = 0;
    go("#/welcome/0");
  });
}
