"""Download raw inputs into data/raw/ (gitignored). Safe to re-run: skips files that exist.

Run: python pipeline/download.py
"""
import csv
import io
import ssl
import time
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path

import certifi

SSL = ssl.create_default_context(cafile=certifi.where())  # python.org macOS builds ship without CA certs
RAW = Path(__file__).resolve().parent.parent / "data" / "raw"

# Replogle et al. 2022, figshare+ 10.25452/figshare.plus.20029387, CC BY 4.0.
# "normalized_bulk" = one row per perturbation, values are z-scores vs. control cells.
FILES = {
    "K562_gwps_normalized_bulk_01.h5ad": "https://ndownloader.figshare.com/files/35773217",
    "rpe1_normalized_bulk_01.h5ad": "https://ndownloader.figshare.com/files/35775512",
    # Reactome, CC BY 4.0
    "ReactomePathways.gmt.zip": "https://reactome.org/download/current/ReactomePathways.gmt.zip",
}


def fetch(url: str, dest: Path) -> None:
    if dest.exists():
        return
    print(f"downloading {dest.name} ...")
    tmp = dest.with_suffix(dest.suffix + ".part")
    with urllib.request.urlopen(url, context=SSL) as r, tmp.open("wb") as f:
        while chunk := r.read(1 << 20):
            f.write(chunk)
    tmp.rename(dest)  # rename only after a complete download, so a crash never leaves a half file


def fetch_uniprot(genes: list[str]) -> dict[str, dict]:
    """Reviewed human UniProt entries for the given gene symbols, cached in data/raw/uniprot.tsv."""
    cache = RAW / "uniprot.tsv"
    rows: dict[str, dict] = {}
    if cache.exists():
        with cache.open() as f:
            rows = {r["gene"]: r for r in csv.DictReader(f, delimiter="\t")}
    todo = [g for g in sorted(set(genes)) if g not in rows]
    fields = "accession,gene_primary,protein_name,cc_function,cc_subcellular_location"
    for i in range(0, len(todo), 80):
        batch = todo[i : i + 80]
        q = "(" + " OR ".join(f"gene_exact:{g}" for g in batch) + ") AND organism_id:9606 AND reviewed:true"
        url = "https://rest.uniprot.org/uniprotkb/stream?" + urllib.parse.urlencode(
            {"query": q, "fields": fields, "format": "tsv"}
        )
        with urllib.request.urlopen(url, timeout=60, context=SSL) as r:
            text = r.read().decode()
        for rec in csv.DictReader(io.StringIO(text), delimiter="\t"):
            g = rec["Gene Names (primary)"]
            if g in batch and g not in rows:
                rows[g] = {
                    "gene": g,
                    "accession": rec["Entry"],
                    "protein": rec["Protein names"],
                    "function": rec["Function [CC]"],
                    "location": rec["Subcellular location [CC]"],
                }
        for g in batch:  # remember misses so we don't re-query them
            rows.setdefault(g, {"gene": g, "accession": "", "protein": "", "function": "", "location": ""})
        print(f"uniprot {min(i + 80, len(todo))}/{len(todo)}")
        time.sleep(0.3)
    with cache.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["gene", "accession", "protein", "function", "location"], delimiter="\t")
        w.writeheader()
        w.writerows(rows.values())
    return rows


def main() -> None:
    RAW.mkdir(parents=True, exist_ok=True)
    for name, url in FILES.items():
        fetch(url, RAW / name)
    gmt = RAW / "ReactomePathways.gmt"
    if not gmt.exists():
        zipfile.ZipFile(RAW / "ReactomePathways.gmt.zip").extractall(RAW)
    print("done")


if __name__ == "__main__":
    main()
