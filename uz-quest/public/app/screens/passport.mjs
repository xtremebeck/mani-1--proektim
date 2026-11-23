// Passport: stamps, collectible cards, gift stamps, badges and the photo journal.
import { BADGES, CITIES, GIFT_STAMPS, RARITY } from "../../shared/content.mjs";
import {
  cityComplete, cityDoneCount, collectedCards, earnedBadges, earnedGiftStamps, findPlace, placeDone
} from "../../shared/engine.mjs";
import { collectibleCard } from "../components/cards.mjs";
import { city, session } from "../core/session.mjs";
import { photos } from "../core/storage.mjs";
import { $, esc, L, t } from "../core/ui.mjs";

export function renderPassport(screen) {
  const ordered = [city(), ...CITIES.filter((c) => c.id !== city().id)];
  const earned = new Set(earnedBadges(session.state)), gifts = new Set(earnedGiftStamps(session.state)), cards = new Set(collectedCards(session.state));
  const allPlaces = CITIES.flatMap((c) => c.places);
  screen.innerHTML = `
    <h1 class="page-title">🛂 ${t("passportTitle")}</h1>
    <div class="stats">
      <div><b>${session.state.xp}</b><small>${t("statXp")}</small></div>
      <div><b>${Object.keys(session.state.quests).length}</b><small>${t("statQuests")}</small></div>
      <div><b>${cards.size}</b><small>${t("cards")}</small></div>
      <div><b>${earned.size + gifts.size}</b><small>${t("statBadges")}</small></div>
    </div>
    ${ordered.map((c) => `
      <div class="section-head"><h2>${c.story.icon} ${esc(L(c.name))}</h2><span class="chip ${cityComplete(session.state, c) ? "green" : ""}">${cityDoneCount(session.state, c)} / ${c.places.length}</span></div>
      <div class="stamp-grid">${c.places.map((p, i) => {
        const on = placeDone(session.state, p);
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
