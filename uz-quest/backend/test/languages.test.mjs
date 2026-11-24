import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as content from "../../public/shared/content.mjs";
import { LANGUAGE_CODES, matchLanguage } from "../../public/shared/languages.mjs";
import * as turkish from "../../public/shared/lang/tr.mjs";
import * as chinese from "../../public/shared/lang/zh.mjs";
import { STRINGS } from "../../public/app/i18n.mjs";

const TRANSLATIONS = { tr: turkish, zh: chinese };
const placeholders = (text) => [...String(text).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

// Every { uz, en, ru, … } text in the shared content.
function contentTexts() {
  const found = [];
  const walk = (value) => {
    if (!value || typeof value !== "object") return;
    if (typeof value.en === "string" && typeof value.uz === "string") { found.push(value); return; }
    Object.values(value).forEach(walk);
  };
  walk(content);
  return found;
}

// English texts of the offline guide's tips (they live inline in local-guide.mjs).
const guideTips = [...readFileSync(new URL("../../public/app/local-guide.mjs", import.meta.url), "utf8").matchAll(/^\s+en: "((?:[^"\\]|\\.)*)",?$/gm)].map((m) => JSON.parse(`"${m[1]}"`));

// The English landing texts, read from landing.mjs without running its browser code.
function landingEnglish() {
  const source = readFileSync(new URL("../../public/landing.mjs", import.meta.url), "utf8");
  const block = source.slice(source.indexOf("  en: {"), source.indexOf("  uz: {"));
  return Object.fromEntries([...block.matchAll(/(\w+): ("(?:[^"\\]|\\.)*")/g)].map((m) => [m[1], JSON.parse(m[2])]));
}

test("every supported language is wired up", () => {
  assert.deepEqual(LANGUAGE_CODES, ["uz", "en", "ru", "tr", "zh"]);
  for (const lang of LANGUAGE_CODES) assert.ok(STRINGS[lang], `app strings for ${lang}`);
  assert.equal(matchLanguage("zh-Hans-CN"), "zh");
  assert.equal(matchLanguage("tr-TR"), "tr");
  assert.equal(matchLanguage("de"), "en");
  assert.equal(matchLanguage("trk"), "en", "a code only starting with 'tr' is not Turkish");
});

for (const [lang, file] of Object.entries(TRANSLATIONS)) {
  test(`${lang}: every content and guide text is translated, and nothing in the file is stale`, () => {
    const texts = contentTexts();
    const missing = texts.filter((t) => !t[lang]).map((t) => t.en);
    assert.deepEqual(missing, [], `add to shared/lang/${lang}.mjs \`text\``);
    const missingTips = guideTips.filter((en) => !file.text[en]);
    assert.deepEqual(missingTips, [], `offline guide tips missing from shared/lang/${lang}.mjs`);
    const used = new Set([...texts.map((t) => t.en), ...guideTips]);
    const stale = Object.keys(file.text).filter((en) => !used.has(en));
    assert.deepEqual(stale, [], "entries whose English text no longer exists (typo, or the English changed)");
  });

  test(`${lang}: every app, website and bot string is translated with the same placeholders`, () => {
    const check = (english, translated, where) => {
      const missing = Object.keys(english).filter((key) => !(key in translated));
      assert.deepEqual(missing, [], `${where}: missing keys`);
      const extra = Object.keys(translated).filter((key) => !(key in english));
      assert.deepEqual(extra, [], `${where}: keys English does not have`);
      for (const key of Object.keys(english)) assert.deepEqual(placeholders(translated[key]), placeholders(english[key]), `${where}.${key} placeholders`);
    };
    check(STRINGS.en, file.ui, "ui");
    check(landingEnglish(), file.landing, "landing");
    check(["hello", "confirm", "yes", "no", "done", "cancelled", "invalid"].reduce((o, k) => ({ ...o, [k]: "" }), {}), file.bot, "bot");
  });
}
