// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import type { AuditReport, WorkLedgerItem } from "./types.ts";

function statusBadge(status: string): string {
  switch (status) {
    case "HUMAN_APPROVED":
      return "\x1b[32m✔ HUMAN APPROVED\x1b[0m";
    case "VERIFIED_COMPLETED":
      return "\x1b[32m✔ VERIFIED COMPLETED\x1b[0m";
    case "IN_PROGRESS":
      return "\x1b[36m▶ IN PROGRESS\x1b[0m";
    case "NEEDS_HUMAN_REVIEW":
      return "\x1b[33m⚠ NEEDS HUMAN REVIEW\x1b[0m";
    case "TESTS_FAILED":
      return "\x1b[31m✖ TESTS FAILED\x1b[0m";
    case "BLOCKED":
      return "\x1b[31m🚫 BLOCKED\x1b[0m";
    default:
      return "\x1b[90m? UNVERIFIED\x1b[0m";
  }
}

function categoryBadge(category: string): string {
  switch (category) {
    case "observed_fact":
      return "\x1b[35m[Fact]\x1b[0m";
    case "estimate":
      return "\x1b[33m[Estimate]\x1b[0m";
    case "human_approval":
      return "\x1b[32m[Human Sign-Off]\x1b[0m";
    default:
      return `[${category}]`;
  }
}

export function renderTerminalReport(report: AuditReport): string {
  const { summary } = report;
  const out: string[] = [];

  out.push("\x1b[1m═══════════════════════════════════════════════════════════════════════════════\x1b[0m");
  out.push(`\x1b[1m  DevPilot Work Ledger & Audit Report — ${report.repository}\x1b[0m`);
  out.push(`  \x1b[90mGenerated: ${report.generatedAt} | v${report.version}\x1b[0m`);
  out.push("\x1b[1m═══════════════════════════════════════════════════════════════════════════════\x1b[0m");
  out.push("");
  out.push("\x1b[1m📊 Verified Metrics (Zero Fictitious Percentages):\x1b[0m");
  out.push(`  • Total Tracked Items:    \x1b[1m${summary.totalItems}\x1b[0m`);
  out.push(`  • Human Approved:         \x1b[32m${summary.humanApproved}\x1b[0m`);
  out.push(`  • Verified Completed:     \x1b[32m${summary.verifiedCompleted}\x1b[0m`);
  out.push(`  • In Progress:            \x1b[36m${summary.inProgress}\x1b[0m`);
  out.push(`  • Needs Human Review:     \x1b[33m${summary.needsHumanReview}\x1b[0m`);
  out.push(`  • Tests Failed:           \x1b[31m${summary.testsFailed}\x1b[0m`);
  out.push(`  • Blocked / Rejected:     \x1b[31m${summary.blocked}\x1b[0m`);
  out.push(`  • Unverified Claims:      \x1b[90m${summary.unverified}\x1b[0m`);
  out.push("");
  out.push(`  \x1b[1mActor Breakdown:\x1b[0m Human Commits: \x1b[34m${summary.humanCommitsCount}\x1b[0m | Agent Commits: \x1b[35m${summary.agentCommitsCount}\x1b[0m`);
  out.push("");
  out.push("\x1b[1m📋 Work Items & Inspectable Evidence:\x1b[0m");

  for (const item of report.items) {
    out.push(`  ${categoryBadge(item.category)} \x1b[1m${item.id}\x1b[0m: ${item.title}`);
    out.push(`    Status: ${statusBadge(item.status)} | Actor: ${item.primaryActor}`);

    if (item.evidence.commits.length > 0) {
      const commitList = item.evidence.commits
        .slice(0, 3)
        .map((c) => `[${c.shortSha}] ${c.subject} (${c.actorKind})`)
        .join("\n      ");
      out.push(`    Git Commits (${item.evidence.commits.length}):\n      ${commitList}`);
    }

    if (item.evidence.tests.length > 0) {
      const pass = item.evidence.tests.filter((t) => t.status === "passed").length;
      const fail = item.evidence.tests.filter((t) => t.status === "failed").length;
      out.push(`    Tests: \x1b[32m${pass} passed\x1b[0m, \x1b[31m${fail} failed\x1b[0m`);
    }

    if (item.evidence.signOff) {
      out.push(`    Sign-Off: Signed by ${item.evidence.signOff.approvedBy} (${item.evidence.signOff.status})`);
      out.push(`      Rationale: "${item.evidence.signOff.rationale}"`);
    }

    if (item.unsubstantiatedFlags.length > 0) {
      for (const flag of item.unsubstantiatedFlags) {
        out.push(`    \x1b[33m⚠ Warning: ${flag}\x1b[0m`);
      }
    }
    out.push("");
  }

  return out.join("\n");
}

export function renderMarkdownReport(report: AuditReport): string {
  const { summary } = report;
  const out: string[] = [];

  out.push(`# DevPilot Audit Report: ${report.repository}`);
  out.push(`*Generated at ${report.generatedAt} using DevPilot v${report.version}*`);
  out.push("");
  out.push("## Summary");
  out.push("");
  out.push("| Metric | Count |");
  out.push("|---|---|");
  out.push(`| **Total Work Items** | ${summary.totalItems} |`);
  out.push(`| **Human Approved** | ${summary.humanApproved} |`);
  out.push(`| **Verified Completed** | ${summary.verifiedCompleted} |`);
  out.push(`| **In Progress** | ${summary.inProgress} |`);
  out.push(`| **Needs Human Review** | ${summary.needsHumanReview} |`);
  out.push(`| **Tests Failed** | ${summary.testsFailed} |`);
  out.push(`| **Blocked / Rejected** | ${summary.blocked} |`);
  out.push(`| **Human Commits** | ${summary.humanCommitsCount} |`);
  out.push(`| **Agent Commits** | ${summary.agentCommitsCount} |`);
  out.push("");
  out.push("## Ledger Items & Evidence");
  out.push("");
  out.push("| ID | Title | Status | Category | Actor | Evidence Summary |");
  out.push("|---|---|---|---|---|---|");

  for (const item of report.items) {
    const evidenceNotes = [
      item.evidence.commits.length > 0 ? `${item.evidence.commits.length} commits` : "",
      item.evidence.tests.length > 0 ? `${item.evidence.tests.length} tests` : "",
      item.evidence.signOff ? `signed by ${item.evidence.signOff.approvedBy}` : "",
    ].filter(Boolean).join(", ") || "None";

    out.push(`| \`${item.id}\` | ${item.title.replace(/\|/g, "\\|")} | \`${item.status}\` | ${item.category} | ${item.primaryActor} | ${evidenceNotes} |`);
  }

  return out.join("\n");
}

export function renderHtmlReport(report: AuditReport): string {
  const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const rows = report.items.map((item) => {
    const statusClass = item.status.toLowerCase().replace(/_/g, "-");
    const commitItems = item.evidence.commits
      .map((c) => `<li><code>${c.shortSha}</code> ${escapeHtml(c.subject)} <small>(${c.actorKind})</small></li>`)
      .join("");

    const testItems = item.evidence.tests
      .map((t) => `<li class="test-${t.status}">[${t.status.toUpperCase()}] ${escapeHtml(t.suite)} / ${escapeHtml(t.name)} ${t.failureMessage ? `— <em>${escapeHtml(t.failureMessage)}</em>` : ""}</li>`)
      .join("");

    const flags = item.unsubstantiatedFlags
      .map((f) => `<div class="flag">⚠ ${escapeHtml(f)}</div>`)
      .join("");

    return `
      <tr class="item-row status-${statusClass}" data-status="${item.status}" data-actor="${item.primaryActor}">
        <td><strong><code>${escapeHtml(item.id)}</code></strong></td>
        <td>
          <div class="item-title">${escapeHtml(item.title)}</div>
          <span class="badge category-${item.category}">${escapeHtml(item.category)}</span>
          <span class="badge actor-${item.primaryActor}">${escapeHtml(item.primaryActor)}</span>
          ${flags}
        </td>
        <td><span class="status-pill ${statusClass}">${escapeHtml(item.status)}</span></td>
        <td>
          <details>
            <summary>${item.evidence.commits.length} commits, ${item.evidence.tests.length} tests ${item.evidence.signOff ? "• Signed" : ""}</summary>
            ${commitItems ? `<div class="sub-head">Commits:</div><ul>${commitItems}</ul>` : ""}
            ${testItems ? `<div class="sub-head">Tests:</div><ul>${testItems}</ul>` : ""}
            ${item.evidence.signOff ? `<div class="signoff-box"><strong>Human Sign-off:</strong> ${escapeHtml(item.evidence.signOff.approvedBy)} (${escapeHtml(item.evidence.signOff.status)})<br><em>${escapeHtml(item.evidence.signOff.rationale)}</em></div>` : ""}
          </details>
        </td>
      </tr>
    `;
  }).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DevPilot Audit Report — ${escapeHtml(report.repository)}</title>
  <style>
    :root {
      --bg: #0d1117;
      --card-bg: #161b22;
      --border: #30363d;
      --text: #c9d1d9;
      --text-muted: #8b949e;
      --green: #3fb950;
      --blue: #58a6ff;
      --yellow: #d29922;
      --red: #f85149;
      --purple: #bc8cff;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      margin: 0;
      padding: 24px;
      line-height: 1.5;
    }
    .header {
      border-bottom: 1px solid var(--border);
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    h1 { margin: 0 0 8px 0; font-size: 24px; color: #fff; }
    .meta { color: var(--text-muted); font-size: 13px; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .stat-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 16px;
    }
    .stat-val { font-size: 28px; font-weight: bold; margin-bottom: 4px; }
    .stat-label { font-size: 12px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
    .val-green { color: var(--green); }
    .val-yellow { color: var(--yellow); }
    .val-red { color: var(--red); }
    .val-blue { color: var(--blue); }
    table {
      width: 100%;
      border-collapse: collapse;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      overflow: hidden;
    }
    th, td {
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
      text-align: left;
      font-size: 14px;
      vertical-align: top;
    }
    th {
      background: #21262d;
      color: #fff;
      font-weight: 600;
    }
    .status-pill {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .status-verified-completed, .status-human-approved { background: rgba(63, 185, 80, 0.2); color: var(--green); border: 1px solid var(--green); }
    .status-in-progress { background: rgba(88, 166, 255, 0.2); color: var(--blue); border: 1px solid var(--blue); }
    .status-needs-human-review { background: rgba(210, 153, 34, 0.2); color: var(--yellow); border: 1px solid var(--yellow); }
    .status-tests-failed, .status-blocked { background: rgba(248, 81, 73, 0.2); color: var(--red); border: 1px solid var(--red); }
    .badge {
      display: inline-block;
      font-size: 11px;
      padding: 1px 6px;
      border-radius: 4px;
      margin-right: 4px;
      margin-top: 4px;
    }
    .category-observed_fact { background: #388bfd26; color: #58a6ff; }
    .category-estimate { background: #bb800926; color: #d29922; }
    .category-human_approval { background: #23863626; color: #3fb950; }
    .actor-human { border: 1px solid #388bfd; }
    .actor-agent { border: 1px solid var(--purple); color: var(--purple); }
    .flag { color: var(--yellow); font-size: 12px; margin-top: 4px; }
    details { cursor: pointer; }
    summary { outline: none; color: var(--blue); }
    ul { margin: 4px 0 8px 18px; padding: 0; font-size: 12px; }
    .sub-head { font-size: 12px; font-weight: bold; margin-top: 6px; color: var(--text-muted); }
    .test-failed { color: var(--red); }
    .test-passed { color: var(--green); }
    .signoff-box { background: rgba(63, 185, 80, 0.1); border-left: 3px solid var(--green); padding: 6px 8px; margin-top: 6px; font-size: 12px; border-radius: 2px; }
    code { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 12px; background: rgba(110,118,129,0.2); padding: 2px 4px; border-radius: 4px; }
    .footer { margin-top: 32px; font-size: 12px; color: var(--text-muted); text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <h1>DevPilot Work Ledger &amp; Inspectable Audit</h1>
    <div class="meta">Repository: <strong>${escapeHtml(report.repository)}</strong> | Generated: ${escapeHtml(report.generatedAt)} | Engine: DevPilot v${report.version}</div>
  </div>

  <div class="grid">
    <div class="stat-card">
      <div class="stat-val val-green">${report.summary.humanApproved + report.summary.verifiedCompleted}</div>
      <div class="stat-label">Verified / Approved</div>
    </div>
    <div class="stat-card">
      <div class="stat-val val-blue">${report.summary.inProgress}</div>
      <div class="stat-label">In Progress</div>
    </div>
    <div class="stat-card">
      <div class="stat-val val-yellow">${report.summary.needsHumanReview}</div>
      <div class="stat-label">Needs Human Review</div>
    </div>
    <div class="stat-card">
      <div class="stat-val val-red">${report.summary.testsFailed + report.summary.blocked}</div>
      <div class="stat-label">Failed / Blocked</div>
    </div>
    <div class="stat-card">
      <div class="stat-val">${report.summary.humanCommitsCount} / ${report.summary.agentCommitsCount}</div>
      <div class="stat-label">Human vs Agent Commits</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 100px;">Task ID</th>
        <th>Objective &amp; Classification</th>
        <th style="width: 160px;">Status</th>
        <th>Evidence Trail (Inspectable)</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <div class="footer">
    DevPilot — Factual Work Ledger &amp; Audit Trail. No fictitious percentages. Fully reproducible locally.
  </div>
</body>
</html>
  `;
}
