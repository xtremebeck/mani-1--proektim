// "Hamroh" AI travel companion. Uses Claude when ANTHROPIC_API_KEY (or another
// Anthropic credential) is configured and @anthropic-ai/sdk is installed;
// otherwise the endpoint reports itself unavailable and the app falls back to
// its built-in offline guide.
import { INTERESTS } from "../../public/shared/content.mjs";
import { findCity, findPlace } from "../../public/shared/engine.mjs";

const MODEL = process.env.GUIDE_MODEL ?? "claude-opus-5";
const LANGUAGE_NAMES = { uz: "Uzbek (Latin script)", en: "English", ru: "Russian" };

let clientPromise = null;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) return Promise.resolve(null);
  clientPromise ??= import("@anthropic-ai/sdk").then(({ default: Anthropic }) => new Anthropic()).catch(() => null);
  return clientPromise;
}

export async function guideAvailable() { return Boolean(await getClient()); }

function systemPrompt(lang) {
  return `You are Hamroh, the friendly travel companion inside UzQuest, a gamified quest app for travellers in Uzbekistan (Tashkent and Samarkand).
Reply in ${LANGUAGE_NAMES[lang] ?? "English"}. Keep answers short and practical: 2-5 sentences, plain text, no markdown headings.
Help with: the story of a place, how to reach the next stop, local food, etiquette, transport (metro, Yandex Go taxi, Afrosiyob train between Tashkent and Samarkand), money (so'm, cards, ATMs) and safety.
Never give away quiz answers; encourage the traveller to discover them on site. When suggesting where to go, prefer places that exist in the app.
If you are not sure about opening hours or prices, say so and suggest checking on site.`;
}

function contextNote({ cityId, placeId, interests, lang }) {
  const city = findCity(cityId);
  const next = findPlace(placeId);
  const pick = (value) => value?.[lang] ?? value?.en;
  const parts = [];
  if (city) parts.push(`The traveller is exploring ${pick(city.name)}. Places in the app: ${city.places.map((p) => p.name.en).join(", ")}.`);
  const likes = (Array.isArray(interests) ? interests : []).map((id) => INTERESTS.find((i) => i.id === id)?.name.en).filter(Boolean);
  if (likes.length) parts.push(`They like: ${likes.join(", ")}.`);
  if (next) parts.push(`The app currently suggests ${next.place.name.en} (${next.place.lat}, ${next.place.lng}). Tip: ${next.place.tip.en} Background: ${next.place.story.en}`);
  else if (city) parts.push("They have finished every adventure in this city.");
  return parts.join(" ");
}

export async function askGuide({ message, history, cityId, placeId, interests, lang }) {
  const client = await getClient();
  if (!client) return null;
  const turns = (Array.isArray(history) ? history : [])
    .filter((turn) => (turn?.role === "user" || turn?.role === "assistant") && typeof turn.text === "string")
    .slice(-8)
    .map((turn) => ({ role: turn.role, content: turn.text.slice(0, 1200) }));
  while (turns.length && turns[0].role !== "user") turns.shift();
  turns.push({ role: "user", content: `[App context: ${contextNote({ cityId, placeId, interests, lang })}]\n\n${message}` });

  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 2000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low" },
    system: systemPrompt(lang),
    messages: turns
  });
  if (response.stop_reason === "refusal") return null;
  const text = response.content.filter((block) => block.type === "text").map((block) => block.text).join("\n").trim();
  return text || null;
}
