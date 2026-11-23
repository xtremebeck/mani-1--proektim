// Visual feedback: toasts, confetti and the counting XP number.
import { $ } from "./ui.mjs";

function raiseToasts() {
  const box = $("#toasts");
  if (!box.showPopover || !box.children.length) return;
  try { box.hidePopover(); } catch { /* not open */ }
  box.showPopover();
}

export function clearToasts() {
  const box = $("#toasts");
  box.replaceChildren();
  try { box.hidePopover?.(); } catch { /* not open */ }
}

export function toast(text, kind = "") {
  const box = $("#toasts");
  const node = document.createElement("div");
  node.className = `toast ${kind}`;
  node.textContent = text;
  box.append(node);
  raiseToasts();
  setTimeout(() => node.classList.add("leaving"), 2600);
  setTimeout(() => { node.remove(); if (!box.children.length) try { box.hidePopover?.(); } catch { /* ignore */ } }, 3100);
}

export function confetti() {
  const layer = document.createElement("div");
  layer.className = "confetti";
  const colors = ["#ff6b35", "#f7c948", "#2ec4b6", "#7c3aed", "#22c55e", "#fff"];
  layer.innerHTML = Array.from({ length: 70 }, () => `<i style="left:${Math.random() * 100}%;background:${colors[Math.floor(Math.random() * colors.length)]};animation-duration:${1.8 + Math.random() * 1.8}s;animation-delay:${Math.random() * .6}s;transform:rotate(${Math.random() * 360}deg)"></i>`).join("");
  document.body.append(layer);
  setTimeout(() => layer.remove(), 4500);
}

export function countUp(node, target) {
  const start = performance.now();
  const step = (now) => {
    const p = Math.min(1, (now - start) / 900);
    node.textContent = `+${Math.round(target * (1 - (1 - p) ** 3))} XP`;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
