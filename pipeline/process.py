"""Load the Perturb-seq pseudobulk files into tidy matrices and define pathway gene sets.

AnnData in one line: a matrix X (rows = observations, columns = genes) plus tables
describing the rows (.obs) and columns (.var). Here each row is one CRISPRi knockdown,
averaged over all cells that got that guide, and each value is a z-score: how far that
gene's expression moved compared with unperturbed control cells.
"""
from dataclasses import dataclass
from pathlib import Path

import anndata as ad
import numpy as np
import pandas as pd

RAW = Path(__file__).resolve().parent.parent / "data" / "raw"

LINES = {
    "k562": {
        "file": "K562_gwps_normalized_bulk_01.h5ad",
        "name": "K562",
        "role": "cancer",
        "desc": "Leukemia cells (chronic myeloid leukemia, BCR-ABL1 positive) taken from a patient in 1970 and grown in labs since.",
        "sources": ["lozzio1975", "cellosaurus_k562", "law1993"],
    },
    "rpe1": {
        "file": "rpe1_normalized_bulk_01.h5ad",
        "name": "RPE1",
        "role": "healthy",
        "desc": "Non-cancer retina (pigment epithelium) cells kept dividing with the enzyme telomerase. Our 'healthy-like' comparison.",
        "sources": ["bodnar1998", "cellosaurus_rpe1"],
    },
}

# Pathway id -> (display name, Reactome pathway names whose genes are pooled)
PATHWAYS = {
    "growth": ("Growth signaling", ["Signaling by Receptor Tyrosine Kinases"]),
    "division": ("Cell division", ["Cell Cycle, Mitotic"]),
    "death": ("Cell death", ["Programmed Cell Death"]),
    "dna_repair": ("DNA repair", ["DNA Repair"]),
    "metabolism": ("Energy metabolism", ["Aerobic respiration and respiratory electron transport"]),
    "stress": ("Stress response", ["Unfolded Protein Response (UPR)"]),
    "translation": ("Protein making", ["Translation"]),
}


@dataclass
class Screen:
    X: pd.DataFrame  # perturbed gene x readout gene, z-scores
    p: pd.Series  # energy-test p-value: is there any transcriptional change at all?
    cells: pd.Series  # number of cells averaged
    kd: pd.Series  # remaining target mRNA as a fraction of control (lower = stronger knockdown)


def load_screen(path: Path) -> Screen:
    a = ad.read_h5ad(path)
    target = a.obs.index.str.split("_").str[1]
    keep = np.asarray(target != "non-targeting")
    M = np.asarray(a.X)[keep]
    # A few z-scores are +/-inf (control spread was zero in a batch); treat as no information.
    M = np.clip(np.where(np.isfinite(M), M, 0), -10, 10)
    X = pd.DataFrame(M, columns=a.var["gene_name"].values)
    X = X.loc[:, ~X.columns.duplicated()]
    X["_t"] = target[keep]
    X = X.groupby("_t").mean()  # several guides per gene -> average
    obs = a.obs[keep].assign(_t=target[keep]).groupby("_t")
    return Screen(
        X=X.astype(np.float32),
        p=obs["energy_test_p_value"].min(),
        cells=obs["num_cells_filtered"].sum(),
        kd=obs["fold_expr"].median(),
    )


def load_all() -> tuple[dict[str, Screen], list[str]]:
    screens = {k: load_screen(RAW / v["file"]) for k, v in LINES.items()}
    shared = sorted(set.intersection(*(set(s.X.columns) for s in screens.values())))
    for s in screens.values():
        s.X = s.X[shared]  # same readout genes in both lines, so values are comparable
    return screens, shared


def load_pathways(readout: list[str]) -> dict[str, list[str]]:
    sets: dict[str, list[str]] = {}
    for line in (RAW / "ReactomePathways.gmt").read_text().splitlines():
        name, _id, *genes = line.split("\t")
        sets[name] = genes
    rs = set(readout)
    out = {}
    for pid, (_label, names) in PATHWAYS.items():
        missing = [n for n in names if n not in sets]
        assert not missing, f"Reactome pathway not found: {missing}"
        out[pid] = sorted({g for n in names for g in sets[n]} & rs)
    return out


def pathway_scores(X: pd.DataFrame, sets: dict[str, list[str]]) -> pd.DataFrame:
    """Mean z-score of each pathway's member genes, per perturbation."""
    return pd.DataFrame({pid: X[genes].mean(axis=1) for pid, genes in sets.items()})
