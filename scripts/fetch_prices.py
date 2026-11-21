"""Pobiera aktualne ceny walut i materiałów do craftu z poe.ninja (PoE 1).

Wynik: data/prices.json — czytany przez stronę (index.html).
Uruchamiane co godzinę przez GitHub Actions (.github/workflows/update-data.yml).
"""
import json
import sys
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

BASE = "https://poe.ninja/poe1/api"
IMG = "https://web.poecdn.com"
UA = "poe-crafting (github.com/parari8q/poe-crafting)"

# Kategorie z giełdy walut poe.ninja, które przydają się przy craftowaniu
CATEGORIES = {
    "Currency": "Waluty",
    "Essence": "Esencje",
    "Fossil": "Fossile",
    "Resonator": "Rezonatory",
    "Omen": "Omeny",
    "Oil": "Oleje",
    "DeliriumOrb": "Delirium Orby",
    "Fragment": "Fragmenty",
}

OUT = Path(__file__).resolve().parent.parent / "data" / "prices.json"


def get(url: str, tries: int = 3):
    for attempt in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except Exception as e:  # noqa: BLE001
            if attempt == tries - 1:
                raise
            print(f"Błąd {e!r} dla {url}, ponawiam…", file=sys.stderr)
            time.sleep(5 * (attempt + 1))


def current_league() -> str:
    """Bieżąca liga softcore (pierwsza, która nie jest Standard ani Hardcore)."""
    state = get(f"{BASE}/data/index-state")
    for lg in state["economyLeagues"]:
        name = lg["name"]
        if name in ("Standard", "Hardcore") or "Hardcore" in name or lg.get("isPrivate"):
            continue
        return name
    return "Standard"


def main() -> None:
    league = current_league()
    items = []
    divine = None
    for cat, label in CATEGORIES.items():
        try:
            d = get(f"{BASE}/economy/exchange/current/overview?league={league}&type={cat}")
        except Exception as e:  # noqa: BLE001
            print(f"Pomijam {cat}: {e!r}", file=sys.stderr)
            continue
        meta = {i["id"]: i for i in d.get("items", [])}
        for line in d.get("lines", []):
            info = meta.get(line["id"], {})
            chaos = line.get("primaryValue")
            if chaos is None:
                continue
            if line["id"] == "divine":
                divine = chaos
            spark = (line.get("sparkline") or {}).get("totalChange")
            img = info.get("image", "")
            items.append({
                "id": line["id"],
                "name": info.get("name", line["id"]),
                "category": label,
                "chaos": round(chaos, 4),
                "change7d": round(spark, 1) if spark is not None else None,
                "volume": round(line.get("volumePrimaryValue") or 0),
                "icon": (IMG + img) if img.startswith("/") else img,
            })
        time.sleep(1)  # uprzejmie dla poe.ninja

    if not items:
        sys.exit("Nie udało się pobrać żadnych cen — zostawiam stare dane.")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "league": league,
        "updated": datetime.now(timezone.utc).isoformat(timespec="minutes"),
        "divine": divine,
        "items": sorted(items, key=lambda i: (i["category"], -i["chaos"])),
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"Zapisano {len(items)} pozycji dla ligi {league} (divine = {divine}c)")


if __name__ == "__main__":
    main()
