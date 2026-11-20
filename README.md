# OpenSoma

**Google Earth for a cell.** An open-source, browser-based virtual cell: zoom in, turn off a gene or add a drug, and see what happens. An educational tool for cancer biology and drug discovery.

> Educational simulation of lab-grown cells. **Not medical advice.**

- **Explore**: a 3D cell → organelles → pathways → genes → 3D molecules
- **Playground**: knock down genes or add drugs to a cancer cell (K562) and a healthy-like cell (RPE1), with undo/timeline
- ●/◐ Every result is labeled **measured** (real Perturb-seq data) or **predicted** (with calibrated confidence)
- **Learn**: 6 guided tours and 4 drug-discovery lessons with quizzes
- **Missions**: find the target, calm it down, do no harm, resistance strikes back
- **Teachers**: shareable links and printable worksheets

## Repo layout

| Folder | What's in it |
|---|---|
| `pipeline/` | Python: download raw data → process → predict → export static JSON |
| `web/` | The website (Vite + React + TypeScript + Tailwind + three.js + 3Dmol.js) |
| `web/public/data/` | Generated data files the site loads (small, committed) |
| `content/` | Lessons, tours, missions, drugs, network, sources: edit these without touching code |
| `data/SCHEMA.md` | Data format, so other apps (e.g. Swift) can read the same files |
| `tests/` | Pipeline tests (web tests live next to the code in `web/src`) |

## Run the website

```bash
cd web
npm install
npm run dev      # http://localhost:5173
npm test && npm run lint
```

## Rebuild the data (optional, ~600 MB download)

```bash
python3 -m venv .venv && .venv/bin/pip install -r pipeline/requirements.txt
.venv/bin/python pipeline/download.py     # raw data → data/raw/ (gitignored)
.venv/bin/python pipeline/export.py       # → web/public/data/*.json, content/sources.md
.venv/bin/python pipeline/export_ssc.py   # → data/ssc-slice.zip (offline bundle)
.venv/bin/pytest tests
```

## Deploy

Every push to `main` deploys to GitHub Pages (`.github/workflows/deploy.yml`). One-time setup: repo **Settings → Pages → Source: GitHub Actions**.

## Credits and license

Data and software credits: [CREDITS.md](CREDITS.md). Scientific sources: [content/sources.md](content/sources.md). Code license: TBD.
