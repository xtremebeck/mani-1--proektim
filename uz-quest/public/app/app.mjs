// Entry point: registers the screens, wires global listeners and draws the first screen.
// Everything else lives in core/ (state, sync, routing), components/ and screens/.
import { locate } from "./core/location.mjs";
import { registerScreens, render, route } from "./core/router.mjs";
import { checkServer, flush } from "./core/sync.mjs";
import { renderCity } from "./screens/city.mjs";
import { renderDone } from "./screens/done.mjs";
import { renderExplore } from "./screens/explore.mjs";
import { renderGuide } from "./screens/guide.mjs";
import { renderHome } from "./screens/home.mjs";
import { renderPassport } from "./screens/passport.mjs";
import { bindPhotoInput } from "./screens/photos.mjs";
import { renderPlace } from "./screens/place.mjs";
import { renderProfile } from "./screens/profile.mjs";
import { renderCoupon, renderRewards } from "./screens/rewards.mjs";
import { renderWelcome } from "./screens/welcome.mjs";

registerScreens({ welcome: renderWelcome, home: renderHome, explore: renderExplore, place: renderPlace, done: renderDone, city: renderCity, passport: renderPassport, rewards: renderRewards, coupon: renderCoupon, guide: renderGuide, profile: renderProfile });

window.addEventListener("hashchange", () => { render(); window.scrollTo(0, 0); });
window.addEventListener("online", () => { render(); checkServer(); });
window.addEventListener("offline", render);
bindPhotoInput();
// Coming back to the app: refresh Home, and when logged in fetch progress from the other phones.
document.addEventListener("visibilitychange", () => {
  if (document.hidden) return;
  if (route().name === "home") render();
  flush();
});

render();
checkServer();
locate(false);
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("../sw.js", { scope: "../" }).catch(() => undefined);
