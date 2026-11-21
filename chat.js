// Pomocnik craftowania: czat z Claude przez API Anthropic, bezpośrednio z przeglądarki.
// Klucz API jest zapisywany tylko w localStorage na tym urządzeniu (nigdy w repo).
(() => {
  const MODEL = "claude-sonnet-5-5";
  const KEY_STORE = "poecraft.apiKey";
  const HIST_STORE = "poecraft.chat";
  const $ = (id) => document.getElementById(id);
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} },
  };

  let history = [];
  try { history = JSON.parse(store.get(HIST_STORE) || "[]"); } catch (e) { history = []; }
  let busy = false;

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // Bardzo prosty markdown: nagłówki, pogrubienie, kod, listy, akapity
  function md(text) {
    const lines = esc(text).split("\n");
    let html = "", list = null;
    const inline = (s) => s
      .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
      .replace(/`([^`]+)`/g, "<code>$1</code>");
    const close = () => { if (list) { html += `</${list}>`; list = null; } };
    for (const raw of lines) {
      const l = raw.trimEnd();
      let m;
      if ((m = l.match(/^#{1,4}\s+(.*)/))) { close(); html += `<h4>${inline(m[1])}</h4>`; }
      else if ((m = l.match(/^\s*[-*•]\s+(.*)/))) { if (list !== "ul") { close(); html += "<ul>"; list = "ul"; } html += `<li>${inline(m[1])}</li>`; }
      else if ((m = l.match(/^\s*\d+[.)]\s+(.*)/))) { if (list !== "ol") { close(); html += "<ol>"; list = "ol"; } html += `<li>${inline(m[1])}</li>`; }
      else if (!l.trim()) { close(); }
      else { close(); html += `<p>${inline(l)}</p>`; }
    }
    close();
    return html;
  }

  function systemPrompt() {
    const d = window.poeState && window.poeState.data;
    const prices = d
      ? d.items.map((i) => `${i.name} [${i.category}]: ${i.chaos} c`).join("\n")
      : "(ceny niedostępne)";
    const strategies = window.poeStrategies
      ? window.poeStrategies.strategies.map((s) => `- ${s.name}: ${s.divh}, trudność ${s.difficulty}/5. ${s.why}`).join("\n")
      : "";
    const intro = `Jesteś pomocnikiem craftowania w Path of Exile 1 w apce „PoE Crafting”. Odpowiadasz po polsku, krótko i konkretnie (użytkowniczka często czyta na telefonie). Nazwy przedmiotów, modów i walut zostawiaj po angielsku, tak jak w grze.

Gdy pytanie dotyczy craftu:
1. Podaj metodę krok po kroku (baza, item level, czym craftować: essence, fossile, harvest, bench, altar, eldritch itd.).
2. Oszacuj szanse i średnią liczbę prób, a z tego koszt w chaosach i divine'ach na podstawie AKTUALNYCH cen poniżej. Pokaż krótko obliczenia.
3. Porównaj z kupnem gotowego itemu, jeśli to ma sens, i powiedz wprost, czy craft się opłaca.
Gdy nie znasz dokładnych wag modów, powiedz, że to szacunek. Używaj wyszukiwania w sieci, gdy potrzebujesz aktualnych informacji o lidze 3.30 lub mechanikach, które mogły się zmienić.`;
    return [
      { type: "text", text: intro },
      {
        type: "text",
        text: `Liga: ${d ? d.league : "?"}. 1 Divine Orb = ${d ? d.divine : "?"} c. Ceny z poe.ninja (aktualizacja ${d ? d.updated : "?"}):\n${prices}\n\nStrategie farmienia w apce:\n${strategies}`,
        cache_control: { type: "ephemeral" },
      },
    ];
  }

  function render() {
    const box = $("chatLog");
    if (!history.length) {
      box.innerHTML = `<div class="hint">Zapytaj na przykład:<br>
        <button class="chip ask">Jak tanio zrobić rękawice z life i 2x res?</button>
        <button class="chip ask">Ile kosztuje vaalowanie Gravebindów na Temporal Chains?</button>
        <button class="chip ask">Którą esencję teraz najbardziej opłaca się farmić?</button></div>`;
    } else {
      box.innerHTML = history.map((m) => {
        if (m.role === "user") return `<div class="msg user">${esc(m.content)}</div>`;
        const src = (m.sources || []).length
          ? `<div class="sources">Źródła: ${m.sources.map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title || s.url)}</a>`).join(" · ")}</div>`
          : "";
        return `<div class="msg bot">${md(m.content)}${src}</div>`;
      }).join("");
    }
    if (busy) box.innerHTML += `<div class="msg bot typing">Myślę…</div>`;
    box.scrollTop = box.scrollHeight;
    const hasKey = !!store.get(KEY_STORE);
    $("chatSetup").hidden = hasKey;
    $("chatForm").hidden = !hasKey;
  }

  async function send(text) {
    const key = store.get(KEY_STORE);
    if (!key || busy || !text.trim()) return;
    history.push({ role: "user", content: text.trim() });
    busy = true; render();
    try {
      const messages = history.slice(-12).map((m) => ({ role: m.role, content: m.content }));
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 2000,
          system: systemPrompt(),
          messages,
          tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }],
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ? data.error.message : `HTTP ${r.status}`);
      const blocks = data.content || [];
      const text = blocks.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
      const seen = new Set(), sources = [];
      for (const b of blocks) for (const c of b.citations || []) {
        if (c.url && !seen.has(c.url)) { seen.add(c.url); sources.push({ url: c.url, title: c.title }); }
      }
      history.push({ role: "assistant", content: text || "(pusta odpowiedź)", sources });
    } catch (e) {
      history.pop();
      alertBox(`Nie udało się: ${e.message}`);
      $("chatInput").value = text;
    } finally {
      busy = false;
      store.set(HIST_STORE, JSON.stringify(history.slice(-30)));
      render();
    }
  }

  function alertBox(msg) {
    const el = $("chatError");
    el.textContent = msg; el.hidden = false;
    setTimeout(() => { el.hidden = true; }, 8000);
  }

  $("chatSaveKey").addEventListener("click", () => {
    const v = $("chatKey").value.trim();
    if (!v.startsWith("sk-ant-")) return alertBox("To nie wygląda na klucz API Anthropic (zaczyna się od sk-ant-).");
    store.set(KEY_STORE, v); $("chatKey").value = ""; render();
  });
  $("chatForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const t = $("chatInput").value; $("chatInput").value = ""; send(t);
  });
  $("chatInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("chatForm").requestSubmit(); }
  });
  $("chatLog").addEventListener("click", (e) => { if (e.target.classList.contains("ask")) send(e.target.textContent); });
  $("chatClear").addEventListener("click", () => { history = []; store.set(HIST_STORE, null); render(); });
  $("chatForget").addEventListener("click", () => { store.set(KEY_STORE, null); render(); });

  render();
})();
