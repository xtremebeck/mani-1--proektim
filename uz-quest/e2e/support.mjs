// Shared helpers for the browser tests: launching Chromium and playing the app through its UI.
import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEV_CODES } from "../backend/test/support/server.mjs";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// CHROMIUM_PATH lets you reuse a browser you already have instead of `npx playwright install chromium`.
export const launch = () => chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

// Console noise from third-party hosts (map tiles, fonts, CDN) is not an app bug, and is
// expected when the browser is offline.
const NETWORK_NOISE = /tile\.openstreetmap|fonts\.g|cdn\.jsdelivr|net::ERR_|Failed to load resource/;

// A phone-sized page that records every JavaScript error it sees.
export async function openPage(context) {
  const page = await context.newPage();
  const errors = [];
  page.on("console", (message) => { if (message.type() === "error" && !NETWORK_NOISE.test(message.text())) errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  return { page, errors };
}

export const newContext = (browser) => browser.newContext({ viewport: { width: 400, height: 860 }, locale: "en-US" });

export const localState = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("uzq3-state")));
export const outboxSize = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("uzq3-outbox") ?? "[]").length);
export const toastTexts = (page) => page.locator("#toasts .toast").allTextContents();

export async function waitSynced(page) {
  await page.waitForFunction(() => JSON.parse(localStorage.getItem("uzq3-outbox") ?? "[]").length === 0, null, { timeout: 8000 });
}

// Walks through onboarding. Returns whether Next was disabled before an interest was picked.
export async function onboard(page, base, { cityId, name = "Tester" }) {
  await page.goto(`${base}/app/`);
  await page.locator("[data-lang=en]").click();
  await page.locator("[data-next]").click();
  await page.locator("#name").fill(name);
  await page.locator("[data-next]").click();
  await page.locator(`[data-city=${cityId}]`).click();
  await page.locator("[data-next]").click();
  await page.waitForSelector("[data-interest]");
  const nextBlocked = await page.locator("[data-next]").isDisabled();
  await page.locator("[data-interest=history]").click();
  await page.locator("[data-next]").click();
  await page.waitForSelector(".level-card");
  return { nextBlocked };
}

// Completes every open quest of a place through the UI, the way a traveller would.
// realPhoto: upload a real image for the first photo quest instead of skipping it.
// onWrongRiddle: when given, a wrong riddle answer is tried first and this runs right after.
export async function playPlace(page, base, place, { realPhoto = false, onWrongRiddle = null } = {}) {
  await page.goto(`${base}/app/#/place/${place.id}`);
  await page.waitForSelector(".place-head");
  if (await page.locator("[data-start]").count()) await page.locator("[data-start]").click();
  let photoUploaded = false;
  for (const quest of place.quests) {
    if (page.url().includes("#/done/")) break;
    const card = page.locator(`#q-${quest.id}`);
    if (await card.evaluate((el) => el.classList.contains("done"))) continue;
    switch (quest.type) {
      case "quiz": await card.locator(`[data-answer="${quest.answer}"]`).click(); break;
      case "riddle":
        if (onWrongRiddle) {
          await card.locator("input").fill("definitely-wrong");
          await card.locator("input").press("Enter");
          await onWrongRiddle();
          onWrongRiddle = null;
        }
        await card.locator("input").fill(quest.answers[0].toUpperCase());
        await card.locator("input").press("Enter");
        break;
      case "meet": await card.locator("input").fill(DEV_CODES[quest.id]); await card.locator("input").press("Enter"); break;
      case "timeline": for (const i of quest.order) await page.locator(`#q-${quest.id} [data-pick="${i}"]`).click(); break;
      case "hunt": await card.locator("[data-simulate]").click(); break;
      case "photo":
        if (realPhoto && !photoUploaded) {
          const [chooser] = await Promise.all([page.waitForEvent("filechooser"), card.locator("[data-photo]").click()]);
          await chooser.setFiles(path.join(ROOT, "public/assets/screens/home.jpg"));
          photoUploaded = true;
        } else await card.locator("[data-skip]").click();
        break;
      default: await card.locator("[data-complete]").click();
    }
    await page.waitForFunction((id) => JSON.parse(localStorage.getItem("uzq3-state")).quests[id] || location.hash.startsWith("#/done/"), quest.id, { timeout: 5000 });
  }
  await page.waitForURL(`**/#/done/${place.id}`, { timeout: 5000 });
  await page.waitForSelector(".complete");
}
