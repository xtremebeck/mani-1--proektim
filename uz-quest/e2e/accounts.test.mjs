// Logging in with Telegram on two phones, against a fake Telegram Bot API.
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { CITIES } from "../public/shared/content.mjs";
import { readDevice, start } from "../backend/test/support/server.mjs";
import { fakeTelegram } from "../backend/test/support/telegram.mjs";
import { launch, localState, newContext, onboard, openPage, playPlace, waitSynced } from "./support.mjs";

const tashkent = CITIES.find((city) => city.id === "tashkent");
const [hazratiImam, chorsu] = tashkent.places;
const ALICE = { id: 2024, first_name: "Alice", username: "alice_uz", language_code: "en" };

describe("Telegram account: two phones, one progress", () => {
  let browser, tg, server, phone, tablet;
  before(async () => {
    browser = await launch();
    tg = await fakeTelegram();
    server = await start({ TELEGRAM_BOT_TOKEN: "test-token", TELEGRAM_API_URL: tg.url });
    for (let i = 0; i < 50 && !(await (await fetch(`${server.base}/api/v1/health`)).json()).telegram; i++) await new Promise((r) => setTimeout(r, 50));
    const open = async () => { const context = await newContext(browser); return { context, ...(await openPage(context)) }; };
    phone = await open();
    tablet = await open();
  });
  after(async () => { await phone?.context.close(); await tablet?.context.close(); await browser?.close(); await server?.stop(); await tg?.close(); });

  // Taps "Log in with Telegram", then plays the traveller's part in the bot.
  async function logIn({ page }) {
    await page.goto(`${server.base}/app/#/profile`);
    await page.locator("[data-login]").click();
    const link = await page.locator("[data-open-telegram]").getAttribute("href");
    const token = new URL(link).searchParams.get("start");
    assert.match(link, /^https:\/\/t\.me\/uzquest_test_bot\?start=/);
    const since = tg.calls.length;
    tg.say(ALICE, `/start ${token}`);
    const ask = await tg.waitFor("sendMessage", (body) => body.reply_markup, since);
    tg.tap(ALICE, ask.body.reply_markup.inline_keyboard[0][0].callback_data, ask.result);
    await page.waitForSelector("[data-logout]", { timeout: 10000 });
  }

  test("the login button shows even when the app is opened straight on Profile", async () => {
    await onboard(phone.page, server.base, { cityId: tashkent.id });
    await phone.page.goto(`${server.base}/app/#/profile`);
    await phone.page.reload();
    await phone.page.waitForSelector("[data-login]", { timeout: 5000 });
  });

  test("the phone plays a chapter, logs in, and keeps its progress", async () => {
    await playPlace(phone.page, server.base, hazratiImam);
    const before = (await localState(phone.page)).xp;
    await logIn(phone);
    assert.match(await phone.page.locator(".account-card").textContent(), /Logged in as Alice/);
    assert.equal((await localState(phone.page)).xp, before);
  });

  test("the tablet's own progress is merged in when it logs in to the same account", async () => {
    await onboard(tablet.page, server.base, { cityId: tashkent.id });
    await playPlace(tablet.page, server.base, chorsu);
    await logIn(tablet);
    const state = await localState(tablet.page);
    assert.ok(state.places[hazratiImam.id], "the phone's chapter");
    assert.ok(state.places[chorsu.id], "the tablet's chapter");
  });

  test("the phone picks up the tablet's progress on its next sync", async () => {
    await phone.page.reload();
    await phone.page.waitForFunction((id) => JSON.parse(localStorage.getItem("uzq3-state")).places[id], chorsu.id, { timeout: 10000 });
    assert.equal((await localState(phone.page)).xp, (await localState(tablet.page)).xp);
  });

  test("progress made while logged in is stored on the account", async () => {
    await tablet.page.goto(`${server.base}/app/#/`);
    await tablet.page.locator("[data-daily]").click();
    await waitSynced(tablet.page);
    const deviceId = await tablet.page.evaluate(() => JSON.parse(localStorage.getItem("uzq2-device")));
    const daily = readDevice(server.dbFile, deviceId).events.find((e) => e.type === "daily");
    assert.ok(daily, "the event is recorded for this device");
    await phone.page.reload();
    await phone.page.waitForFunction(() => Object.keys(JSON.parse(localStorage.getItem("uzq3-state")).dailies).length === 1, null, { timeout: 10000 });
  });

  test("logging out starts the phone over; the account keeps the progress", async () => {
    await phone.page.goto(`${server.base}/app/#/profile`);
    phone.page.once("dialog", (dialog) => dialog.accept());
    await phone.page.locator("[data-logout]").click();
    await phone.page.waitForSelector("[data-login]");
    assert.equal((await localState(phone.page))?.xp ?? 0, 0);
    assert.equal(await phone.page.evaluate(() => localStorage.getItem("uzq-auth")), null);
    await logIn(phone);
    await phone.page.waitForFunction((id) => JSON.parse(localStorage.getItem("uzq3-state")).places[id], chorsu.id, { timeout: 10000 });
  });

  test("no JavaScript errors on either phone", () => {
    assert.deepEqual(phone.errors, []);
    assert.deepEqual(tablet.errors, []);
  });
});
