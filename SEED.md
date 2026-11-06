# DevPilot: decision seed / punto di partenza

IT — Scopo: Lo stato del lavoro umano e degli agenti in un repository è disperso. Prima prova: Generare un report locale da Git, issue esportate e risultati dei test con prove cliccabili per ogni stato.

EN — Purpose: Human and agent work status is scattered across a repository. First trial: Generate a local report from Git, exported issues and test results with inspectable evidence for each status.

## Decisioni prese / Decisions made

- **Nome e confini**: DevPilot è una CLI / library locale deterministica che riconcilia evidenze oggettive (commit Git, esiti dei test, issue tracker) senza inventare percentuali di completamento fittizie.
- **Licenza**: Apache-2.0 con NOTICE e attribuzione DCO (`git commit -s`).
- **Standard applicati**: `../_repo-kit/REPO-STANDARDS.md` applicato integralmente (core < 1.500 righe, zero dipendenze runtime, workflow CI con matrice Node 22/24, issue/PR template, donazioni `.github/FUNDING.yml`, marker anti-plagio).
- **Misura di successo osservabile per la prima prova**:
  - Test suite al 100% verde (`npm test`).
  - Parsing di Git log reale, estrazione issue refs, rilevamento commit bot/agenti vs umani.
  - Parser per JUnit XML e JSON test runner.
  - Generazione di report locale da CLI (terminale con link e colori ANSI) ed esportazione dashboard HTML standalone locale per il browser.
  - Ledger verificabile `.devpilot/ledger.json` con approvazione / firma umana esplicita.
