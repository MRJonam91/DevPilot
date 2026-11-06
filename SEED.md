# DevPilot — Piano di Sviluppo & Decision Log

IT — Scopo: Lo stato del lavoro umano e degli agenti in un repository è disperso. DevPilot genera un report locale e un registro lavori (work ledger) da Git, issue esportate e risultati dei test con prove ispezionabili e verificabili per ogni stato.

EN — Purpose: Human and agent work status is scattered across a repository. DevPilot generates a local report and work ledger from Git, exported issues, and test results with inspectable, verifiable evidence for each status.

---

## 🏁 Traguardi Raggiunti (Release 1.0.0)

- [x] **Core Deterministic Ledger**: classificazione su tre livelli (fatto osservato, stima euristica, approvazione umana) senza percentuali fittizie.
- [x] **Evidence Reconciler**: riconciliazione automatica di cronologia Git, issue export e test runner.
- [x] **Tamper-Evidence Crittografica**: verifica di integrità basata su SHA-256 in `.devpilot/ledger.json`.
- [x] **Safety & Critical Path**: rilevamento anomalie e modifiche a file sensibili da parte di agenti AI.
- [x] **Interfaccia & Reporting**: terminal ANSI report, dashboard HTML interattiva e bundle export (HTML/MD/JSON).
- [x] **Zero Runtime Dependencies**: motore compatto in puro TypeScript per Node.js $\ge$ 22.
- [x] **Standard & Licenza**: Apache-2.0, governance bilingue, funding configurato.

---

## 🔮 Roadmap Futura (v1.1+)

1. **GitHub Action Ufficiale**: azione pronta per il marketplace per eseguire `devpilot status --strict` nelle Pull Request.
2. **Supporto Formato SARIF**: esportazione delle violazioni di review e path critici in standard SARIF per la tab Security di GitHub.
3. **Integrazione Git Worktrees**: supporto per la comparazione di audit tra worktree multipli concorrenti.
4. **Adapter Estesi**: connettori per report di copertura (LCOV/Istanbul) come evidenza addizionale per i task degli agenti.
