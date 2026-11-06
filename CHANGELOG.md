# Changelog — DevPilot

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0-beta.1] - 2026-11-06

### Added
- **Cryptographic Tamper-Evidence**:
  - Deterministic SHA-256 fingerprinting across ledger stores and audit reports.
  - Automatic tamper detection in `devpilot verify`: rejects manually edited or corrupt ledger entries.
- **New CLI Inspection & Export Tooling**:
  - `devpilot diff <itemId>`: detailed inspection of associated commits, author breakdowns, touched files, insertions/deletions, and test assertions.
  - `devpilot export`: generates a complete audit release bundle (`devpilot-report.html`, `devpilot-report.md`, `devpilot-report.json`) with cryptographic fingerprints.
- **Git Trailer Metadata Support**:
  - Ingestion of `Reviewed-by:` and `Signed-off-by:` commit trailers alongside `Co-authored-by:` for auditable multi-stakeholder governance.
- **Print & PDF Layout**:
  - Dedicated `@media print` stylesheets for clean PDF exports and regulatory audit documentation.

## [1.0.0-alpha.1] - 2026-11-06

### Added
- **Alpha Core Capabilities**:
  - Critical Path Risk detection: identifies unapproved modifications to sensitive repository assets (`.github/workflows`, `package.json`, authentication configurations).
  - AI Code Bloat detector: flags runaway agent commits exceeding 200 LOC without associated automated tests.
  - Test Anything Protocol (TAP) stream parser: full interoperability with TAP v13 test suites.
  - LOC Diff metrics: tracking additions, deletions, and volume metrics directly within work ledger items.
- **Enhanced CLI & Automation**:
  - `devpilot status`: compact single-line digest with colored risk levels and metrics for shell prompts and CI jobs.
  - `--strict` flag: enforce automated CI exit code failures if unverified agent tasks, test failures, or critical path risks exist.
  - `--since` and `--max` git commit filtering options.
- **Interactive Local HTML Dashboard**:
  - Real-time client-side search across tasks, commits, actors, and statuses.
  - Instant status filtering buttons (All, Verified, Needs Review, Failed/Blocked).
  - Total code volume diff stat cards (+/- LOC).

## [1.0.0] - 2026-11-06

### Added
- **Core Ledger & Evidence Engine**:
  - Deterministic three-tier classification: Observed Facts, Heuristic Estimates, Human Review Decisions.
  - Zero-bullshit rule: rejection of fabricated completion percentages.
  - Inspectable evidence linking: Git commits (sha, author, timestamp, touched files, human/agent attribution), exported issues, and test run outcomes.
- **Data Adapters**:
  - Native Git log parser (with support for agent tags, Co-authored-by trailers, bot committer patterns).
  - Exported issues parser (GitHub issue JSON export format + structured frontmatter Markdown).
  - Test results parser (JUnit XML / standard test JSON reports / TAP).
- **Human Approval & Ledger Sign-off**:
  - Verifiable cryptographic/timestamped human sign-off logging with rationales.
  - Integrity verification command validating ledger claims against observed evidence.
- **Reporting & Exporters**:
  - Terminal CLI interactive report with clickable evidence links and status badges.
  - Standalone, zero-dependency local HTML dashboard (`devpilot-report.html`) with filterable evidence matrices.
  - Structured Markdown & JSON audit trails for CI/CD pipelines.
- **Developer Experience**:
  - Zero external runtime dependencies (Node.js ≥ 22 built-ins).
  - TypeScript strict mode with full type declarations.
  - Anti-plagiarism provenance markers recorded in private registry.
