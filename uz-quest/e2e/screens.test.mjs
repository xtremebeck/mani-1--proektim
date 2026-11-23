// Browser tests for the screens the first-session walkthrough does not reach: finishing a
// city, the wallet, the passport, explore and the map, the detox timer, languages, reset and
// a treasure hunt driven by live GPS.
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { CITIES, OFFERS } from "../public/shared/content.mjs";
import { DEV_CODES, start } from "../backend/test/support/server.mjs";
import { launch, localState, newContext, onboard, openPage, outboxSize, playPlace, readStore, waitSynced } from "./support.mjs";

const tashkent = CITIES.find((city) => city.id === "tashkent");
const samarkand = CITIES.find((city) => city.id === "samarkand");
let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser?.close(); });

describe("a traveller who finishes Tashkent", () => {
  let server, context, page, errors;
  before(async () => {
    server = await start();
    context = await newContext(browser);
    ({ page, errors } = await openPage(context));
    await onboard(page, server.base, { cityId: tashkent.id });
    for (const [i, place] of tashkent.places.entries()) await playPlace(page, server.base, place, { realPhoto: i === 0 });
  });
  after(async () => { await context?.close(); await server?.stop(); });

  test("the last chapter shows the finale and offers the next city", async () => {
    assert.match(await page.locator(".finale").textContent(), /\S/);
    assert.equal(await page.locator(`[data-other=${samarkand.id}]`).count(), 1);
  });

  test("the city screen issues a voucher once", async () => {
    await page.goto(`${server.base}/app/#/city/${tashkent.id}`);
    await page.waitForSelector(".certificate");
    assert.equal(await page.locator(".certificate li").count(), tashkent.places.length);
    await page.locator("[data-claim]").click();
    const voucher = (await page.locator(".voucher").textContent()).trim();
    assert.match(voucher, /^UZQ-TAS-/);
    assert.equal(await page.locator("[data-claim]").count(), 0);
    assert.equal((await localState(page)).rewards[tashkent.id].voucher, voucher);
  });

  test("the wallet lists every Tashkent coupon and keeps Samarkand's locked", async () => {
    await page.goto(`${server.base}/app/#/rewards`);
    await page.waitForSelector(".coupon-list");
    const unlocked = await page.locator("a.coupon:not(.locked)").count();
    const locked = await page.locator("a.coupon.locked").count();
    assert.equal(unlocked, OFFERS.filter((o) => o.cityId === "tashkent").length);
    assert.equal(locked, OFFERS.filter((o) => o.cityId === "samarkand").length);
    assert.match(await page.locator(".voucher").first().textContent(), /^UZQ-TAS-/);
  });

  test("the passport shows every stamp, card and the photo journal", async () => {
    await page.goto(`${server.base}/app/#/passport`);
    await page.waitForSelector(".stamp-grid");
    assert.equal(await page.locator(".mini-stamp.on:not(.gift)").count(), tashkent.places.length);
    assert.equal(await page.locator(".card-grid .collect-card:not(.locked)").count(), tashkent.places.length);
    assert.ok(await page.locator(".badge.on").count() >= 3, "first quest, first place and Tashkent badges");
    await page.waitForSelector("#journal figure img");
    assert.equal(await page.locator("#journal figure").count(), 1);
  });

  test("Home switches to Samarkand from the finished-city card", async () => {
    await page.goto(`${server.base}/app/#/`);
    await page.locator(`[data-other=${samarkand.id}]`).click();
    await page.waitForFunction((name) => document.querySelector(".city-switch")?.textContent.includes(name), samarkand.name.en);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("uzq2-profile")).cityId), samarkand.id);
  });

  test("explore filters by interest and shows a map", async () => {
    await page.goto(`${server.base}/app/#/explore`);
    await page.waitForSelector(".compact-list .place-card");
    assert.equal(await page.locator(".compact-list .place-card").count(), samarkand.places.length);
    await page.locator("[data-filter=food]").click();
    const food = samarkand.places.filter((p) => p.interests.includes("food")).length;
    await page.waitForFunction((n) => document.querySelectorAll(".compact-list .place-card").length === n, food);
    await page.locator("[data-filter=all]").click();
    await page.locator("[data-mode=map]").click();
    await page.waitForSelector("#map");
    // Leaflet comes from a CDN; without it the app falls back to a list inside the map box.
    await page.waitForFunction(() => document.querySelector("#map .leaflet-marker-icon, #map .place-card"), null, { timeout: 10000 });
    const markers = await page.locator("#map .leaflet-marker-icon").count();
    const fallback = await page.locator("#map .place-card").count();
    assert.equal(markers || fallback, samarkand.places.length);
  });

  test("the digital detox pays out after 20 minutes and the server accepts it", async () => {
    // Pretend the timer was started 21 minutes ago instead of waiting.
    await page.evaluate(() => localStorage.setItem("uzq2-detox", JSON.stringify(Date.now() - 21 * 60000)));
    await page.goto(`${server.base}/app/#/`);
    const before = (await localState(page)).xp;
    await page.locator("[data-claim]").click();
    await page.waitForSelector(".detox .tag");
    assert.equal((await localState(page)).xp, before + 60);
    await waitSynced(page);
    const deviceId = await page.evaluate(() => JSON.parse(localStorage.getItem("uzq2-device")));
    assert.equal(Object.keys((await readStore(server.dataFile)).devices[deviceId].state.detox).length, 1);
  });

  test("the language can be switched to Uzbek and Russian", async () => {
    await page.goto(`${server.base}/app/#/profile`);
    await page.locator("[data-lang=uz]").click();
    assert.equal(await page.locator("[data-i18n=navHome]").textContent(), "Asosiy");
    await page.locator("[data-lang=ru]").click();
    assert.equal(await page.locator("[data-i18n=navHome]").textContent(), "Главная");
    assert.equal(await page.evaluate(() => document.documentElement.lang), "ru");
    await page.locator("[data-lang=en]").click();
  });

  test("reset wipes progress and photos and returns to onboarding", async () => {
    await page.goto(`${server.base}/app/#/profile`);
    page.once("dialog", (dialog) => dialog.accept());
    await page.locator("[data-reset]").click();
    await page.waitForSelector(".onboard");
    assert.equal((await localState(page))?.xp ?? 0, 0);
    const photoCount = await page.evaluate(() => new Promise((resolve) => {
      const request = indexedDB.open("uzquest-photos", 1);
      request.onsuccess = () => { const all = request.result.transaction("photos").objectStore("photos").getAll(); all.onsuccess = () => resolve(all.result.length); };
    }));
    assert.equal(photoCount, 0);
  });

  test("no JavaScript errors in the app", () => { assert.deepEqual(errors, []); });
});

describe("treasure hunt with live GPS", () => {
  const place = tashkent.places.find((p) => p.quests.some((q) => q.type === "hunt"));
  const hunt = place.quests.find((q) => q.type === "hunt");
  let server, context, page, errors;
  before(async () => {
    server = await start();
    context = await browser.newContext({ viewport: { width: 400, height: 860 }, locale: "en-US", permissions: ["geolocation"], geolocation: { latitude: hunt.lat + 0.02, longitude: hunt.lng, accuracy: 10 } });
    ({ page, errors } = await openPage(context));
    await onboard(page, server.base, { cityId: tashkent.id });
    await page.goto(`${server.base}/app/#/place/${place.id}`);
    await page.locator("[data-start]").click();
    await page.locator(`[data-hunt=${hunt.id}]`).click();
  });
  after(async () => { await context?.close(); await server?.stop(); });

  test("about 2 km away the radar says cold", async () => {
    await page.waitForSelector(".hunt-panel.cold");
    assert.match(await page.locator("#hunt-status").textContent(), /cold/i);
  });

  test("about 500 m away it turns warm", async () => {
    await context.setGeolocation({ latitude: hunt.lat + 0.005, longitude: hunt.lng, accuracy: 10 });
    await page.waitForSelector(".hunt-panel.warm");
  });

  test("arriving completes the quest with real coordinates, not test mode", async () => {
    await context.setGeolocation({ latitude: hunt.lat, longitude: hunt.lng, accuracy: 10 });
    await page.waitForFunction((id) => JSON.parse(localStorage.getItem("uzq3-state")).quests[id], hunt.id);
    const record = (await localState(page)).quests[hunt.id];
    assert.equal(record.test, false);
    await waitSynced(page);
    const deviceId = await page.evaluate(() => JSON.parse(localStorage.getItem("uzq2-device")));
    const event = (await readStore(server.dataFile)).devices[deviceId].events.find((e) => e.questId === hunt.id);
    assert.equal(event.lat, hunt.lat);
  });

  test("no JavaScript errors in the app", () => { assert.deepEqual(errors, []); });
});

describe("treasure hunt without location permission", () => {
  const place = tashkent.places.find((p) => p.quests.some((q) => q.type === "hunt"));
  const hunt = place.quests.find((q) => q.type === "hunt");
  let server, context, page, errors;
  before(async () => {
    server = await start();
    context = await newContext(browser); // no geolocation permission granted
    ({ page, errors } = await openPage(context));
    await onboard(page, server.base, { cityId: tashkent.id });
    await page.goto(`${server.base}/app/#/place/${place.id}`);
    await page.locator("[data-start]").click();
  });
  after(async () => { await context?.close(); await server?.stop(); });

  test("a refused permission stops the hunt and says so", async () => {
    await page.locator(`[data-hunt=${hunt.id}]`).click();
    await page.waitForFunction(() => [...document.querySelectorAll("#toasts .toast")].some((n) => /GPS/.test(n.textContent)), null, { timeout: 10000 });
    await page.waitForSelector(`[data-hunt=${hunt.id}]`);
    assert.equal(await page.locator(".hunt-panel").count(), 0);
  });

  test("no JavaScript errors in the app", () => { assert.deepEqual(errors, []); });
});

describe("meet a local: only the server knows the secret word", () => {
  const chorsu = tashkent.places.find((p) => p.quests.some((q) => q.type === "meet"));
  const meet = chorsu.quests.find((q) => q.type === "meet");
  let server, context, page, errors;
  const submit = async (word) => {
    await page.locator(`#q-${meet.id} input`).fill(word);
    await page.locator(`#q-${meet.id} input`).press("Enter");
  };
  const toastSeen = (pattern) => page.waitForFunction((source) => [...document.querySelectorAll("#toasts .toast")].some((n) => new RegExp(source, "i").test(n.textContent)), pattern.source, { timeout: 8000 });
  const meetDone = () => page.evaluate((id) => Boolean(JSON.parse(localStorage.getItem("uzq3-state")).quests[id]), meet.id);
  before(async () => {
    server = await start();
    context = await newContext(browser);
    ({ page, errors } = await openPage(context));
    await onboard(page, server.base, { cityId: tashkent.id });
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, { timeout: 10000 });
    await page.goto(`${server.base}/app/#/place/${chorsu.id}`);
    await page.locator("[data-start]").click();
  });
  after(async () => { await context?.close(); await server?.stop(); });

  test("the app does not know the word", async () => {
    const shipped = await page.evaluate(async () => (await import("/shared/content.mjs")).CITIES.flatMap((c) => c.places.flatMap((p) => p.quests)).filter((q) => q.type === "meet"));
    assert.ok(shipped.length > 0);
    assert.ok(shipped.every((q) => !("code" in q)));
  });

  test("online, a wrong word is refused on the spot and nothing is recorded", async () => {
    await submit("definitely-not-it");
    await toastSeen(/not the secret word/);
    assert.equal(await meetDone(), false);
    assert.equal(await outboxSize(page), 0, "only the start event, already synced");
  });

  test("offline, a wrong word counts for now and is removed once the server sees it", async () => {
    await context.setOffline(true);
    await submit("offline-guess");
    await toastSeen(/checked when you're back online/);
    assert.equal(await meetDone(), true);
    await context.setOffline(false);
    await toastSeen(/could not verify/);
    await waitSynced(page);
    await page.waitForFunction((id) => !JSON.parse(localStorage.getItem("uzq3-state")).quests[id], meet.id);
  });

  test("the right word from the local completes the quest", async () => {
    await page.goto(`${server.base}/app/#/place/${chorsu.id}`);
    await submit(DEV_CODES[meet.id]);
    await page.waitForFunction((id) => JSON.parse(localStorage.getItem("uzq3-state")).quests[id], meet.id);
    await waitSynced(page);
    const deviceId = await page.evaluate(() => JSON.parse(localStorage.getItem("uzq2-device")));
    assert.ok((await readStore(server.dataFile)).devices[deviceId].state.quests[meet.id]);
  });

  test("no JavaScript errors in the app", () => { assert.deepEqual(errors, []); });
});
