// Onboarding in four steps: language, name and avatar, city, interests.
import { CITIES, INTERESTS } from "../../shared/content.mjs";
import { LANGUAGES } from "../../shared/languages.mjs";
import { go, render } from "../core/router.mjs";
import { AVATARS, saveProfile, session } from "../core/session.mjs";
import { $, all, esc, L, t } from "../core/ui.mjs";

export function renderWelcome(screen, { step }) {
  const steps = `<div class="steps">${[0, 1, 2, 3].map((i) => `<i class="${i <= step ? "on" : ""}"></i>`).join("")}</div>`;
  const nav = (canNext, label = t("next")) => `<div class="footer"><button class="btn primary block" data-next ${canNext ? "" : "disabled"}>${label}</button>${step ? `<button class="link" data-back>${t("back")}</button>` : ""}</div>`;
  let body = "";
  if (step === 0) {
    body = `<div class="hero-emblem">🧭</div><h1>${t("obWelcomeTitle")}</h1><p class="lead">${t("obWelcomeText")}</p>
      <div class="lang-row">${LANGUAGES.map(({ code, name }) => `<button class="option ${session.profile.lang === code ? "on" : ""}" data-lang="${code}">${name}</button>`).join("")}</div>${nav(true)}`;
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
