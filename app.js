// PoE Crafting: ceny z data/prices.json (aktualizowane przez GitHub Actions)
const state = { data: null, cat: "Waluty", q: "", inDiv: false };
window.poeState = state;

const $ = (id) => document.getElementById(id);

function fmt(chaos) {
  if (state.inDiv && state.data.divine) {
    const d = chaos / state.data.divine;
    return (d >= 10 ? d.toFixed(1) : d.toFixed(2)) + " div";
  }
  if (chaos >= 100) return Math.round(chaos) + " c";
  if (chaos >= 1) return chaos.toFixed(1) + " c";
  return chaos.toFixed(2) + " c";
}

function renderCats() {
  const cats = ["Wszystko", ...new Set(state.data.items.map((i) => i.category))];
  $("cats").innerHTML = cats
    .map((c) => `<button class="chip${c === state.cat ? " active" : ""}" data-cat="${c}">${c}</button>`)
    .join("");
}

function renderRows() {
  const q = state.q.trim().toLowerCase();
  const rows = state.data.items.filter(
    (i) => (q ? i.name.toLowerCase().includes(q) : state.cat === "Wszystko" || i.category === state.cat)
  );
  rows.sort((a, b) => b.chaos - a.chaos);
  $("rows").innerHTML =
    rows
      .map((i) => {
        const ch = i.change7d;
        const chTxt = ch == null ? "" : `<span class="${ch >= 0 ? "up" : "down"}">${ch > 0 ? "+" : ""}${ch}%</span>`;
        return `<tr data-id="${i.id}">
          <td><div class="item"><img src="${i.icon}" alt="" loading="lazy"><div>${i.name}${
          q ? `<div class="cat">${i.category}</div>` : ""
        }</div></div></td>
          <td class="num">${fmt(i.chaos)}</td>
          <td class="num">${chTxt}</td>
        </tr>`;
      })
      .join("") || `<tr><td colspan="3" class="cat">Brak wyników</td></tr>`;
}

async function load() {
  try {
    const r = await fetch("data/prices.json", { cache: "no-store" });
    state.data = await r.json();
  } catch (e) {
    $("meta").textContent = "Nie udało się wczytać cen.";
    return;
  }
  const d = state.data;
  const when = new Date(d.updated).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" });
  $("meta").textContent = `Liga ${d.league} · 1 div = ${Math.round(d.divine)} c · aktualizacja ${when}`;
  renderCats();
  renderRows();
  loadFarming();
}

// ---- Farming: strategie z data/strategies.json + ceny na żywo ----
const DIFF = ["", "bardzo łatwa", "łatwa", "średnia", "trudna", "bardzo trudna"];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

async function loadFarming() {
  let s;
  try {
    s = await (await fetch("data/strategies.json", { cache: "no-store" })).json();
  } catch (e) {
    $("farmNote").textContent = "Nie udało się wczytać strategii.";
    return;
  }
  const byId = Object.fromEntries(state.data.items.map((i) => [i.id, i]));
  window.poeStrategies = s;
  $("farmNote").textContent = `Liga ${s.league} · stan na ${s.updated}. ${s.note}`;
  const list = (arr) => `<ul>${arr.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
  $("farmList").innerHTML = s.strategies
    .map((st) => {
      const dots = "●".repeat(st.difficulty) + `<span class="off">${"●".repeat(5 - st.difficulty)}</span>`;
      const prices = (st.keyItems || [])
        .map((id) => byId[id])
        .filter(Boolean)
        .map((i) => `<span class="price-chip" data-id="${i.id}" style="cursor:pointer"><img src="${i.icon}" alt="">${esc(i.name)}: <b>${fmt(i.chaos)}</b></span>`)
        .join("");
      return `<details class="card">
        <summary>
          <div class="top"><h3>${esc(st.name)}</h3><span class="dots" title="Trudność">${dots}</span></div>
          <div class="stats">${esc(st.divh)} · trudność: ${DIFF[st.difficulty]}</div>
        </summary>
        <div class="body">
          <p>${esc(st.why)}</p>
          ${prices ? `<h4>Kluczowe ceny teraz</h4><div>${prices}</div>` : ""}
          <h4>Inwestycja</h4><p>${esc(st.investment)}</p>
          <h4>Build</h4><p>${esc(st.build)}</p>
          <h4>Co jest potrzebne</h4>${list(st.needs)}
          <h4>Na co uważać</h4>${list(st.tips)}
          <h4>Źródła</h4>${st.sources.map((u) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(u)}</a>`).join("<br>")}
        </div>
      </details>`;
    })
    .join("");
}

// ---- Opis przedmiotu (dane z RePoE w data/items.json) ----
const SLOTS = {
  "Amulet": "Amulet", "Ring": "Pierścień", "Belt": "Pas", "Helmet": "Hełm", "Body Armour": "Zbroja",
  "Gloves": "Rękawice", "Boots": "Buty", "Shield": "Tarcza", "Quiver": "Kołczan", "Bow": "Łuk",
  "Staff": "Kostur", "Wand": "Różdżka", "Dagger": "Sztylet", "Claw": "Pazur", "Sceptre": "Berło",
};
const slotPl = (s) => SLOTS[s] || s;
let itemInfo = null;

async function openItem(id) {
  const i = state.data.items.find((x) => x.id === id);
  if (!i) return;
  if (!itemInfo) {
    try { itemInfo = await (await fetch("data/items.json", { cache: "no-store" })).json(); }
    catch (e) { itemInfo = {}; }
  }
  const info = itemInfo[i.name] || {};
  const ch = i.change7d;
  const kv = [
    ["Cena", `${fmt(i.chaos)}${state.inDiv ? "" : state.data.divine ? ` (${(i.chaos / state.data.divine).toFixed(3)} div)` : ""}`],
    ["Zmiana 7 dni", ch == null ? "—" : `<span class="${ch >= 0 ? "up" : "down"}">${ch > 0 ? "+" : ""}${ch}%</span>`],
    ["Kategoria", esc(i.category)],
    info.stack ? ["Stack", info.stack] : null,
    info.level ? ["Drop od poziomu", info.level] : null,
  ].filter(Boolean);
  const ess = info.essence
    ? `<h4>Gwarantowany mod</h4><table class="ess">${info.essence
        .map((e) => `<tr><td>${e.slots.map(slotPl).map(esc).join(", ")}</td><td>${esc(e.mod)}</td></tr>`)
        .join("")}</table>`
    : "";
  $("sheetBody").innerHTML = `
    <div class="sheet-head"><img src="${i.icon}" alt=""><h3>${esc(i.name)}</h3></div>
    ${info.desc ? `<p class="desc">${esc(info.desc)}</p>` : `<p class="use">Brak opisu w danych gry.</p>`}
    ${info.use ? `<p class="use">${esc(info.use)}</p>` : ""}
    <div class="kv">${kv.map(([k, v]) => `<span>${k}</span><span>${v}</span>`).join("")}</div>
    ${ess}`;
  $("sheet").hidden = false;
}
const closeSheet = () => { $("sheet").hidden = true; };
$("rows").addEventListener("click", (e) => { const tr = e.target.closest("tr[data-id]"); if (tr) openItem(tr.dataset.id); });
$("farmList").addEventListener("click", (e) => { const c = e.target.closest("[data-id]"); if (c) { e.preventDefault(); openItem(c.dataset.id); } });
$("sheetClose").addEventListener("click", closeSheet);
$("sheet").addEventListener("click", (e) => { if (e.target.id === "sheet") closeSheet(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSheet(); });

$("search").addEventListener("input", (e) => { state.q = e.target.value; renderRows(); });
$("inDiv").addEventListener("change", (e) => { state.inDiv = e.target.checked; renderRows(); });
$("cats").addEventListener("click", (e) => {
  const c = e.target.dataset.cat;
  if (!c) return;
  state.cat = c; state.q = ""; $("search").value = "";
  renderCats(); renderRows();
});
document.querySelectorAll(".tab").forEach((t) =>
  t.addEventListener("click", () => {
    document.querySelectorAll(".tab, .panel").forEach((el) => el.classList.remove("active"));
    t.classList.add("active");
    $(t.dataset.tab).classList.add("active");
  })
);

load();
