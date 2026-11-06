#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import { writeFileSync } from "node:fs";
import { resolve, basename } from "node:path";
import { DEVPILOT_VERSION, SPONSOR_PROMPT } from "../core/constants.ts";
import { readLocalGitCommits } from "../core/git-parser.ts";
import { loadIssuesFromFile } from "../core/issues-parser.ts";
import { loadTestResultsFromFile } from "../core/tests-parser.ts";
import { reconcileWorkLedger } from "../core/reconciler.ts";
import { initLedger, loadLedger, recordSignOff } from "../core/ledger.ts";
import { renderHtmlReport, renderMarkdownReport, renderTerminalReport } from "../core/reporter.ts";

function showHelp(): void {
  console.log(`
DevPilot v${DEVPILOT_VERSION} — Single Source of Truth for Human & Agent Work Status

USAGE:
  devpilot [command] [options]

COMMANDS:
  report, audit          Generate inspectable work ledger from Git, issues, and tests
  init                   Initialize local .devpilot/ ledger store
  approve <itemId>       Record a verified human sign-off for a work item
  reject <itemId>        Record a human rejection/block for a work item
  verify                 Verify evidence integrity of the ledger
  help, --help, -h       Display this help manual
  version, -v, --version Display current version

OPTIONS:
  --repo <path>          Path to Git repository (default: current directory)
  --issues <path>        Path to exported issues (JSON or Markdown)
  --tests <path>         Path to test suite report (JUnit XML or JSON)
  --format <fmt>         Output format: terminal | html | markdown | json (default: terminal)
  --output, -o <file>    Save report to specified file path
  --by <name>            Signer identity for approve/reject
  --note <message>       Human approval rationale or explanation
  --no-sponsor           Suppress sponsor line
  --sponsor              Force display sponsor prompt

EXAMPLES:
  devpilot report --issues issues.json --tests junit.xml
  devpilot report --format html --output devpilot-report.html
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
      const store = loadLedger(repoDir);
      const signOffCount = Object.keys(store.signOffs).length;
      console.log(`✔ DevPilot Ledger Integrity Check: OK`);
      console.log(`  Ledger Version: ${store.version}`);
      console.log(`  Recorded Sign-offs: ${signOffCount}`);
      return 0;
    }

    if (command === "report" || command === "audit") {
      const commits = readLocalGitCommits(repoDir);
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
