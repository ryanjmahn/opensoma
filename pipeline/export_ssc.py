"""Small offline bundle for a native (Swift) app: data/ssc-slice/ and data/ssc-slice.zip.

Same file formats as the website (see data/SCHEMA.md), just fewer actions, plus structures and
one tour + one mission, so everything works with no network.

Run after export.py:  python pipeline/export_ssc.py
"""
import json
import shutil
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from download import SSL  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
WEB_DATA = ROOT / "web" / "public" / "data"
CONTENT = ROOT / "content"
OUT = ROOT / "data" / "ssc-slice"

ACTIONS = [
    # genes: cancer drivers, brakes, and the ones the tour/mission use
    "g:BCR", "g:KRAS", "g:TP53", "g:MDM2", "g:MYC", "g:MTOR", "g:RPTOR", "g:SIRT7", "g:CDK6", "g:CCND3", "g:CDK4",
    "g:CDK1", "g:PLK1", "g:AURKB", "g:ATR", "g:CHEK1", "g:WEE1", "g:MCL1", "g:BCL2L1", "g:HSPA5", "g:PSMB5",
    "g:RPS6", "g:POLR2A", "g:BRD4", "g:DHFR", "g:RRM1", "g:TOP2A", "g:XPO1", "g:EFR3A", "g:HSD17B12",
    # drugs
    "d:imatinib", "d:sotorasib", "d:palbociclib", "d:everolimus", "d:nutlin3a", "d:methotrexate", "d:bortezomib",
    "d:navitoclax", "d:trametinib", "d:etoposide",
]
TOUR = "tours/03-gas-and-brakes.json"
MISSION = "missions/03-do-no-harm.json"
STRUCTURES = ["1IEP", "6OIM", "4OBE", "1TUP", "5L2I", "4HG7"]


def main() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    (OUT / "structures").mkdir(parents=True)
    actions = [a for a in json.loads((WEB_DATA / "actions.json").read_text()) if a["id"] in ACTIONS]
    assert len(actions) == len(ACTIONS), {*ACTIONS} - {a["id"] for a in actions}
    genes = json.loads((WEB_DATA / "genes.json").read_text())
    keep = {a["name"] for a in actions if a["type"] == "gene"} | set(json.loads((WEB_DATA / "meta.json").read_text())["net_genes"])
    genes["info"] = {g: v for g, v in genes["info"].items() if g in keep}

    dump = lambda path, obj: (OUT / path).write_text(json.dumps(obj, separators=(",", ":"), ensure_ascii=False))
    shutil.copy(WEB_DATA / "meta.json", OUT / "meta.json")
    dump("actions.json", actions)
    dump("genes.json", genes)
    for f in ["network.json", "drugs.json", "sources.json", "structures.json", "cancer-genes.json", TOUR, MISSION]:
        (OUT / Path(f).name).write_bytes((CONTENT / f).read_bytes())
    for pdb in STRUCTURES:
        with urllib.request.urlopen(f"https://files.rcsb.org/download/{pdb}.cif", context=SSL) as r:
            (OUT / "structures" / f"{pdb}.cif").write_bytes(r.read())

    zip_path = shutil.make_archive(str(OUT), "zip", OUT)
    size = Path(zip_path).stat().st_size / 1e6
    print(f"{len(actions)} actions, {len(STRUCTURES)} structures -> {zip_path} ({size:.2f} MB)")


if __name__ == "__main__":
    main()
