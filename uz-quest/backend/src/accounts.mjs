// "Log in with Telegram" through the bot, and merging a device's progress into the account.
//
// 1. The app asks for a login token (startLogin) and opens t.me/<bot>?start=<token>.
// 2. The traveller taps Start; the bot asks "is this you?" with Yes / No buttons. The extra step
//    stops someone from sending their own login link to a victim and linking the victim's
//    Telegram account to the attacker's phone.
// 3. The app polls loginStatus; once confirmed, the device is linked and gets a session token.
import { randomBytes } from "node:crypto";
import { emptyState, replay } from "../../public/shared/engine.mjs";
import { bot as turkishBot } from "../../public/shared/lang/tr.mjs";
import { bot as chineseBot } from "../../public/shared/lang/zh.mjs";
import { matchLanguage } from "../../public/shared/languages.mjs";

const TEXT = {
  en: {
    hello: "Hi! To log in, open UzQuest, go to Profile and tap “Log in with Telegram”.",
    confirm: "Log in to UzQuest on this phone?\n\nOnly confirm if you just tapped “Log in with Telegram” in UzQuest yourself. Never confirm a link someone sent you.",
    yes: "✅ Yes, it's me", no: "✖ No",
    done: "✅ You're logged in. Go back to UzQuest.", cancelled: "Login cancelled.",
    invalid: "This login link has expired or was already used. Start again from UzQuest."
  },
  uz: {
    hello: "Salom! Kirish uchun UzQuest'ni oching, Profil bo'limida “Telegram orqali kirish” tugmasini bosing.",
    confirm: "Shu telefonda UzQuest'ga kirasizmi?\n\nFaqat hozirgina UzQuest'da “Telegram orqali kirish” ni o'zingiz bosgan bo'lsangiz tasdiqlang. Birov yuborgan havolani hech qachon tasdiqlamang.",
    yes: "✅ Ha, bu men", no: "✖ Yo'q",
    done: "✅ Kirdingiz. UzQuest'ga qayting.", cancelled: "Kirish bekor qilindi.",
    invalid: "Bu kirish havolasi eskirgan yoki allaqachon ishlatilgan. UzQuest'dan qaytadan boshlang."
  },
  ru: {
    hello: "Привет! Чтобы войти, откройте UzQuest, раздел «Профиль», и нажмите «Войти через Telegram».",
    confirm: "Войти в UzQuest на этом телефоне?\n\nПодтверждайте, только если вы сами только что нажали «Войти через Telegram» в UzQuest. Никогда не подтверждайте ссылку, которую вам прислали.",
    yes: "✅ Да, это я", no: "✖ Нет",
    done: "✅ Вы вошли. Вернитесь в UzQuest.", cancelled: "Вход отменён.",
    invalid: "Эта ссылка для входа устарела или уже использована. Начните заново в UzQuest."
  }
};
TEXT.tr = turkishBot;
TEXT.zh = chineseBot;
// The bot answers in the language of the traveller's Telegram app.
const textFor = (from) => TEXT[matchLanguage(from?.language_code)];
const newToken = () => randomBytes(24).toString("base64url"); // 32 characters, fits Telegram's 64-character start parameter
const displayName = (user) => [user.first_name, user.last_name].filter(Boolean).join(" ") || null;

export function createAccounts({ store, bot, loginTtlMs, stateVersion }) {
  // Links a device to the Telegram account of a confirmed login and merges its progress.
  // The device's events are applied on top of the account's state, so nothing the account
  // already has changes (no coupon code shown on another phone is replaced); repeats are dropped.
  function linkDevice(login, now) {
    const device = store.device(login.deviceId) ?? { id: login.deviceId, createdAt: now, lang: "en", state: emptyState(), redeemed: {} };
    const account = store.accountByTelegram(login.telegramId) ?? { telegramId: login.telegramId, createdAt: now, state: emptyState(), redeemed: {} };
    if (device.accountId && device.accountId !== account.id) return null;
    account.name = login.name;
    account.username = login.username;
    if (account.state?.v !== stateVersion) account.state = emptyState();
    if (!device.accountId) {
      const history = device.state?.v === stateVersion ? store.events(device.id) : [];
      account.state = replay(history, undefined, account.state);
      account.redeemed = { ...device.redeemed, ...account.redeemed };
    }
    store.putAccount(account);
    device.accountId = account.id;
    device.lastSeenAt = now;
    store.putDevice(device);
    return account;
  }

  return {
    botUsername: () => bot?.username ?? null,

    startLogin(deviceId, now = Date.now()) {
      if (!bot?.username) return { status: 503, code: "TELEGRAM_UNAVAILABLE", message: "Telegram login is not configured." };
      if (store.device(deviceId)?.accountId) return { status: 409, code: "ALREADY_LOGGED_IN", message: "This device is already logged in." };
      const token = newToken();
      store.transaction(() => store.addLogin(token, deviceId, now, loginTtlMs));
      return { status: 200, body: { token, url: `https://t.me/${bot.username}?start=${token}`, expiresAt: now + loginTtlMs } };
    },

    // pending | cancelled | expired | used, or ok with the session token (handed out once).
    loginStatus(token, now = Date.now()) {
      return store.transaction(() => {
        const login = typeof token === "string" && token ? store.loginByToken(token) : null;
        if (!login) return { status: 404, code: "LOGIN_NOT_FOUND", message: "Unknown login." };
        if (login.status === "used" || login.status === "cancelled") return { status: 200, body: { status: login.status } };
        if (login.status !== "confirmed") return { status: 200, body: { status: now > login.expiresAt ? "expired" : "pending" } };
        const account = linkDevice(login, now);
        if (!account) return { status: 409, code: "ALREADY_LOGGED_IN", message: "This device is linked to another account." };
        const session = newToken() + newToken();
        store.addSession(session, account.id, login.deviceId, now);
        store.updateLogin({ ...login, status: "used" });
        return { status: 200, body: { status: "ok", session, account: { name: account.name, username: account.username }, state: account.state } };
      });
    },

    // The session from an "Authorization: Bearer <token>" header: { accountId, deviceId } or null.
    sessionOf(req) {
      const match = /^Bearer (\S+)$/.exec(req.headers.authorization ?? "");
      return match ? store.session(match[1]) : null;
    },

    // Deletes the account of the request's session, with all its devices and progress.
    deleteAccount(req) {
      const session = this.sessionOf(req);
      if (!session) return { status: 401, code: "SESSION_REQUIRED", message: "Log in to delete your account." };
      const devices = store.transaction(() => store.deleteAccount(session.accountId));
      return { status: 200, body: { deleted: true, devices } };
    },

    logout(req) {
      const match = /^Bearer (\S+)$/.exec(req.headers.authorization ?? "");
      if (match) store.transaction(() => store.dropSession(match[1]));
    },

    async handleUpdate(update, now = Date.now()) {
      if (update.message?.text) {
        const { from, chat, text } = update.message;
        const command = /^\/start(?:@\w+)?(?:\s+(\S+))?/.exec(text);
        if (!command) return;
        const words = textFor(from);
        if (!command[1]) return bot.call("sendMessage", { chat_id: chat.id, text: words.hello });
        const login = store.loginByToken(command[1]);
        if (!login || login.status !== "pending" || now > login.expiresAt) return bot.call("sendMessage", { chat_id: chat.id, text: words.invalid });
        store.transaction(() => store.updateLogin({ ...login, status: "asked", telegramId: from.id, name: displayName(from), username: from.username ?? null }));
        return bot.call("sendMessage", {
          chat_id: chat.id, text: words.confirm,
          reply_markup: { inline_keyboard: [[{ text: words.yes, callback_data: `login:ok:${login.id}` }, { text: words.no, callback_data: `login:no:${login.id}` }]] }
        });
      }
      const query = update.callback_query;
      const choice = /^login:(ok|no):(\d+)$/.exec(query?.data ?? "");
      if (!choice) return;
      const words = textFor(query.from);
      const login = store.loginById(Number(choice[2]));
      // Only the Telegram user who started this login may answer it, and only in time.
      if (!login || login.status !== "asked" || login.telegramId !== query.from.id || now > login.expiresAt) {
        return bot.call("answerCallbackQuery", { callback_query_id: query.id, text: words.invalid, show_alert: true });
      }
      const confirmed = choice[1] === "ok";
      store.transaction(() => store.updateLogin({ ...login, status: confirmed ? "confirmed" : "cancelled" }));
      await bot.call("answerCallbackQuery", { callback_query_id: query.id });
      if (query.message) await bot.call("editMessageText", { chat_id: query.message.chat.id, message_id: query.message.message_id, text: confirmed ? words.done : words.cancelled });
    }
  };
}
