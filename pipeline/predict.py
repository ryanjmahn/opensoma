"""The v0 'virtual cell' model: cross-cell-line transfer, with calibrated confidence.

Both screens measured the same knockdowns for about 2,000 genes. For a knockdown measured
in only one line, we predict the other line's response as `beta * (measured profile)`,
where beta is a single scale factor fitted on the shared knockdowns.

Confidence is calibrated, not guessed: we bin the shared knockdowns by how strong the source
response is, and use the median correlation between predicted and real profiles in that bin.
"""
from dataclasses import dataclass

import numpy as np
import pandas as pd

from process import Screen


@dataclass
class Transfer:
    beta: float
    edges: np.ndarray  # strength bin edges
    calib: np.ndarray  # median Pearson r per bin
    median_r: float
    shuffled_r: float  # same metric with mismatched knockdowns: the 'no skill' baseline
    n: int


def _rowcorr(A: np.ndarray, B: np.ndarray) -> np.ndarray:
    A = A - A.mean(1, keepdims=True)
    B = B - B.mean(1, keepdims=True)
    return (A * B).sum(1) / np.sqrt((A * A).sum(1) * (B * B).sum(1))


def strength(profile: np.ndarray) -> np.ndarray:
    return np.abs(profile).mean(-1)


def fit_transfer(src: Screen, dst: Screen, nbins: int = 5, seed: int = 0) -> Transfer:
    shared = src.X.index.intersection(dst.X.index)
    S, D = src.X.loc[shared].values, dst.X.loc[shared].values
    beta = float((S * D).sum() / (S * S).sum())
    r = _rowcorr(S, D)
    st = strength(S)
    edges = np.quantile(st, np.linspace(0, 1, nbins + 1)[1:-1])
    calib = np.array([np.median(r[np.digitize(st, edges) == b]) for b in range(nbins)])
    perm = np.random.default_rng(seed).permutation(len(shared))
    return Transfer(beta, edges, calib, float(np.median(r)), float(np.median(_rowcorr(S, D[perm]))), len(shared))


def predict(t: Transfer, profile: np.ndarray) -> tuple[np.ndarray, float]:
    conf = float(np.clip(t.calib[np.digitize(strength(profile), t.edges)], 0, 1))
    return t.beta * profile, conf


def pathway_agreement(src: pd.DataFrame, dst: pd.DataFrame) -> dict[str, float]:
    """Per pathway: correlation across shared knockdowns of measured vs. transferred score."""
    shared = src.index.intersection(dst.index)
    return {c: float(np.corrcoef(src.loc[shared, c], dst.loc[shared, c])[0, 1]) for c in src.columns}
