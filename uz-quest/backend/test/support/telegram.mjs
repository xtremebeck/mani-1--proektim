// A fake Telegram Bot API for tests. The server's bot polls it like the real API; tests push
// updates ("the user sent /start", "the user tapped Yes") and read what the bot sent back.
import { createServer } from "node:http";

export async function fakeTelegram({ username = "uzquest_test_bot" } = {}) {
  const updates = [], calls = [];
  let nextUpdateId = 1, nextMessageId = 100, wake = null;
  const server = createServer(async (req, res) => {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const body = raw ? JSON.parse(raw) : {};
    const method = req.url.split("/").pop();
    const reply = (result) => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify({ ok: true, result })); };
    if (method === "getMe") return reply({ id: 1, is_bot: true, username });
    if (method === "getUpdates") {
      // Like Telegram: an offset confirms every earlier update, which is then dropped.
      while (updates.length && updates[0].update_id < (body.offset ?? 0)) updates.shift();
      if (!updates.length) await new Promise((resolve) => { wake = resolve; setTimeout(resolve, 300); });
      wake = null;
      return reply(updates.filter((update) => update.update_id >= (body.offset ?? 0)));
    }
    const call = { method, body };
    if (method === "sendMessage") call.result = { message_id: nextMessageId++, chat: { id: body.chat_id }, text: body.text };
    calls.push(call);
    return reply(call.result ?? true);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const push = (update) => { updates.push({ update_id: nextUpdateId++, ...update }); wake?.(); };
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    calls,
    // The user sends a message to the bot, e.g. "/start <token>".
    say(user, text) { push({ message: { message_id: nextMessageId++, from: user, chat: { id: user.id, type: "private" }, text } }); },
    // The user taps an inline button under one of the bot's messages.
    tap(user, data, message) { push({ callback_query: { id: `cb-${nextUpdateId}`, from: user, data, message: { message_id: message.message_id, chat: { id: user.id } } } }); },
    // Waits for the bot to call `method` with a body matching `test`; returns the call.
    async waitFor(method, test = () => true, since = 0) {
      for (let i = 0; i < 100; i++) {
        const found = calls.slice(since).find((call) => call.method === method && test(call.body));
        if (found) return found;
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      throw Error(`the bot never called ${method}`);
    },
    close: () => new Promise((resolve) => { server.closeAllConnections(); server.close(resolve); })
  };
}
