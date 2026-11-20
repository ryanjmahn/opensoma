"""Build the static data files the website (and a future Swift app) read. Schema: data/SCHEMA.md

Run: python pipeline/download.py && python pipeline/export.py
Writes: web/public/data/{meta,actions,genes}.json, content/sources.md
"""
import json
import re
import sys
from datetime import date
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from download import fetch_uniprot  # noqa: E402
from predict import fit_transfer, pathway_agreement, predict  # noqa: E402
from process import LINES, PATHWAYS, load_all, load_pathways, pathway_scores  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"
OUT = ROOT / "web" / "public" / "data"
SCHEMA_VERSION = 1
TOP_N = 20
# Drugs whose main effect (DNA damage, being built into DNA) a knockdown can't mimic
POOR_STANDINS = {"etoposide", "topotecan", "gemcitabine"}


def r3(x: float) -> float:
    return round(float(x), 3)


def r2(x: float) -> float:
    return round(float(x), 2)


def organelle(loc: str) -> str:
    keys = [
        ("mito", "Mitochondri"), ("nucleus", "Nucleus"), ("nucleus", "Chromosome"), ("er", "Endoplasmic reticulum"),
        ("golgi", "Golgi"), ("membrane", "Cell membrane"), ("lysosome", "Lysosome"), ("cytoplasm", "Cytoplasm"),
    ]
    hits = [(loc.find(k), org) for org, k in keys if k in loc]
    return min(hits)[1] if hits else "cytoplasm"


def short_function(text: str, limit: int = 260) -> str:
    text = re.sub(r"\{ECO:[^}]*\}", "", text.replace("FUNCTION: ", ""))
    text = re.sub(r"\s*\((PubMed|Ref)[^)]*\)", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    sentences = re.split(r"(?<=\.)\s", text)
    out = ""
    for s in sentences:
        if len(out) + len(s) > limit:
            break
        out += s + " "
    return (out or text[:limit]).strip()


def result(profile: np.ndarray, pw: np.ndarray, readout_idx: dict, net_genes: list[str], **extra) -> dict:
    top = np.argsort(-np.abs(profile))[:TOP_N]
    return {
        **extra,
        "pw": [r3(v) for v in pw],
        "top": [[int(i), r2(profile[i])] for i in top],
        "net": [r2(profile[readout_idx[g]]) if g in readout_idx else None for g in net_genes],
    }


def main() -> None:
    screens, readout = load_all()
    sets = load_pathways(readout)
    pids = list(PATHWAYS)
    W = np.zeros((len(readout), len(pids)), dtype=np.float32)  # pathway averaging matrix: profile @ W = scores
    ridx = {g: i for i, g in enumerate(readout)}
    for j, p in enumerate(pids):
        for g in sets[p]:
            W[ridx[g], j] = 1 / len(sets[p])

    lines = list(LINES)
    other = {lines[0]: lines[1], lines[1]: lines[0]}
    transfer = {dst: fit_transfer(screens[src], screens[dst]) for dst, src in other.items()}

    network = json.loads((CONTENT / "network.json").read_text())
    net_genes = [n["gene"] for n in network["nodes"] if "gene" in n]
    cancer = json.loads((CONTENT / "cancer-genes.json").read_text())["genes"]
    drugs = json.loads((CONTENT / "drugs.json").read_text())

    measured = {k: set(s.X.index) for k, s in screens.items()}
    curated = set(cancer) | set(net_genes) | {t for d in drugs for t in d["targets"]}
    # shortcut: only RPE1-measured + curated genes (~2.4k) to keep files small; add K562-only hits when we split files per action
    action_genes = sorted(measured["rpe1"] | (curated & (measured["k562"] | measured["rpe1"])))

    def gene_result(line: str, g: str):
        s = screens[line]
        if g in measured[line]:
            prof = s.X.loc[g].values
            return prof, None, {"m": 1, "p": r3(s.p[g]), "n": int(s.cells[g]), "kd": r3(s.kd[g]) if s.kd[g] == s.kd[g] else None}
        src = screens[other[line]]
        prof, conf = predict(transfer[line], src.X.loc[g].values)
        return prof, conf, {"m": 0, "c": r3(conf)}

    actions = []
    for g in action_genes:
        res = {}
        for line in lines:
            prof, _conf, extra = gene_result(line, g)
            res[line] = result(prof, prof @ W, ridx, net_genes, **extra)
        actions.append({"id": f"g:{g}", "type": "gene", "name": g, "r": res})

    for d in drugs:
        res = {}
        for line in lines:
            prof = np.zeros(len(readout), dtype=np.float32)
            confs = []
            for t in d["targets"]:
                p_, c_, _ = gene_result(line, t)
                prof += p_
                confs.append(1.0 if c_ is None else c_)
            # A drug is never 'measured' here: it's approximated by knocking down its target(s)
            conf = min(confs) * (0.2 if d["id"] in POOR_STANDINS else 0.45)  # never "high": a knockdown only approximates a drug
            res[line] = result(prof, prof @ W, ridx, net_genes, m=0, c=r3(conf), approx=1)
        actions.append({"id": f"d:{d['id']}", "type": "drug", "name": d["name"], "r": res})

    # Display scale per pathway: 95th percentile |score| over measured knockdowns
    allpw = np.array([a["r"][l]["pw"] for a in actions if a["type"] == "gene" for l in lines if a["r"][l]["m"]])
    scale = np.quantile(np.abs(allpw), 0.95, axis=0)

    pw_scores = {k: pathway_scores(s.X, sets) for k, s in screens.items()}
    validation = {
        dst: {
            "from": src,
            "beta": r3(transfer[dst].beta),
            "n_shared": transfer[dst].n,
            "median_r": r3(transfer[dst].median_r),
            "shuffled_r": r3(transfer[dst].shuffled_r),
            "calib": [r3(c) for c in transfer[dst].calib],
            "pathway_r": {k: r3(v) for k, v in pathway_agreement(pw_scores[src], pw_scores[dst]).items()},
        }
        for dst, src in other.items()
    }

    info_genes = sorted(set(action_genes) | set(net_genes))
    uni = fetch_uniprot(info_genes)
    info = {}
    for g in info_genes:
        u = uni.get(g, {})
        info[g] = {
            "protein": (u.get("protein") or "").split(" (")[0],
            "fn": short_function(u.get("function") or ""),
            "org": organelle(u.get("location") or ""),
            "acc": u.get("accession") or "",
            **({"cancer": cancer[g]} if g in cancer else {}),
        }

    meta = {
        "schema": SCHEMA_VERSION,
        "generated": date.today().isoformat(),
        "lines": {k: {kk: v[kk] for kk in ("name", "role", "desc", "sources")} | {"measured": len(measured[k])} for k, v in LINES.items()},
        "pathways": [
            {"id": p, "label": PATHWAYS[p][0], "reactome": PATHWAYS[p][1], "n": len(sets[p]), "scale": r3(scale[j])}
            for j, p in enumerate(pids)
        ],
        "readout_genes": len(readout),
        "top_n": TOP_N,
        "net_genes": net_genes,
        "validation": validation,
        "sources": ["replogle2022", "replogle2022data", "reactome", "uniprot"],
    }

    OUT.mkdir(parents=True, exist_ok=True)
    dump = lambda name, obj: (OUT / name).write_text(json.dumps(obj, separators=(",", ":"), ensure_ascii=False))
    dump("meta.json", meta)
    dump("actions.json", actions)
    dump("genes.json", {"readout": readout, "info": info})
    write_sources_md()
    for f in sorted(OUT.glob("*.json")):
        print(f"{f.name}: {f.stat().st_size / 1e6:.2f} MB")
    print(f"{len(actions)} actions; validation: {json.dumps(validation, indent=1)}")


def write_sources_md() -> None:
    src = json.loads((CONTENT / "sources.json").read_text())
    lines = ["# Sources", "", "Generated from `content/sources.json` by `pipeline/export.py`. Edit the JSON, not this file.", ""]
    for kind in ("data", "science", "textbook", "public", "software"):
        items = [(k, v) for k, v in src.items() if v["kind"] == kind]
        if items:
            lines += [f"## {kind.title()}", ""] + [f"- **{k}**: {v['cite']} <{v['url']}>" for k, v in items] + [""]
    (CONTENT / "sources.md").write_text("\n".join(lines))


if __name__ == "__main__":
    main()
