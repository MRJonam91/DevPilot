#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import { writeFileSync, existsSync } from "node:fs";
import { resolve, basename } from "node:path";
import { DEVPILOT_VERSION, SPONSOR_PROMPT } from "../core/constants.ts";
import { readLocalGitCommits } from "../core/git-parser.ts";
import { loadIssuesFromFile } from "../core/issues-parser.ts";
import { loadTestResultsFromFile } from "../core/tests-parser.ts";
import { reconcileWorkLedger } from "../core/reconciler.ts";
import { initLedger, loadLedger, recordSignOff, verifyLedgerIntegrity } from "../core/ledger.ts";
import { renderHtmlReport, renderMarkdownReport, renderTerminalReport } from "../core/reporter.ts";

function showHelp(): void {
  console.log(`
DevPilot v${DEVPILOT_VERSION} — Single Source of Truth for Human & Agent Work Status

USAGE:
  devpilot [command] [options]

COMMANDS:
  report, audit          Generate inspectable work ledger from Git, issues, and tests
  status                 Print concise one-line or compact status digest
  diff <itemId>          Inspect evidence trail, commits, and tests for a specific item
  export                 Export full audit bundle (HTML, Markdown, and JSON) to disk
  init                   Initialize local .devpilot/ ledger store
  approve <itemId>       Record a verified human sign-off for a work item
  reject <itemId>        Record a human rejection/block for a work item
  verify                 Verify cryptographic evidence integrity of the ledger
  help, --help, -h       Display this help manual
  version, -v, --version Display current version

OPTIONS:
  --repo <path>          Path to Git repository (default: current directory)
  --issues <path>        Path to exported issues (JSON or Markdown)
  --tests <path>         Path to test suite report (JUnit XML, TAP, or JSON)
  --format <fmt>         Output format: terminal | html | markdown | json (default: terminal)
  --output, -o <file>    Save report to specified file path
  --by <name>            Signer identity for approve/reject
  --note <message>       Human approval rationale or explanation
  --strict               Fail with exit code 1 if unverified agent tasks or test failures exist
  --since <date>         Filter git commits created after date (e.g. "2026-01-01" or "7 days ago")
  --max <number>         Max commit history depth to inspect (default: 100)
  --no-sponsor           Suppress sponsor line
  --sponsor              Force display sponsor prompt

EXAMPLES:
  devpilot report --issues issues.json --tests junit.xml
  devpilot report --format html --output devpilot-report.html
  devpilot diff issue-1
  devpilot export --output ./audit-dist/
  devpilot status --strict
  devpilot approve issue-42 --by "Alice" --note "Verified agent fix in sandbox"
  devpilot verify

${SPONSOR_PROMPT}
`);
}

function maybeShowSponsor(forceShow = false, suppress = false): void {
  if (suppress || process.env.NO_SPONSOR === "1" || process.env.CI) return;
  if (forceShow || (process.stdout.isTTY && Math.random() < 0.1)) {
    console.error(`\n\x1b[90m${SPONSOR_PROMPT}\x1b[0m`);
  }
}

export function parseArgs(args: string[]) {
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === "--help" || arg === "-h") flags.help = true;
    else if (arg === "--version" || arg === "-v") flags.version = true;
    else if (arg === "--sponsor") flags.sponsor = true;
    else if (arg === "--no-sponsor") flags.noSponsor = true;
    else if (arg === "--strict") flags.strict = true;
    else if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith("-")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else if (arg.startsWith("-") && arg.length === 2) {
      const key = arg.slice(1);
      const next = args[i + 1];
      if (next && !next.startsWith("-")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }

  return { positional, flags };
}

export async function runCli(argv = process.argv.slice(2)): Promise<number> {
  const { positional, flags } = parseArgs(argv);

  if (flags.help || positional[0] === "help") {
    showHelp();
    return 0;
  }

  if (flags.version || positional[0] === "version") {
    console.log(`devpilot v${DEVPILOT_VERSION}`);
    return 0;
  }

  const command = positional[0] || "report";
  const repoDir = resolve(String(flags.repo || "."));

  try {
    if (command === "init") {
      const store = initLedger(repoDir);
      console.log(`✔ Initialized DevPilot ledger at ${resolve(repoDir, ".devpilot/ledger.json")}`);
      console.log(`  Genesis Nonce: ${store.genesisNonce} | Schema: v${store.version}`);
      if (store.integrityHash) console.log(`  Integrity Fingerprint: ${store.integrityHash}`);
      return 0;
    }

    if (command === "approve" || command === "reject") {
      const itemId = positional[1];
      if (!itemId) {
        console.error("Error: Missing required itemId. Usage: devpilot approve <itemId> --by <name> --note <reason>");
        return 1;
      }
      const by = String(flags.by || process.env.USER || process.env.USERNAME || "reviewer");
      const note = String(flags.note || (command === "approve" ? "Manual inspection confirmed" : "Rejected during review"));
      const isApprove = command === "approve";
      const signOff = recordSignOff(repoDir, itemId, by, isApprove ? "approved" : "rejected", note);
      console.log(`✔ Recorded human sign-off for ${itemId}:`);
      console.log(`  Reviewer: ${signOff.approvedBy}`);
      console.log(`  Decision: ${signOff.status.toUpperCase()}`);
      console.log(`  Rationale: "${signOff.rationale}"`);
      return 0;
    }

    if (command === "verify") {
      const result = verifyLedgerIntegrity(repoDir);
      if (!result.valid) {
        console.error(`\x1b[31m✖ DevPilot Ledger Integrity Check FAILED\x1b[0m`);
        console.error(`  Error: ${result.error || "Unknown verification error"}`);
        return 1;
      }
      console.log(`\x1b[32m✔ DevPilot Ledger Integrity Check: OK (Tamper-evident verification passed)\x1b[0m`);
      console.log(`  Recorded Sign-offs: ${result.signOffCount}`);
      if (result.integrityHash) console.log(`  Fingerprint: ${result.integrityHash}`);
      return 0;
    }

    const maxCount = flags.max ? Number.parseInt(String(flags.max), 10) : 100;
    const since = flags.since ? String(flags.since) : undefined;
    const commits = readLocalGitCommits(repoDir, { maxCount, since });
    const issues = flags.issues ? loadIssuesFromFile(resolve(String(flags.issues))) : [];
    const testResults = flags.tests ? loadTestResultsFromFile(resolve(String(flags.tests))) : {
      total: 0, passed: 0, failed: 0, skipped: 0, durationMs: 0, timestamp: new Date().toISOString(), tests: []
    };
    const ledger = loadLedger(repoDir);

    const report = reconcileWorkLedger({
      repositoryName: basename(repoDir),
      commits,
      issues,
      tests: testResults.tests,
      signOffs: ledger.signOffs,
    });

    if (command === "diff") {
      const itemId = positional[1];
      if (!itemId) {
        console.error("Error: Missing itemId. Usage: devpilot diff <itemId>");
        return 1;
      }
      const item = report.items.find((i) => i.id.toLowerCase() === itemId.toLowerCase());
      if (!item) {
        console.error(`Error: Task item '${itemId}' not found in current ledger.`);
        return 1;
      }

      console.log(`\x1b[1m═══════════════════════════════════════════════════════════════\x1b[0m`);
      console.log(`\x1b[1mTask Inspection: ${item.id} — ${item.title}\x1b[0m`);
      console.log(`Status: ${item.status} | Category: ${item.category} | Actor: ${item.primaryActor}`);
      if (item.isCriticalRisk) console.log(`\x1b[41m\x1b[37mCRITICAL RISK: sensitive path touched without human sign-off\x1b[0m`);
      console.log(`\x1b[1m═══════════════════════════════════════════════════════════════\x1b[0m\n`);

      console.log(`\x1b[1mAssociated Git Commits (${item.evidence.commits.length}):\x1b[0m`);
      for (const c of item.evidence.commits) {
        console.log(`  • [${c.shortSha}] ${c.subject}`);
        console.log(`    Author: ${c.authorName} <${c.authorEmail}> (${c.actorKind}) | +${c.insertions}/-${c.deletions}`);
        if (c.filesTouched.length > 0) {
          console.log(`    Files: ${c.filesTouched.join(", ")}`);
        }
      }

      console.log(`\n\x1b[1mAssociated Test Cases (${item.evidence.tests.length}):\x1b[0m`);
      for (const t of item.evidence.tests) {
        const icon = t.status === "passed" ? "\x1b[32m✔\x1b[0m" : (t.status === "failed" ? "\x1b[31m✖\x1b[0m" : "\x1b[33m?\x1b[0m");
        console.log(`  ${icon} [${t.status.toUpperCase()}] ${t.suite} :: ${t.name} (${t.durationMs}ms)`);
        if (t.failureMessage) console.log(`    \x1b[31m${t.failureMessage}\x1b[0m`);
      }

      if (item.evidence.signOff) {
        console.log(`\n\x1b[1mHuman Sign-off:\x1b[0m`);
        console.log(`  Reviewer: ${item.evidence.signOff.approvedBy} (${item.evidence.signOff.status})`);
        console.log(`  Rationale: "${item.evidence.signOff.rationale}"`);
        console.log(`  Timestamp: ${item.evidence.signOff.timestamp}`);
      }

      if (item.unsubstantiatedFlags.length > 0) {
        console.log(`\n\x1b[33mEvidence Warnings:\x1b[0m`);
        for (const f of item.unsubstantiatedFlags) {
          console.log(`  ⚠ ${f}`);
        }
      }
      return 0;
    }

    if (command === "export") {
      const outDir = flags.output || flags.o || ".";
      const resolvedOutDir = resolve(String(outDir));
      const html = renderHtmlReport(report);
      const md = renderMarkdownReport(report);
      const json = JSON.stringify(report, null, 2);

      writeFileSync(resolve(resolvedOutDir, "devpilot-report.html"), html, "utf8");
      writeFileSync(resolve(resolvedOutDir, "devpilot-report.md"), md, "utf8");
      writeFileSync(resolve(resolvedOutDir, "devpilot-report.json"), json, "utf8");

      console.log(`✔ DevPilot audit bundle exported to ${resolvedOutDir}:`);
      console.log(`  • devpilot-report.html`);
      console.log(`  • devpilot-report.md`);
      console.log(`  • devpilot-report.json`);
      if (report.integrityHash) console.log(`  Fingerprint: ${report.integrityHash}`);
      return 0;
    }

    if (command === "status") {
      const { summary } = report;
      const statusLine = [
        `DevPilot: ${summary.totalItems} items`,
        `✔ ${summary.verifiedCompleted + summary.humanApproved} verified`,
        `▶ ${summary.inProgress} in-progress`,
        `⚠ ${summary.needsHumanReview} need review`,
        `✖ ${summary.testsFailed + summary.blocked} failed/blocked`,
        `(${summary.humanCommitsCount} human / ${summary.agentCommitsCount} agent commits, +${summary.totalInsertions}/-${summary.totalDeletions} LOC)`,
      ].join(" | ");

      if (summary.criticalPathWarnings > 0) {
        console.log(`\x1b[31m${statusLine} [CRITICAL RISKS: ${summary.criticalPathWarnings}]\x1b[0m`);
      } else if (summary.needsHumanReview > 0 || summary.testsFailed > 0) {
        console.log(`\x1b[33m${statusLine}\x1b[0m`);
      } else {
        console.log(`\x1b[32m${statusLine}\x1b[0m`);
      }

      if (flags.strict && (summary.testsFailed > 0 || summary.blocked > 0 || summary.criticalPathWarnings > 0 || summary.needsHumanReview > 0)) {
        console.error("Strict mode check failed: unverified agent tasks, test failures, or critical risks detected.");
        return 1;
      }
      return 0;
    }

    if (command === "report" || command === "audit") {
      const format = String(flags.format || "terminal").toLowerCase();
      let outputText = "";

      if (format === "html") {
        outputText = renderHtmlReport(report);
      } else if (format === "markdown" || format === "md") {
        outputText = renderMarkdownReport(report);
      } else if (format === "json") {
        outputText = JSON.stringify(report, null, 2);
      } else {
        outputText = renderTerminalReport(report);
      }

      const outFile = flags.output || flags.o;
      if (outFile) {
        writeFileSync(resolve(String(outFile)), outputText, "utf8");
        console.log(`✔ DevPilot report generated successfully: ${resolve(String(outFile))}`);
      } else {
        console.log(outputText);
      }

      maybeShowSponsor(Boolean(flags.sponsor), Boolean(flags.noSponsor));

      if (flags.strict) {
        const s = report.summary;
        if (s.testsFailed > 0 || s.blocked > 0 || s.criticalPathWarnings > 0 || s.needsHumanReview > 0) {
          console.error("\x1b[31m✖ Strict verification failed: unapproved agent code or failed tests present in ledger.\x1b[0m");
          return 1;
        }
      }

      return 0;
    }

    console.error(`Unknown command: ${command}. Run 'devpilot --help' for available commands.`);
    return 1;
  } catch (err) {
    console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    return 1;
  }
}

if (process.argv[1] && (process.argv[1].endsWith("cli/index.ts") || process.argv[1].endsWith("cli/index.js"))) {
  runCli().then((code) => {
    if (code !== 0) process.exit(code);
  });
}
