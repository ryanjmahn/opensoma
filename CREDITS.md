# Credits

OpenSoma builds on open data, open software, and published science. Thank you to everyone who made these freely available.

## Data

| What | Used for | License |
|---|---|---|
| Replogle et al. 2022 Perturb-seq (K562 genome-wide, RPE1 essential), [figshare+](https://doi.org/10.25452/figshare.plus.20029387) | All ● measured knockdown results | CC BY 4.0 |
| [Reactome](https://reactome.org) pathway gene sets | Grouping genes into pathways | CC BY 4.0 |
| [UniProt](https://www.uniprot.org) | Protein names, functions, locations | CC BY 4.0 |
| [RCSB Protein Data Bank](https://www.rcsb.org) structures (1IEP, 6OIM, 4OBE, 1TUP, 5L2I, 1U72, 4HG7, 7KK4, 4LVT, 1HVY, 3QX3, 1T8I, 5LF3) | 3D drug–protein views | CC0 |
| [AlphaFold DB](https://alphafold.ebi.ac.uk) | 3D predicted structures for other proteins (loaded on demand) | CC BY 4.0 |
| [Cellosaurus](https://www.cellosaurus.org) | Cell line facts | CC BY 4.0 |

## Software

| What | Used for | License |
|---|---|---|
| [React](https://react.dev) | Web UI | MIT |
| [Vite](https://vite.dev) | Build tool | MIT |
| [Tailwind CSS](https://tailwindcss.com) | Styling | MIT |
| [three.js](https://threejs.org), [react-three-fiber](https://github.com/pmndrs/react-three-fiber), [drei](https://github.com/pmndrs/drei) | 3D cell | MIT |
| [3Dmol.js](https://3dmol.csb.pitt.edu) | Protein structure viewer | BSD-3-Clause |
| [anndata](https://anndata.readthedocs.io), [NumPy](https://numpy.org), [pandas](https://pandas.pydata.org) | Data pipeline | BSD-3-Clause |
| [Vitest](https://vitest.dev), [Testing Library](https://testing-library.com), [oxlint](https://oxc.rs), [pytest](https://pytest.org) | Tests and linting | MIT |

## Considered but not used

- **Arc Institute State** (virtual cell model): weights are CC BY-NC-SA 4.0 (non-commercial only) and need a GPU.
- **KEGG** pathways: licensing restrictions.
- **Tahoe-100M** drug perturbation atlas: large, and it doesn't cover these two cell lines. A candidate for adding real drug data later.

Scientific references for all educational content are in [content/sources.md](content/sources.md).
