const $ = (selector) => document.querySelector(selector);
const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const when = (ms) => (ms ? new Date(ms).toLocaleString() : "—");
let key = sessionStorage.getItem("uzq-admin-key") ?? "";

async function api(path, options = {}) {
  const response = await fetch(`api/v1/admin/${path}`, { ...options, headers: { "Content-Type": "application/json", "x-admin-key": key, ...options.headers } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Error(data.error?.message ?? `Request failed (${response.status})`);
  return data;
}

async function load() {
  const data = await api("overview");
  sessionStorage.setItem("uzq-admin-key", key);
  $("#login").hidden = true;
  $("#dashboard").hidden = false;
  $("#metrics").innerHTML = [["Travellers", data.metrics.travellers], ["Adventures done", data.metrics.adventures], ["Quests done", data.metrics.quests], ["Average XP", data.metrics.averageXp],
    ...Object.entries(data.languages).map(([lang, count]) => [`Lang · ${lang.toUpperCase()}`, count])]
    .map(([label, value]) => `<div class="metric"><small>${label}</small><strong>${value}</strong></div>`).join("");
  $("#cities").innerHTML = data.cities.map((city) => {
    const max = Math.max(1, ...city.funnel.map((place) => place.started));
    return `<section class="panel"><h2>${escapeHtml(city.name)} funnel</h2>
      <p class="city-meta">${city.started} started · ${city.completed} conquered · ${city.rewardsClaimed} rewards claimed · bars show completed/started per place</p>
      ${city.funnel.map((place) => `<div class="funnel-row"><span>${escapeHtml(place.name)}</span><span class="bar"><i style="width:${(place.completed / max) * 100}%"></i></span><b>${place.completed}/${place.started}</b></div>`).join("")}
    </section>`;
  }).join("");
  $("#vouchers").innerHTML = data.vouchers.map((v) => `<tr><td><code>${v.voucher}</code></td><td>${v.cityId}</td><td>${when(v.at)}</td><td>${v.redeemedAt ? when(v.redeemedAt) : "—"}</td></tr>`).join("") || `<tr><td colspan="4">No vouchers yet</td></tr>`;
  $("#recent").innerHTML = data.recent.map((r) => `<tr><td>${r.id}</td><td>${r.lang}</td><td>${r.level}</td><td>${r.xp}</td><td>${r.adventures}</td><td>${when(r.lastSeenAt)}</td></tr>`).join("") || `<tr><td colspan="6">No travellers yet</td></tr>`;
}

$("#open").addEventListener("click", () => { key = $("#key").value; load().catch((error) => { $("#login-error").textContent = error.message; }); });
$("#key").addEventListener("keydown", (event) => { if (event.key === "Enter") $("#open").click(); });

$("#redeem").addEventListener("click", async () => {
  const out = $("#redeem-result");
  try {
    const result = await api("redeem", { method: "POST", body: JSON.stringify({ voucher: $("#voucher").value }) });
    out.className = "ok";
    out.textContent = `✓ ${result.voucher} redeemed (${result.cityId}). Hand over the reward.`;
    load();
  } catch (error) { out.className = "error"; out.textContent = error.message; }
});

if (key) load().catch(() => { $("#login").hidden = false; });
