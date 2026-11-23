// City conquered: the certificate and the city voucher.
import { XP } from "../../shared/content.mjs";
import { cityComplete, findCity, placeXp } from "../../shared/engine.mjs";
import { confetti } from "../core/feedback.mjs";
import { go, render } from "../core/router.mjs";
import { city, session } from "../core/session.mjs";
import { dispatch } from "../core/sync.mjs";
import { $, esc, formatDate, L, t } from "../core/ui.mjs";

export function renderCity(screen, { id }) {
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
