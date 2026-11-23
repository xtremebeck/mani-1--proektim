// Minimal Telegram Bot API client. Updates arrive by long polling (getUpdates), so the server
// needs no public URL or webhook. TELEGRAM_API_URL points it at a fake API in tests.
export class TelegramBot {
  #token;
  #api;
  #onUpdate;
  #offset = 0;
  #stopped = false;
  #abort = new AbortController();
  username = null; // known once getMe succeeds

  constructor({ token, api = "https://api.telegram.org", onUpdate }) {
    this.#token = token;
    this.#api = api.replace(/\/$/, "");
    this.#onUpdate = onUpdate;
  }

  async call(method, params = {}) {
    const response = await fetch(`${this.#api}/bot${this.#token}/${method}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(params), signal: this.#abort.signal
    });
    const data = await response.json().catch(() => ({}));
    if (!data.ok) throw Error(`Telegram ${method} failed: ${data.description ?? response.status}`);
    return data.result;
  }

  // Learns the bot's username, then polls for updates until stop(). Errors are logged and
  // retried, so a Telegram outage never takes the server down.
  async start() {
    while (!this.#stopped && !this.username) {
      try { this.username = (await this.call("getMe")).username; } catch (error) { if (!this.#stopped) { console.error(error.message); await this.#pause(5000); } }
    }
    while (!this.#stopped) {
      let updates = [];
      try {
        updates = await this.call("getUpdates", { offset: this.#offset, timeout: 25, allowed_updates: ["message", "callback_query"] });
      } catch (error) {
        if (!this.#stopped) { console.error(error.message); await this.#pause(5000); }
        continue;
      }
      for (const update of updates) {
        this.#offset = update.update_id + 1;
        try { await this.#onUpdate(update); } catch (error) { console.error("Telegram update failed:", error.message); }
      }
    }
  }

  stop() { this.#stopped = true; this.#abort.abort(); }

  #pause(ms) { return new Promise((resolve) => setTimeout(resolve, ms).unref()); }
}
