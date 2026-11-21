# PoE Crafting

Pomocnik do craftowania w Path of Exile 1: aktualne ceny z poe.ninja, szanse na mody i koszt craftu.

**Strona:** https://parari8q.github.io/poe-crafting/ (po włączeniu GitHub Pages)

## Jak to działa
- `scripts/fetch_prices.py` pobiera ceny walut, esencji, fossili, omenów itp. z poe.ninja dla bieżącej ligi i zapisuje je w `data/prices.json`.
- GitHub Action (`.github/workflows/update-data.yml`) uruchamia skrypt co godzinę i commituje nowe ceny.
- `index.html` + `app.js` to statyczna strona (działa na PC i telefonie), która czyta te dane.

## Plan
1. ✓ Ceny walut (poe.ninja, co godzinę)
2. Kalkulator szans: baza, item level, mody → szansa, liczba prób, koszt (dane modów z RePoE)
3. Poradnik metod: porównanie metod craftu dla danego celu
4. Dobre strategie: koszt craftu vs cena gotowego itemu
