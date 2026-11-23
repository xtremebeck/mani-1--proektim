// Profile: level, Telegram account, language, city, interests, test mode and reset.
import { CITIES, INTERESTS, LEVELS } from "../../shared/content.mjs";
import { levelInfo } from "../../shared/engine.mjs";
import { cancelLogin, logout, startLogin } from "../core/auth.mjs";
import { go, render } from "../core/router.mjs";
import { AVATARS, forgetAccount, saveProfile, session, testAllowed, testMode } from "../core/session.mjs";
import { apiHeaders, apiUrl } from "../core/sync.mjs";
import { $, all, esc, L, t } from "../core/ui.mjs";

// Log in with Telegram, wait for the confirmation, or show who is logged in. Hidden when there
// is no server with a bot (for example the static demo).
function accountCard() {
  if (session.auth) {
    const who = session.auth.name ?? (session.auth.username ? `@${session.auth.username}` : "Telegram");
    return `<section class="card account-card"><p class="label" style="margin-top:0">✈️ ${t("account")}</p><p>${t("tgLoggedIn", { name: `<b>${esc(who)}</b>` })}</p><button class="btn ghost small" data-logout>${t("tgLogout")}</button></section>`;
  }
  if (!session.server.telegram) return "";
  if (session.login) {
    return `<section class="card account-card waiting"><p class="label" style="margin-top:0">✈️ ${t("account")}</p><p>${t("tgWaiting")}</p>
      <a class="btn primary block" href="${esc(session.login.url)}" target="_blank" rel="noopener" data-open-telegram>✈️ ${t("tgOpen")}</a><button class="link" data-cancel-login>${t("tgCancel")}</button></section>`;
  }
  return `<section class="card account-card"><p class="label" style="margin-top:0">✈️ ${t("account")}</p><p class="muted">${t("accountHint")}</p><button class="btn primary block" data-login>✈️ ${t("tgLogin")}</button></section>`;
}

export function renderProfile(screen) {
  const info = levelInfo(session.state.xp);
  screen.innerHTML = `
    <section class="profile-head"><div class="avatar">${session.profile.avatar}</div><h1>${esc(session.profile.name || t("explorer"))}</h1><p class="muted">Lv ${info.level} · ${esc(L(info.title))} · ${session.state.xp} XP</p></section>
    <section class="card level-card"><div class="bar"><i style="width:${Math.round(info.progress * 100)}%"></i></div><small>${info.ceil ? t("toNext", { n: info.ceil - session.state.xp, level: info.level + 1 }) : t("maxLevel")}</small></section>
    ${accountCard()}
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
  $("[data-login]", screen)?.addEventListener("click", startLogin);
  $("[data-cancel-login]", screen)?.addEventListener("click", cancelLogin);
  $("[data-logout]", screen)?.addEventListener("click", logout);
  $("[data-reset]", screen).addEventListener("click", async () => {
    if (!confirm(t("resetConfirm"))) return;
    // A reset also logs this phone out; the account keeps its progress on the server.
    if (session.auth) fetch(apiUrl("auth/logout"), { method: "POST", headers: apiHeaders() }).catch(() => undefined);
    await forgetAccount();
    session.profile = { name: "", avatar: AVATARS[0], lang: session.profile.lang, cityId: "tashkent", interests: [], done: false, testMode: true };
    session.chat.length = 0;
    go("#/welcome/0");
  });
}
