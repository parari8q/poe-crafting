"""Opisy przedmiotów z RePoE (dane wyciągnięte z plików gry).

Dla każdego przedmiotu z data/prices.json zapisuje opis, sposób użycia i rozmiar stacka,
a dla esencji listę gwarantowanych modów per slot. Wynik: data/items.json.
Odświeżane raz na dobę (dane gry zmieniają się tylko z patchami).
"""
import json
import time
import urllib.request
from pathlib import Path

REPOE = "https://repoe-fork.github.io"
UA = "poe-crafting (github.com/parari8q/poe-crafting)"
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "items.json"
MAX_AGE = 24 * 3600


def get(name):
    req = urllib.request.Request(f"{REPOE}/{name}", headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.load(r)


def main():
    if OUT.exists() and time.time() - OUT.stat().st_mtime < MAX_AGE and not __import__("os").environ.get("FORCE"):
        print("Opisy są świeże, pomijam.")
        return
    wanted = {i["name"] for i in json.loads((ROOT / "data" / "prices.json").read_text(encoding="utf-8"))["items"]}
    base = get("base_items.min.json")
    essences = get("essences.min.json")
    mods = get("mods.min.json")

    out = {}
    for meta, b in base.items():
        name = b.get("name")
        if name not in wanted or b.get("release_state") != "released" or name in out:
            continue
        p = b.get("properties", {})
        entry = {
            "desc": p.get("description", ""),
            "use": p.get("directions", ""),
            "stack": p.get("stack_size"),
            "level": b.get("drop_level"),
        }
        ess = essences.get(meta)
        if ess:
            groups = {}  # tekst moda -> sloty
            for slot, mod_id in ess.get("mods", {}).items():
                text = (mods.get(mod_id) or {}).get("text") or mod_id
                groups.setdefault(text, []).append(slot)
            entry["essence"] = [{"mod": t, "slots": s} for t, s in groups.items()]
        out[name] = entry

    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=0), encoding="utf-8")
    print(f"Zapisano opisy {len(out)}/{len(wanted)} przedmiotów")


if __name__ == "__main__":
    main()
