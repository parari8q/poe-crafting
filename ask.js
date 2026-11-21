// "Zapytaj w Claude": składa pytanie z aktualnymi cenami i otwiera Claude (bez API, w ramach subskrypcji).
(() => {
  const $ = (id) => document.getElementById(id);
  // Podstawowe waluty do craftu, zawsze dołączane do krótkiej wersji pytania
  const CORE = [
    "divine", "chaos", "exalted", "alch", "alt", "aug", "regal", "scour", "annul", "vaal", "fusing", "chrome",
    "jewellers", "blessed", "chance", "fracturing-orb", "veiled-chaos-orb", "eldritch-chaos-orb",
    "eldritch-exalted-orb", "eldritch-orb-of-annulment", "orb-of-dominance", "tempering-orb", "tailoring-orb",
  ];
  const MAX_URL = 7000;

  const INTRO = `Jesteś moim pomocnikiem craftowania w Path of Exile 1. Odpowiadaj po polsku, krótko (czytam na telefonie), nazwy przedmiotów i modów zostaw po angielsku.
Gdy pytam o craft: podaj metodę krok po kroku (baza, item level, czym craftować), oszacuj szanse i średnią liczbę prób, policz koszt w chaos i divine z cen poniżej i porównaj z kupnem gotowego itemu. Jeśli to szacunek, powiedz to. Sprawdź w sieci, jeśli mechanika mogła się zmienić w lidze 3.30.`;

  const line = (i) => `${i.name}: ${i.chaos} c`;

  function build(question, full) {
    const d = window.poeState && window.poeState.data;
    if (!d) return `${INTRO}\n\nPytanie: ${question}`;
    const q = question.toLowerCase();
    // przedmioty wspomniane w pytaniu (po nazwie albo jej ostatnim słowie, np. "Scorn")
    const mentioned = d.items.filter((i) => {
      const n = i.name.toLowerCase();
      const last = n.split(" ").pop();
      return q.includes(n) || (last.length >= 4 && q.includes(last));
    });
    const core = d.items.filter((i) => CORE.includes(i.id));
    const list = full ? d.items : [...new Map([...core, ...mentioned].map((i) => [i.id, i])).values()];
    return `${INTRO}

Liga: ${d.league}. 1 Divine Orb = ${d.divine} c. Ceny z poe.ninja (${d.updated}):
${list.map(line).join("\n")}

Pytanie: ${question}`;
  }

  async function ask() {
    const question = $("askInput").value.trim();
    if (!question) { $("askInput").focus(); return; }
    const full = build(question, true);
    let short = build(question, false);
    let copied = false;
    try { await navigator.clipboard.writeText(full); copied = true; } catch (e) {}
    let url = "https://claude.ai/new?q=" + encodeURIComponent(short);
    if (url.length > MAX_URL) url = "https://claude.ai/new?q=" + encodeURIComponent(build(question, false).slice(0, 3000));
    window.open(url, "_blank", "noopener");
    const msg = $("askMsg");
    msg.hidden = false;
    msg.textContent = copied
      ? "Claude otwarty z pytaniem i najważniejszymi cenami. Pełna lista cen jest w schowku: jeśli pole w Claude jest puste albo chcesz wszystkie ceny, po prostu wklej."
      : "Claude otwarty z pytaniem i najważniejszymi cenami.";
  }

  $("askBtn").addEventListener("click", ask);
  document.querySelector(".ask-chips").addEventListener("click", (e) => {
    if (e.target.classList.contains("ask")) { $("askInput").value = e.target.textContent; $("askInput").focus(); }
  });
  window.poeAskBuild = build; // do testów
})();
