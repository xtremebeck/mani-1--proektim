// Browser walkthrough of the web app against a real server. Run with `npm run test:e2e`.
// Tests inside a describe share one page and run in order, like one traveller's session.
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { CITIES } from "../public/shared/content.mjs";
import { dailyFor, dayKey } from "../public/shared/engine.mjs";
import { DEV_CODES_FILE, readDevice, start } from "../backend/test/support/server.mjs";
import { launch, localState, newContext, onboard, openPage, outboxSize, playPlace, toastTexts, waitSynced } from "./support.mjs";

const tashkent = CITIES.find((city) => city.id === "tashkent");
const [hazratiImam, chorsu] = tashkent.places;
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

describe("dev server: a traveller's first session", () => {
  let server, context, page, errors;
  before(async () => {
    server = await start();
    context = await newContext(browser);
    ({ page, errors } = await openPage(context));
  });
  after(async () => { await context?.close(); await server?.stop(); });

  test("onboarding needs an interest and ends on Home", async () => {
    const { nextBlocked } = await onboard(page, server.base, { cityId: tashkent.id });
    assert.equal(nextBlocked, true);
    assert.match(await page.locator(".topline h1").textContent(), /Tester/);
  });

  test("a chapter with a real photo upload completes and keeps the photo", async () => {
    await playPlace(page, server.base, hazratiImam, { realPhoto: true });
    assert.equal(await page.locator(".collect-card.big").isVisible(), true);
    await page.goto(`${server.base}/app/#/place/${hazratiImam.id}`);
    await page.waitForSelector(".photo-thumb:not([hidden])", { timeout: 5000 });
    assert.equal(await page.locator(".photo-thumb:not([hidden])").count(), 1);
  });

  test("Chorsu: a wrong riddle is refused, the secret word works, the coupon unlocks", async () => {
    let wrongToast = false;
    await playPlace(page, server.base, chorsu, { onWrongRiddle: async () => { wrongToast = (await toastTexts(page)).some((t) => /not quite/i.test(t)); } });
    assert.equal(wrongToast, true, "expected a 'Not quite' toast after a wrong riddle answer");
    assert.ok((await localState(page)).coupons["tas-bakery"]);
  });

  test("progress syncs to the server without the photo", async () => {
    await waitSynced(page);
    const deviceId = await page.evaluate(() => JSON.parse(localStorage.getItem("uzq2-device")));
    const device = readDevice(server.dbFile, deviceId);
    assert.equal(device.state.xp, (await localState(page)).xp);
    assert.doesNotMatch(JSON.stringify(device.events), /data:image/);
  });

  test("the daily quest can be completed from Home", async () => {
    await page.goto(`${server.base}/app/#/`);
    await page.locator("[data-daily]").click();
    await page.waitForSelector(".daily .done-line");
    assert.equal(Object.keys((await localState(page)).dailies).length, 1);
  });

  test("a back-dated claim the server rejects is removed from the phone", async () => {
    const before = await localState(page);
    const old = Date.now() - 3 * 86400000;
    // Pretend an old client recorded a daily for three days ago.
    await page.evaluate(({ old, dailyId }) => {
      const event = { id: "evt-backdated-daily-1", type: "daily", cityId: "tashkent", dailyId, at: old };
      const push = (key) => localStorage.setItem(key, JSON.stringify([...JSON.parse(localStorage.getItem(key) ?? "[]"), event]));
      push("uzq3-log"); push("uzq3-outbox");
      const state = JSON.parse(localStorage.getItem("uzq3-state"));
      state.xp += 75;
      state.dailies[new Date(old + 5 * 3600000).toISOString().slice(0, 10)] = { at: old, dailyId, cityId: "tashkent" };
      localStorage.setItem("uzq3-state", JSON.stringify(state));
    }, { old, dailyId: dailyFor(tashkent, dayKey(old)).id });
    await page.reload();
    await waitSynced(page);
    await page.waitForFunction((xp) => JSON.parse(localStorage.getItem("uzq3-state")).xp === xp, before.xp, { timeout: 8000 });
    assert.deepEqual(Object.keys((await localState(page)).dailies), Object.keys(before.dailies));
    assert.ok((await toastTexts(page)).some((t) => /could not verify/i.test(t)));
  });

  test("turning test mode off hides the shortcuts", async () => {
    await page.goto(`${server.base}/app/#/profile`);
    assert.equal(await page.locator("#test-mode").isEnabled(), true);
    await page.locator("#test-mode").uncheck();
    await page.goto(`${server.base}/app/#/place/${tashkent.places[3].id}`);
    await page.locator("[data-start]").click();
    assert.equal(await page.locator("[data-skip]").count(), 0);
    await page.goto(`${server.base}/app/#/profile`);
    await page.locator("#test-mode").check();
  });

  test("Hamroh answers offline, and 'сумка' is not a money question", async () => {
    await page.goto(`${server.base}/app/#/guide`);
    const ask = async (text, count) => {
      await page.locator("#chat-input").fill(text);
      await page.locator("#chat-input").press("Enter");
      await page.waitForFunction((n) => document.querySelectorAll("#feed .msg.bot:not(.thinking)").length >= n, count);
      return page.locator("#feed .msg.bot").last().textContent();
    };
    assert.match(await ask("What should I eat?", 2), /plov/i);
    assert.doesNotMatch(await ask("Сколько стоит сумка?", 3), /so'm/i);
  });

  test("the admin panel rejects a wrong key and redeems a coupon exactly once", async () => {
    await page.goto(`${server.base}/app/#/coupon/tas-bakery`);
    const code = (await page.locator(".voucher").textContent()).trim();
    const { page: admin, errors: adminErrors } = await openPage(context);
    await admin.goto(`${server.base}/admin`);
    await admin.locator("#key").fill("wrong-key");
    await admin.locator("#open").click();
    await admin.waitForFunction(() => document.querySelector("#login-error").textContent.length > 0);
    assert.match(await admin.locator("#login-error").textContent(), /invalid/i);
    await admin.locator("#key").fill("uzquest-dev-admin");
    await admin.locator("#open").click();
    await admin.waitForSelector("#dashboard:not([hidden])");
    await admin.locator("#voucher").fill(code);
    await admin.locator("#redeem").click();
    await admin.waitForFunction(() => document.querySelector("#redeem-result").textContent.length > 0);
    assert.match(await admin.locator("#redeem-result").textContent(), /^✓/);
    await admin.locator("#redeem").click();
    await admin.waitForFunction(() => /already/i.test(document.querySelector("#redeem-result").textContent));
    assert.deepEqual(adminErrors, []);
  });

  test("admin tables stay inside the screen on a phone", async () => {
    const { page: admin } = await openPage(context);
    await admin.goto(`${server.base}/admin`);
    // The key lives in sessionStorage, which is per tab, so a new tab logs in again.
    await admin.locator("#key").fill("uzquest-dev-admin");
    await admin.locator("#open").click();
    await admin.waitForSelector("#dashboard:not([hidden])");
    assert.equal(await admin.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  });

  test("the landing page renders", async () => {
    const { page: landing, errors: landingErrors } = await openPage(context);
    await landing.goto(`${server.base}/`);
    await landing.waitForSelector("#city-cards .city");
    assert.equal(await landing.locator("#city-cards .city").count(), CITIES.length + 1);
    assert.deepEqual(landingErrors, []);
  });

  test("no JavaScript errors in the app", () => { assert.deepEqual(errors, []); });
});

describe("production server: test shortcuts are locked", () => {
  let server, context, page, errors;
  before(async () => {
    server = await start({ NODE_ENV: "production", ADMIN_KEY: "e2e-production-key", MEET_CODES_FILE: DEV_CODES_FILE });
    context = await newContext(browser);
    ({ page, errors } = await openPage(context));
    await onboard(page, server.base, { cityId: tashkent.id });
  });
  after(async () => { await context?.close(); await server?.stop(); });

  test("no test shortcut is offered for photo or meet quests", async () => {
    await page.goto(`${server.base}/app/#/place/${hazratiImam.id}`);
    await page.locator("[data-start]").click();
    assert.equal(await page.locator("[data-skip]").count(), 0);
    await page.goto(`${server.base}/app/#/place/${chorsu.id}`);
    await page.locator("[data-start]").click();
    await page.waitForSelector("[data-meet]");
    assert.equal(await page.locator("[data-skip]").count(), 0);
  });

  test("the test-mode toggle is disabled and says why", async () => {
    await page.goto(`${server.base}/app/#/profile`);
    assert.equal(await page.locator("#test-mode").isDisabled(), true);
    assert.match(await page.locator(".toggle-row").textContent(), /turned off by the server/i);
  });

  test("no JavaScript errors in the app", () => { assert.deepEqual(errors, []); });
});

describe("offline: the app works without a network and syncs later", () => {
  let server, context, page, errors;
  before(async () => {
    server = await start();
    context = await newContext(browser);
    ({ page, errors } = await openPage(context));
    await onboard(page, server.base, { cityId: tashkent.id });
    // Wait until the service worker has precached the shell and controls the page.
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, { timeout: 10000 });
  });
  after(async () => { await context?.close(); await server?.stop(); });

  test("a reload with no network still opens the app", async () => {
    await context.setOffline(true);
    await page.reload();
    await page.waitForSelector(".level-card");
    assert.equal(await page.locator("#offline").isVisible(), true);
  });

  test("quests can be completed offline and wait in the outbox", async () => {
    await page.goto(`${server.base}/app/#/place/${hazratiImam.id}`);
    await page.locator("[data-start]").click();
    await page.locator(`#q-${hazratiImam.quests[0].id} [data-complete]`).click();
    assert.ok((await localState(page)).quests[hazratiImam.quests[0].id]);
    assert.ok((await outboxSize(page)) >= 2);
  });

  test("coming back online sends the offline progress to the server", async () => {
    await context.setOffline(false);
    await waitSynced(page);
    const deviceId = await page.evaluate(() => JSON.parse(localStorage.getItem("uzq2-device")));
    assert.ok(readDevice(server.dbFile, deviceId).state.quests[hazratiImam.quests[0].id]);
  });

  test("no JavaScript errors in the app", () => { assert.deepEqual(errors, []); });
});

describe("production server answering /health slowly: shortcuts never show", () => {
  let server, context, page, errors, healthAnswered = 0;
  before(async () => {
    server = await start({ NODE_ENV: "production", ADMIN_KEY: "e2e-production-key", MEET_CODES_FILE: DEV_CODES_FILE });
    context = await newContext(browser);
    // A slow network or a busy server: the app renders long before it hears the server's policy.
    await context.route("**/api/v1/health", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2500));
      await route.continue();
      healthAnswered++;
    });
    ({ page, errors } = await openPage(context));
    await onboard(page, server.base, { cityId: tashkent.id });
  });
  after(async () => { await context?.close(); await server?.stop(); });

  test("before the server answers, a first visit offers no test shortcut", async () => {
    await page.goto(`${server.base}/app/#/place/${hazratiImam.id}`);
    await page.locator("[data-start]").click();
    assert.equal(healthAnswered, 0, "this check must run before /health answers");
    assert.equal(await page.locator("[data-skip]").count(), 0);
  });

  test("after it answers, still none, and the toggle is locked", async () => {
    while (healthAnswered === 0) await new Promise((resolve) => setTimeout(resolve, 100));
    await page.goto(`${server.base}/app/#/profile`);
    await page.waitForSelector("#test-mode:disabled");
    await page.goto(`${server.base}/app/#/place/${hazratiImam.id}`);
    assert.equal(await page.locator("[data-skip]").count(), 0);
  });

  test("offline, the last known policy still applies", async () => {
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, { timeout: 10000 });
    await context.setOffline(true);
    await page.reload();
    await page.waitForSelector(".place-head");
    assert.equal(await page.locator("[data-skip]").count(), 0);
    await context.setOffline(false);
  });

  test("no JavaScript errors in the app", () => { assert.deepEqual(errors, []); });
});
