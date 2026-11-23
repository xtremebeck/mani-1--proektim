// Explore: every place of the city as a list or on a map, filtered by interest.
import { INTERESTS } from "../../shared/content.mjs";
import { findPlace, placeDone, suggestions } from "../../shared/engine.mjs";
import { placeCard } from "../components/cards.mjs";
import { go, onBeforeRender, render } from "../core/router.mjs";
import { city, session } from "../core/session.mjs";
import { $, all, esc, gradient, L, t } from "../core/ui.mjs";

let map = null;
let exploreFilter = "all";

export function renderExplore(screen, { id: mode }) {
  const c = city();
  const places = c.places.filter((p) => exploreFilter === "all" || p.interests.includes(exploreFilter));
  const ranked = new Map(suggestions(session.state, c, { interests: session.profile.interests, position: session.position }).map((s) => [s.place.id, s]));
  screen.innerHTML = `
    <div class="row between"><h1 class="page-title">${t("exploreTitle", { city: esc(L(c.name)) })}</h1>
      <div class="toggle"><button class="${mode !== "map" ? "on" : ""}" data-mode="list">${t("listView")}</button><button class="${mode === "map" ? "on" : ""}" data-mode="map">${t("mapView")}</button></div></div>
    <div class="filters"><button class="option ${exploreFilter === "all" ? "on" : ""}" data-filter="all">${t("all")}</button>${INTERESTS.map((i) => `<button class="option ${exploreFilter === i.id ? "on" : ""}" data-filter="${i.id}">${i.icon} ${esc(L(i.name))}</button>`).join("")}</div>
    ${mode === "map" ? `<div class="map" id="map"></div>` : `<div class="compact-list">${places.map((p) => placeCard(p, ranked.get(p.id)?.reason)).join("")}</div>`}`;
  all("[data-mode]", screen).forEach((b) => b.addEventListener("click", () => go(b.dataset.mode === "map" ? "#/explore/map" : "#/explore")));
  all("[data-filter]", screen).forEach((b) => b.addEventListener("click", () => { exploreFilter = b.dataset.filter; render(); }));
  if (mode === "map") drawMap(places);
}

function drawMap(places) {
  const box = $("#map");
  if (!window.L) {
    box.innerHTML = `<div class="compact-list" style="padding:12px">${places.map((p) => placeCard(p)).join("")}</div>`;
    box.style.height = "auto";
    return;
  }
  map = window.L.map(box, { zoomControl: false });
  window.L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(map);
  window.L.control.zoom({ position: "bottomright" }).addTo(map);
  window.L.polyline(places.map((p) => [p.lat, p.lng]), { color: "#f7c948", weight: 3, dashArray: "6 8", opacity: .8 }).addTo(map);
  places.forEach((p) => {
    const index = findPlace(p.id).index + 1;
    const icon = window.L.divIcon({ className: "", html: `<div class="map-pin ${placeDone(session.state, p) ? "done" : ""}" style="background:${gradient(p)}">${placeDone(session.state, p) ? "✅" : p.emoji}<b>${index}</b></div>`, iconSize: [42, 42], iconAnchor: [21, 21] });
    window.L.marker([p.lat, p.lng], { icon }).bindPopup(`<b>${index}. ${esc(L(p.name))}</b><br>${esc(L(p.chapter))}<br><a href="#/place/${p.id}">${t("quests", { n: p.quests.length })} →</a>`).addTo(map);
  });
  if (session.position) window.L.circleMarker([session.position.lat, session.position.lng], { radius: 8, color: "#fff", weight: 3, fillColor: "#ff6b35", fillOpacity: 1 }).addTo(map);
  if (places.length) map.fitBounds(places.map((p) => [p.lat, p.lng]), { padding: [40, 40] });
}

// Leaving the screen removes the Leaflet map.
onBeforeRender(() => { if (map) { map.remove(); map = null; } });
