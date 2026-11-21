// PoE Crafting: ceny z data/prices.json (aktualizowane przez GitHub Actions)
const state = { data: null, cat: "Waluty", q: "", inDiv: false };

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
        return `<tr>
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
}

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
