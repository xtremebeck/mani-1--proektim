// The traveller's rough position, used to rank suggestions and draw the map.
import { render, route } from "./router.mjs";
import { session } from "./session.mjs";

// ask: prompt for permission; otherwise only read the position when it is already granted.
export async function locate(ask = false) {
  if (!navigator.geolocation) return;
  if (!ask) {
    const permission = await navigator.permissions?.query({ name: "geolocation" }).catch(() => null);
    if (permission?.state !== "granted") return;
  }
  navigator.geolocation.getCurrentPosition((pos) => {
    session.position = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    if (["home", "explore"].includes(route().name)) render();
  }, () => undefined, { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 });
}
