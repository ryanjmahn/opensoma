# OpenSoma data schema (v1)

Platform-neutral JSON written by `pipeline/export.py` into `web/public/data/`. Any client (web, Swift, Python) can read these files without the web code. `pipeline/export_ssc.py` writes the same formats, with fewer actions, to `data/ssc-slice/`.

All numbers are plain JSON numbers. Indices are 0-based.

## `meta.json`

| Field | Type | Meaning |
|---|---|---|
| `schema` | int | Schema version (`1`). Clients should refuse unknown versions. |
| `generated` | string | ISO date the data was built. |
| `lines` | object | Keyed by line id (`k562`, `rpe1`): `name`, `role` (`"cancer"` or `"healthy"`), `desc`, `sources` (ids in `content/sources.json`), `measured` (number of knocked-down genes). |
| `pathways` | array | Ordered; every `pw` array follows this order. Each: `id`, `label`, `reactome` (pathway names), `n` (genes used), `scale` (95th percentile \|score\| over measured knockdowns; divide by it so ±1 ≈ strong). |
| `readout_genes` | int | Number of genes measured per profile (`genes.json` → `readout`). |
| `top_n` | int | Length of every `top` array. |
| `net_genes` | string[] | Gene order for every `net` array (the genes in `content/network.json`). |
| `validation` | object | Per target line: how well the prediction model did on held-out known cases (`median_r`, `shuffled_r` baseline, `calib` per strength bin, `pathway_r`, `beta`, `n_shared`, `from`). |

## `actions.json`

An array of actions. Each action is:

```json
{ "id": "g:KRAS", "type": "gene", "name": "KRAS", "r": { "k562": LineResult, "rpe1": LineResult } }
```

- `id` is `g:<GENE SYMBOL>` for a CRISPRi knockdown or `d:<drug id>` for a drug (see `content/drugs.json`).

**LineResult**

| Field | When | Meaning |
|---|---|---|
| `m` | always | `1` = 🔬 measured in this cell line; `0` = 🤖 predicted. |
| `c` | predicted | Confidence 0–1, calibrated (see `meta.validation`). The UI shows ≥0.5 as high, ≥0.3 as medium, otherwise low. |
| `approx` | drugs | `1` = drug approximated by knocking down its target(s). |
| `p` | measured | Energy-test p-value that the cells changed at all (p ≥ 0.05 → "weak / no clear effect"). |
| `n` | measured | Cells averaged. |
| `kd` | measured | Remaining target mRNA as a fraction of control (can be `null`). |
| `pw` | always | Pathway scores (mean z-score of member genes), in `meta.pathways` order. |
| `top` | always | `[[readoutIndex, z], …]`, the `top_n` most-changed genes by \|z\|. Look up names in `genes.json` → `readout`. |
| `net` | always | z for each gene in `meta.net_genes`, or `null` if that gene isn't in the readout. |

z-scores are relative to unperturbed control cells of the same line (0 = no change). Combinations are not stored: clients add `pw`, `top` and `net` values (additive model) and treat the result as predicted.

## `genes.json`

```json
{ "readout": ["NOC2L", "…"], "info": { "KRAS": { "protein": "…", "fn": "…", "org": "cytoplasm", "acc": "P01116", "cancer": "oncogene" } } }
```

- `org` is one of `nucleus`, `mito`, `er`, `golgi`, `membrane`, `lysosome`, `cytoplasm` (from UniProt subcellular location).
- `cancer` (optional) is `oncogene` or `suppressor` (curated list, `content/cancer-genes.json`).

## Content files (`content/`)

- `drugs.json`, `network.json`, `structures.json`, `sources.json`, `pipeline.json`
- `tours/*.json` and `lessons/*.json`: stories with `steps`, an optional `quiz`, and `sources`. Text fields are either a string or `{simple, student, deep}`. Inline `[@sourceId]` marks a citation.
- `missions/*.json`: `goal` (`cell`, target scaled `pathways`, optional `harmWeight`), `maxMoves`, optional `adapt`, `passScore`.

Scoring (missions): closeness = max(0, 1 − ‖current − goal‖ / ‖goal‖) × 100 over goal pathways (scaled values); score = closeness − harmWeight × mean\|healthy-cell scaled change\| × 100.
