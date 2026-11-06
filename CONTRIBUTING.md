# Contribuire / Contributing — DevPilot

## 🇮🇹 Italiano

Grazie! Il progetto è pensato per essere compreso e verificato rapidamente: il **core** (`src/core/`) resta sotto le **1.500 righe** e con zero dipendenze di runtime esterne.

1. Apri una issue per discutere modifiche architetturali, nuovi adapter di test o formati di audit.
2. `npm run typecheck && npm test` devono passare (Node ≥ 22, zero dipendenze esterne di runtime).
3. Un test deterministico per ogni parser, regola di evidenza o fix.
4. Header SPDX (`// SPDX-License-Identifier: Apache-2.0`) in ogni nuovo file sorgente.
5. Messaggi di commit in stile [Conventional Commits](https://www.conventionalcommits.org/it/).
6. Firma ogni commit con il DCO: `git commit -s`.

Vedi [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) per i dettagli sul data model e sul motore di riconciliazione delle evidenze.

## 🇬🇧 English

Thanks! The project is designed to be easily audited and extended: the **core** (`src/core/`) stays strictly under **1,500 lines** with zero external runtime dependencies.

1. Open an issue to discuss architectural changes, new test adapters, or audit formats.
2. `npm run typecheck && npm test` must pass (Node ≥ 22, zero external runtime dependencies).
3. One deterministic test for every parser, evidence rule, or bug fix.
4. SPDX header (`// SPDX-License-Identifier: Apache-2.0`) in every new source file.
5. Commit messages following [Conventional Commits](https://www.conventionalcommits.org/).
6. Sign off every commit with the DCO: `git commit -s`.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for details on the data model and evidence reconciliation engine.
