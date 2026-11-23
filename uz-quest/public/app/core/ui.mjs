// DOM and formatting helpers. The text helpers (t, L, …) use the traveller's chosen language.
import { INTERESTS, RARITY } from "../../shared/content.mjs";
import { translate } from "../i18n.mjs";
import { session } from "./session.mjs";

export const $ = (selector, root = document) => root.querySelector(selector);
export const all = (selector, root = document) => [...root.querySelectorAll(selector)];
export const esc = (text) => String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const pad = (n) => String(n).padStart(2, "0");
export const formatDistance = (m) => (m < 1000 ? `${Math.round(m / 5) * 5} m` : `${(m / 1000).toFixed(1)} km`);
export const gradient = (place) => `linear-gradient(135deg,${place.colors[0]},${place.colors[1]})`;
export const art = (place, cls = "art") => `<div class="${cls}" style="background:${gradient(place)}">${place.emoji}</div>`;

export const t = (key, vars) => translate(session.profile.lang, key, vars);
export const L = (value) => value?.[session.profile.lang] ?? value?.en ?? "";
export const formatDate = (ms) => new Date(ms).toLocaleDateString(session.profile.lang === "uz" ? "uz-UZ" : session.profile.lang);
export const interestName = (id) => L(INTERESTS.find((item) => item.id === id)?.name);
export const rarityChip = (rarity) => `<span class="rarity" style="--c:${RARITY[rarity].color}">${esc(L(RARITY[rarity].name))}</span>`;
export const errorText = (code) => (translate(session.profile.lang, `err_${code}`) !== `err_${code}` ? t(`err_${code}`) : t("err_generic"));
