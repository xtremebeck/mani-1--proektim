// "Log in with Telegram": ask the server for a login link, let the traveller confirm it in the
// bot, and poll until the server hands out a session. The account's progress then replaces this
// phone's, with this phone's own progress already merged into it on the server.
import { replay } from "../../shared/engine.mjs";
import { toast } from "./feedback.mjs";
import { render } from "./router.mjs";
import { forgetAccount, session } from "./session.mjs";
import { KEYS, store } from "./storage.mjs";
import { apiHeaders, apiUrl, flush } from "./sync.mjs";
import { t } from "./ui.mjs";

const POLL_MS = 2000;
let timer = null;

export async function startLogin() {
  await flush(); // progress not sent yet would otherwise miss the merge
  try {
    const response = await fetch(apiUrl("auth/telegram/start"), { method: "POST", headers: apiHeaders(), body: JSON.stringify({ deviceId: session.deviceId }) });
    if (!response.ok) throw Error();
    session.login = await response.json();
  } catch { toast(t("tgFailed"), "error"); return; }
  render();
  poll();
}

export function cancelLogin() {
  session.login = null;
  clearTimeout(timer);
  render();
}

async function poll() {
  clearTimeout(timer);
  const login = session.login;
  if (!login) return;
  if (Date.now() > login.expiresAt) return giveUp("tgExpired");
  // Telegram usually covers the app; polling resumes as soon as the traveller comes back.
  if (!document.hidden) {
    try {
      const response = await fetch(apiUrl("auth/telegram/status"), { method: "POST", headers: apiHeaders(), body: JSON.stringify({ token: login.token }) });
      const data = response.ok ? await response.json() : null;
      if (session.login !== login) return; // cancelled meanwhile
      if (data?.status === "ok") return finish(data);
      if (data?.status === "cancelled") return giveUp("tgCancelled");
      if (data?.status === "expired" || data?.status === "used") return giveUp("tgExpired");
    } catch { /* offline for a moment; try again */ }
  }
  timer = setTimeout(poll, POLL_MS);
}
document.addEventListener("visibilitychange", () => { if (!document.hidden && session.login) poll(); });

function giveUp(key) {
  session.login = null;
  toast(t(key), "error");
  render();
}

function finish(data) {
  session.login = null;
  session.auth = { token: data.session, name: data.account.name, username: data.account.username };
  store.set(KEYS.auth, session.auth);
  // The event log only reconciles a guest's progress; logged in, the server's state is the truth.
  session.log = []; store.set(KEYS.log, session.log);
  session.state = replay(store.get(KEYS.outbox, []), undefined, data.state);
  store.set(KEYS.state, session.state);
  toast(t("tgWelcome", { name: data.account.name ?? data.account.username ?? "" }), "gold");
  render();
  flush();
}

// Deletes the Telegram account on the server with all its progress, on every phone, then starts
// this phone over. Asks twice: this cannot be undone.
export async function deleteAccount() {
  if (!session.auth || !confirm(t("tgDeleteConfirm"))) return;
  try {
    const response = await fetch(apiUrl("auth/delete"), { method: "POST", headers: apiHeaders() });
    if (!response.ok) throw Error();
  } catch { toast(t("tgDeleteFailed"), "error"); return; }
  await forgetAccount();
  toast(t("tgDeleted"));
  render();
}

export async function logout() {
  if (!confirm(t("tgLogoutConfirm"))) return;
  if (session.auth) fetch(apiUrl("auth/logout"), { method: "POST", headers: apiHeaders() }).catch(() => undefined);
  await forgetAccount();
  render();
}
