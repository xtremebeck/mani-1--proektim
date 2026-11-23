// Chapter complete: the stamp, XP, the new card, rewards unlocked and the next clue.
import { BADGES, GIFT_STAMPS, OFFERS, XP } from "../../shared/content.mjs";
import { cityComplete, cityDoneCount, findPlace, placeDone, placeXp, storyNext, suggestions } from "../../shared/engine.mjs";
import { bindOtherCity, collectibleCard, couponTile, otherCityCard } from "../components/cards.mjs";
import { clearToasts, confetti, countUp } from "../core/feedback.mjs";
import { go } from "../core/router.mjs";
import { session } from "../core/session.mjs";
import { $, esc, formatDate, L, t } from "../core/ui.mjs";

export function renderDone(screen, { id }) {
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
