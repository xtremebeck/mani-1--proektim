// State shared across the app, loaded from the device on import. Code replaces its fields
// (session.state = …) instead of reassigning variables, so every module sees the same values.
import { CITIES } from "../../shared/content.mjs";
import { emptyState, findCity } from "../../shared/engine.mjs";
import { KEYS, store, uuid } from "./storage.mjs";

export const AVATARS = ["🧭", "🐫", "🦅", "🧕", "🧔", "👩‍🚀", "🦊", "🐯"];
const guessLang = () => { const nav = (navigator.language || "en").toLowerCase(); return nav.startsWith("ru") ? "ru" : nav.startsWith("uz") ? "uz" : "en"; };

export const session = {
  profile: null, state: null, log: null, deviceId: null,
  server: { online: false, guide: false, testEvents: true },
  chat: [],
  position: null,
  lastCompletion: null
};
session.profile = store.get(KEYS.profile, null) ?? { name: "", avatar: AVATARS[0], lang: guessLang(), cityId: "tashkent", interests: [], done: false };
session.profile.testMode ??= true; // MVP default: lets people try GPS hunts and photo spots from home
session.state = store.get(KEYS.state, null);
if (!session.state || session.state.v !== 3) session.state = emptyState();
// Every accepted event, so progress the server rejects can be replayed away.
// Older installs have progress but no log; they keep their state as is (log = null).
session.log = store.get(KEYS.log, null);
if (!session.log && !session.state.xp && !Object.keys(session.state.started).length) { session.log = []; store.set(KEYS.log, session.log); }
session.deviceId = store.get(KEYS.device, null);
if (!session.deviceId) { session.deviceId = uuid(); store.set(KEYS.device, session.deviceId); }

// Test shortcuts follow the server's policy when it is reachable; the static build has no server.
export const testAllowed = () => !session.server.online || session.server.testEvents;
export const testMode = () => session.profile.testMode && testAllowed();
export const city = () => findCity(session.profile.cityId) ?? CITIES[0];
export const saveProfile = () => store.set(KEYS.profile, session.profile);
