// Hamroh guide chat: asks Claude through the server when it is available, otherwise answers offline.
import { distanceMeters, storyNext } from "../../shared/engine.mjs";
import { city, session } from "../core/session.mjs";
import { apiUrl } from "../core/sync.mjs";
import { $, all, esc, t } from "../core/ui.mjs";
import { localGuideReply } from "../local-guide.mjs";

export function renderGuide(screen) {
  if (!session.chat.length) session.chat.push({ role: "assistant", text: t("guideWelcome") });
  screen.innerHTML = `
    <header class="guide-head"><div class="avatar">🧞</div><div><h1>${t("guideTitle")}</h1><p>${t("guideSub")}</p></div><span class="chip source ${session.server.guide ? "green" : ""}">${session.server.guide ? "AI" : "Offline"}</span></header>
    <div class="feed" id="feed">${session.chat.map((m) => `<div class="msg ${m.role === "user" ? "me" : "bot"}">${esc(m.text)}</div>`).join("")}</div>
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
  const next = storyNext(session.state, c)?.place ?? null;
  const last = [...c.places].reverse().find((p) => session.state.started[p.id]);
  let reply = null;
  if (session.server.guide && navigator.onLine) {
    try {
      const response = await fetch(apiUrl("guide"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, history: session.chat.slice(-8), cityId: c.id, placeId: next?.id, interests: session.profile.interests, lang: session.profile.lang }) });
      if (response.ok) reply = (await response.json()).reply;
    } catch { /* fall back to the offline guide */ }
  }
  reply ??= localGuideReply({ message, lang: session.profile.lang, city: c, next, last, distance: session.position && next ? distanceMeters(session.position.lat, session.position.lng, next.lat, next.lng) : null });
  thinking.classList.remove("thinking");
  thinking.textContent = reply;
  session.chat.push({ role: "user", text: message }, { role: "assistant", text: reply });
}
