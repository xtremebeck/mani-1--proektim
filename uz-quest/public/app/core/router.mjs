// Hash router. Screens are registered by app.mjs, so this module never imports them.
import { session } from "./session.mjs";
import { $, all, t } from "./ui.mjs";

let screens = {};
const teardowns = [];
// Screens without a tab bar.
const FULL_SCREENS = ["welcome", "done", "city", "coupon"];

export function registerScreens(map) { screens = map; }

// Runs before every render, with the route being rendered next (stop timers, watchers, maps).
export function onBeforeRender(fn) { teardowns.push(fn); }

export function route() {
  const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (!session.profile.done) return { name: "welcome", step: Math.min(3, Math.max(0, Math.trunc(Number(parts[0] === "welcome" ? parts[1] : 0)) || 0)) };
  const [name = "home", id] = parts;
  return { name, id };
}

export const go = (hash) => { if (location.hash === hash) render(); else location.hash = hash; };

export function render() {
  const r = route();
  teardowns.forEach((fn) => fn(r));
  document.documentElement.lang = session.profile.lang;
  all("[data-i18n]").forEach((node) => { node.textContent = t(node.dataset.i18n); });
  const screen = $("#screen");
  $("#tabbar").hidden = FULL_SCREENS.includes(r.name);
  screen.className = `screen ${FULL_SCREENS.includes(r.name) ? "full" : ""}`;
  void screen.offsetWidth; // restart the enter animation
  (screens[r.name] ?? screens.home)(screen, r);
  const tab = { place: "explore", profile: "home" }[r.name] ?? r.name;
  all("#tabbar a").forEach((a) => a.classList.toggle("on", a.dataset.tab === tab));
  $("#offline").hidden = navigator.onLine;
  $("#offline").textContent = t("offline");
}
