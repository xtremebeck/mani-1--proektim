// Treasure hunt: a hot / cold radar from live GPS. Used by the place screen, which it reports back to
// through callbacks so the two modules do not import each other.
import { distanceMeters, findQuest } from "../../shared/engine.mjs";
import { toast } from "../core/feedback.mjs";
import { onBeforeRender } from "../core/router.mjs";
import { $, formatDistance, t } from "../core/ui.mjs";

let hunt = null; // { questId, watchId, distance, message }

export const activeHunt = () => hunt;

// Watches GPS and shows how close the traveller is to the quest's hidden point.
// onChange: the hunt started or stopped, so the quest card needs redrawing.
// onArrive: called with { lat, lng, accuracy } once the traveller is within the radius.
export function startHunt(quest, { onChange, onArrive }) {
  stopHunt();
  const questId = quest.id;
  if (!navigator.geolocation) { toast(t("huntNoGps"), "error"); return; }
  hunt = { questId, message: t("huntSearching") };
  onChange();
  hunt.watchId = navigator.geolocation.watchPosition((pos) => {
    if (!hunt || hunt.questId !== questId) return;
    const { latitude: lat, longitude: lng, accuracy } = pos.coords;
    const d = distanceMeters(lat, lng, quest.lat, quest.lng);
    if (d <= quest.radius + Math.min(accuracy, 50)) {
      stopHunt();
      onArrive({ lat, lng, accuracy });
      return;
    }
    hunt.heat = d < 250 ? "hot" : d < 1000 ? "warm" : "cold";
    hunt.message = t(hunt.heat === "hot" ? "huntHot" : hunt.heat === "warm" ? "huntWarm" : "huntCold", { d: formatDistance(d) });
    const panel = document.querySelector(".hunt-panel");
    if (panel) { panel.className = `hunt-panel ${hunt.heat}`; $("#hunt-status").textContent = hunt.message; }
  }, (error) => {
    if (!hunt || hunt.questId !== questId) return;
    // Only a refused permission ends the hunt. A lost signal (tunnel, indoors) or a slow fix
    // is temporary and the watch keeps running, so show "searching" until the next position.
    if (error.code === error.PERMISSION_DENIED) { toast(t("huntNoGps"), "error"); stopHunt(); onChange(); return; }
    hunt.heat = null;
    hunt.message = t("huntSearching");
    const panel = document.querySelector(".hunt-panel");
    if (panel) { panel.className = "hunt-panel"; $("#hunt-status").textContent = hunt.message; }
  }, { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 });
}

export function stopHunt() {
  if (hunt?.watchId != null) navigator.geolocation.clearWatch(hunt.watchId);
  hunt = null;
}

// Leaving the hunt's place (or the app's place screen altogether) stops watching GPS.
onBeforeRender((r) => { if (hunt && !(r.name === "place" && findQuest(hunt.questId)?.place.id === r.id)) stopHunt(); });
