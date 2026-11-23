// Cards shared by more than one screen: place cards, the finished-city card, collectible
// cards and coupon tiles.
import { CITIES, RARITY } from "../../shared/content.mjs";
import { cityComplete, findCity, findPlace, placeDone, placeProgress, placeXp } from "../../shared/engine.mjs";
import { go } from "../core/router.mjs";
import { saveProfile, session } from "../core/session.mjs";
import { $, esc, formatDate, formatDistance, gradient, interestName, L, t } from "../core/ui.mjs";

export function placeCard(place, reason) {
  const done = placeDone(session.state, place), progress = placeProgress(session.state, place);
  const started = session.state.started[place.id] && !done;
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

export function otherCityCard(c) {
  const other = CITIES.find((x) => x.id !== c.id && !cityComplete(session.state, x));
  return `<a class="card city-win row" href="#/city/${c.id}" style="margin-top:14px"><span style="font-size:34px">🏆</span><div><b>${t("cityTitle", { city: esc(L(c.name)) })}</b><br><small class="muted">${t("claimReward")} →</small></div></a>
    ${other ? `<button class="btn primary block" style="margin-top:12px" data-other="${other.id}">✈️ ${t("exploreOther", { city: esc(L(other.name)) })}</button>` : ""}`;
}

export function bindOtherCity(screen) {
  $("[data-other]", screen)?.addEventListener("click", (e) => { session.profile.cityId = e.currentTarget.dataset.other; saveProfile(); go("#/"); });
}

export function collectibleCard(place, { big = false } = {}) {
  const card = place.card, rarity = RARITY[card.rarity];
  return `<div class="collect-card ${big ? "big flip" : ""} r-${card.rarity}" style="--c:${rarity.color};background:${gradient(place)}">
    <span class="card-rarity">${esc(L(rarity.name))}</span><span class="card-icon">${card.icon}</span><b>${esc(L(card.name))}</b><small>${esc(L(card.fact))}</small></div>`;
}

export function couponTile(offer) {
  const coupon = session.state.coupons[offer.id];
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
