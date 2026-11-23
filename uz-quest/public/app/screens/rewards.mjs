// Rewards: the coupon wallet, city vouchers and a single coupon to show the cashier.
import { CITIES, OFFERS } from "../../shared/content.mjs";
import { cityComplete, cityDoneCount } from "../../shared/engine.mjs";
import { couponTile } from "../components/cards.mjs";
import { go } from "../core/router.mjs";
import { city, session } from "../core/session.mjs";
import { esc, formatDate, L, t } from "../core/ui.mjs";

export function renderRewards(screen) {
  const ordered = [city(), ...CITIES.filter((c) => c.id !== city().id)];
  const unlocked = OFFERS.filter((o) => session.state.coupons[o.id]).sort((a, b) => session.state.coupons[b.id].at - session.state.coupons[a.id].at);
  const locked = OFFERS.filter((o) => !session.state.coupons[o.id]);
  screen.innerHTML = `
    <h1 class="page-title">🎁 ${t("rewardsTitle")}</h1>
    <p class="label">${t("wallet")}</p>
    ${unlocked.length ? `<div class="coupon-list">${unlocked.map(couponTile).join("")}</div>` : `<div class="card empty-card">🎟️ ${t("noCoupons")}</div>`}
    ${locked.length ? `<p class="label">${t("lockedOffers")}</p><div class="coupon-list">${locked.map(couponTile).join("")}</div>` : ""}
    <p class="label">${t("cityVouchers")}</p>
    ${ordered.map((c) => {
      const reward = session.state.rewards[c.id];
      const body = reward ? `<div class="voucher">${reward.voucher}</div><small class="muted">${t("voucherHint", { prize: esc(L(c.reward.prize)) })}</small>`
        : cityComplete(session.state, c) ? `<a class="btn primary small" href="#/city/${c.id}">🎁 ${t("claimReward")}</a>`
        : `<small class="muted">${t("rewardLocked", { n: c.places.length, city: esc(L(c.name)), prize: esc(L(c.reward.prize)) })}</small><div class="bar teal" style="margin-top:10px"><i style="width:${(cityDoneCount(session.state, c) / c.places.length) * 100}%"></i></div>`;
      return `<section class="card" style="margin-bottom:10px"><div class="row between" style="margin-bottom:8px"><b>🏆 ${esc(L(c.reward.name))}</b><span class="chip">${cityDoneCount(session.state, c)}/${c.places.length}</span></div>${body}</section>`;
    }).join("")}
    <p class="faint small-note">ℹ️ ${t("demoPartner")}</p>`;
}

export function renderCoupon(screen, { id }) {
  const offer = OFFERS.find((o) => o.id === id);
  const coupon = offer && session.state.coupons[offer.id];
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
