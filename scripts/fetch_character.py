"""Pobiera publiczną postać z oficjalnego API GGG (profil musi być publiczny).

Zapisuje data/character/items.json i passives.json — do porównania postaci ze strategiami.
"""
import json, sys, urllib.error, urllib.parse, urllib.request
from pathlib import Path

ACCOUNT = "DumDum_#0701"
CHARACTER = "Babolinka"
UA = "OAuth poe-crafting/0.1 (contact: github.com/parari8q/poe-crafting)"
OUT = Path(__file__).resolve().parent.parent / "data" / "character"


def post(path, data):
    url = "https://www.pathofexile.com/character-window/" + path + "?" + urllib.parse.urlencode(data)
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")[:500]
        sys.exit(f"{path}: HTTP {e.code} — {body}")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    chars = post("get-characters", {"accountName": ACCOUNT, "realm": "pc"})
    me = next((c for c in chars if c.get("name") == CHARACTER), None)
    if not me:
        sys.exit(f"Nie znaleziono postaci {CHARACTER}. Dostępne: {[c.get('name') for c in chars]}")
    items = post("get-items", {"accountName": ACCOUNT, "character": CHARACTER, "realm": "pc"})
    passives = post("get-passive-skills", {"accountName": ACCOUNT, "character": CHARACTER, "realm": "pc"})
    (OUT / "items.json").write_text(json.dumps(items, ensure_ascii=False), encoding="utf-8")
    (OUT / "passives.json").write_text(json.dumps(passives, ensure_ascii=False), encoding="utf-8")
    print(f"OK: {me}")


if __name__ == "__main__":
    main()
