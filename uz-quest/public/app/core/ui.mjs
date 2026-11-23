// Small DOM and formatting helpers that do not depend on the traveller's profile or language.
export const $ = (selector, root = document) => root.querySelector(selector);
export const all = (selector, root = document) => [...root.querySelectorAll(selector)];
export const esc = (text) => String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const pad = (n) => String(n).padStart(2, "0");
export const formatDistance = (m) => (m < 1000 ? `${Math.round(m / 5) * 5} m` : `${(m / 1000).toFixed(1)} km`);
export const gradient = (place) => `linear-gradient(135deg,${place.colors[0]},${place.colors[1]})`;
export const art = (place, cls = "art") => `<div class="${cls}" style="background:${gradient(place)}">${place.emoji}</div>`;
