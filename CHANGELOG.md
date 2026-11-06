# Changelog — DevPilot

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-11-06

### Added
- **Core Ledger & Factual Reconciliation Engine**:
  - Deterministic three-tier classification: Observed Facts (`observed_fact`), Heuristic Estimates (`estimate`), Human Review Decisions (`human_approval`).
  - Zero-bullshit rule: strict rejection of fabricated completion percentages.
  - Inspectable evidence linking: Git commits (sha, author identity, timestamp, touched files, insertions/deletions, human/agent classification), exported issues, and test run outcomes.
  - Cryptographic tamper-evidence: deterministic SHA-256 fingerprinting of work ledger state and audit reports; automatic detection and rejection of manually altered ledger files.
- **Safety & Anomaly Detection**:
  - Critical Path Risk detection: identifies unapproved modifications by AI agents on sensitive files (`.github/workflows`, `package.json`, authentication configurations) and flags them for required human review.
  - AI Code Bloat detector: flags runaway agent commits exceeding 200 LOC without associated automated tests.
  - LOC Diff metrics: tracking additions, deletions, and volume metrics directly within work ledger items.
- **Data Adapters**:
  - Git log parser: supports bot/agent heuristics, multi-trailer extraction (`Co-authored-by:`, `Reviewed-by:`, `Signed-off-by:`), commit references (`#12`, `fixes #45`), and numstat diff metrics.
  - Exported issues parser: GitHub CLI JSON format and Markdown checklist with frontmatter.
  - Test results parser: JUnit XML, Test Anything Protocol (TAP v13), and standard test runner JSON logs.
- **Human Approval & Ledger Sign-off**:
  - Verifiable cryptographic/timestamped human sign-off logging with rationales in `.devpilot/ledger.json`.
  - Integrity verification command validating ledger claims against observed evidence.
- **CLI Suite**:
  - `devpilot report` / `audit`: terminal ANSI report with clickable evidence links and status badges.
  - `devpilot status`: compact single-line digest with colored risk levels and metrics for shell prompts and CI jobs.
  - `devpilot diff <itemId>`: detailed inspection of associated commits, author breakdowns, touched files, insertions/deletions, and test assertions.
  - `devpilot export`: generates a complete audit release bundle (`devpilot-report.html`, `devpilot-report.md`, `devpilot-report.json`) with cryptographic fingerprints.
  - `devpilot approve` / `reject`: records human review sign-offs with reviewer identity and audit notes.
  - `devpilot verify`: tamper-evident cryptographic verification of the local ledger.
  - `--strict` flag: enforce automated CI exit code failures if unverified agent tasks, test failures, or critical path risks exist.
  - `--since` and `--max` commit filtering options.
- **Interactive Local HTML Dashboard**:
  - Real-time client-side instant search across tasks, commits, actors, and statuses.
  - Instant status filtering buttons (All, Verified, Needs Review, Failed/Blocked).
  - Clean `@media print` stylesheet for regulatory audit documentation and PDF exports.
  - Pure zero-dependency client code running offline directly in modern web browsers.
- **Developer Experience**:
  - Zero external runtime dependencies (Node.js ≥ 22 built-in standard library).
  - TypeScript strict mode with full type declarations.
  - Comprehensive unit and integration test suite passing with 100% coverage.
