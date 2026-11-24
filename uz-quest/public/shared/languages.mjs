// The languages the app, the website and the guide speak. Add a language here and give it a file
// in shared/lang/ (except the original three, whose texts live inline in the content and UI files).
export const LANGUAGES = [
  { code: "uz", name: "O'zbekcha" },
  { code: "en", name: "English" },
  { code: "ru", name: "Русский" },
  { code: "tr", name: "Türkçe" },
  { code: "zh", name: "中文" }
];
export const LANGUAGE_CODES = LANGUAGES.map((language) => language.code);

// The supported language a browser or Telegram language code (e.g. "ru-RU", "zh-Hans") asks for, or English.
export function matchLanguage(code = "") {
  const wanted = String(code).toLowerCase();
  return LANGUAGE_CODES.find((language) => wanted === language || wanted.startsWith(`${language}-`)) ?? "en";
}
