// State shared across the app, loaded from the device on import. Code replaces its fields
// (session.state = …) instead of reassigning variables, so every module sees the same values.
import { CITIES } from "../../shared/content.mjs";
import { emptyState, findCity } from "../../shared/engine.mjs";
import { matchLanguage } from "../../shared/languages.mjs";
import { KEYS, photos, store, uuid } from "./storage.mjs";

export const AVATARS = ["🧭", "🐫", "🦅", "🧕", "🧔", "👩‍🚀", "🦊", "🐯"];
const guessLang = () => matchLanguage(navigator.language);

export const session = {
  profile: null, state: null, log: null, deviceId: null,
  // checked: the first /health check finished. lastTestEvents: the test policy the server gave last time.
  server: { online: false, guide: false, testEvents: true, telegram: null, checked: false, lastTestEvents: null },
  auth: null, // { token, name, username } once logged in with Telegram
  login: null, // { token, url, expiresAt } while a Telegram login waits for confirmation
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
session.auth = store.get(KEYS.auth, null);
session.server.lastTestEvents = store.get(KEYS.testPolicy, null);

// Test shortcuts follow the server's policy. Offline, or before the server answers, the policy it
// gave last time applies; on a first visit they stay hidden until it answers. Only when there is no
// server at all (the static demo) are they always offered.
export const testAllowed = () => {
  if (session.server.online) return session.server.testEvents;
  if (session.server.lastTestEvents != null) return session.server.lastTestEvents;
  return session.server.checked;
};
export const testMode = () => session.profile.testMode && testAllowed();
export const city = () => findCity(session.profile.cityId) ?? CITIES[0];
export const saveProfile = () => store.set(KEYS.profile, session.profile);

// This phone starts over as a guest with a new device id. Progress made while logged in stays in
// the Telegram account; logging in again brings it back.
export function forgetAccount() {
  [KEYS.auth, KEYS.state, KEYS.outbox, KEYS.detox].forEach(store.remove);
  session.auth = null;
  session.login = null;
  session.state = emptyState();
  session.log = []; store.set(KEYS.log, session.log);
  session.deviceId = uuid(); store.set(KEYS.device, session.deviceId);
  return photos.clear();
}
