"""Checks on the exported data files and on the pipeline's small pure functions.
Run from the repo root: pytest tests/
"""
import json
import math
import sys
from pathlib import Path

import numpy as np
import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "pipeline"))
DATA = ROOT / "web" / "public" / "data"


@pytest.fixture(scope="module")
def exported():
    load = lambda n: json.loads((DATA / n).read_text())
    return load("meta.json"), load("actions.json"), load("genes.json")


def test_every_action_has_both_lines_with_labels(exported):
    meta, actions, genes = exported
    n_pw, n_net, n_readout = len(meta["pathways"]), len(meta["net_genes"]), len(genes["readout"])
    assert len(actions) > 300
    assert len({a["id"] for a in actions}) == len(actions)
    for a in actions:
        assert set(a["r"]) == set(meta["lines"])
        for r in a["r"].values():
            assert r["m"] in (0, 1)
            if r["m"] == 0:
                assert 0 <= r["c"] <= 1, a["id"]  # every prediction carries a confidence
            assert len(r["pw"]) == n_pw and all(math.isfinite(v) for v in r["pw"])
            assert len(r["top"]) == meta["top_n"]
            assert all(0 <= i < n_readout and math.isfinite(z) for i, z in r["top"])
            assert len(r["net"]) == n_net


def test_drugs_are_never_labeled_measured_or_high_confidence(exported):
    _, actions, _ = exported
    drugs = [a for a in actions if a["type"] == "drug"]
    assert drugs
    for a in drugs:
        for r in a["r"].values():
            assert r["m"] == 0 and r["c"] < 0.5


def test_content_drug_targets_exist(exported):
    _, actions, _ = exported
    names = {a["name"] for a in actions if a["type"] == "gene"}
    for d in json.loads((ROOT / "content" / "drugs.json").read_text()):
        assert set(d["targets"]) <= names, d["id"]


def test_transfer_recovers_scale_on_synthetic_data():
    import pandas as pd
    from predict import fit_transfer, predict
    from process import Screen

    rng = np.random.default_rng(1)
    S = rng.normal(size=(200, 50))
    D = 0.5 * S + rng.normal(scale=0.1, size=S.shape)
    mk = lambda M: Screen(X=pd.DataFrame(M), p=None, cells=None, kd=None)
    t = fit_transfer(mk(S), mk(D))
    assert abs(t.beta - 0.5) < 0.05
    assert t.median_r > 0.9 > t.shuffled_r
    prof, conf = predict(t, S[0])
    assert np.allclose(prof, t.beta * S[0]) and 0.8 < conf <= 1


def test_text_helpers():
    from export import organelle, short_function

    assert organelle("Mitochondrion matrix. Nucleus.") == "mito"
    assert organelle("Nucleus. Cytoplasm.") == "nucleus"
    assert organelle("") == "cytoplasm"
    assert short_function("FUNCTION: Does X (PubMed:123). {ECO:0000269} Does Y.") == "Does X. Does Y."
