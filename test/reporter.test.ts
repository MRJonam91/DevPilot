// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import test from "node:test";
import assert from "node:assert/strict";
import { reconcileWorkLedger } from "../src/core/reconciler.ts";
import {
  renderHtmlReport,
  renderMarkdownReport,
  renderTerminalReport,
} from "../src/core/reporter.ts";

test("renderers generate expected output strings", () => {
  const report = reconcileWorkLedger({
    repositoryName: "demo-repo",
    commits: [
      {
        sha: "abc1234567890123456789012345678901234567",
        shortSha: "abc1234",
        authorName: "Alice Dev",
        authorEmail: "alice@example.com",
        date: "2026-11-06T10:00:00Z",
        subject: "feat: add core logic (#1)",
        body: "",
        actorKind: "human",
        filesTouched: ["src/core.ts"],
        issueRefs: [1],
        coAuthors: [],
      },
    ],
    issues: [
      { id: 1, title: "Add core logic", status: "closed", assignees: ["Alice"], labels: [] },
    ],
    tests: [],
  });

  const term = renderTerminalReport(report);
  assert.ok(term.includes("DevPilot Work Ledger & Audit Report"));
  assert.ok(term.includes("issue-1"));

  const md = renderMarkdownReport(report);
  assert.ok(md.includes("# DevPilot Audit Report: demo-repo"));
  assert.ok(md.includes("| `issue-1` |"));

  const html = renderHtmlReport(report);
  assert.ok(html.includes("<!DOCTYPE html>"));
  assert.ok(html.includes("DevPilot Work Ledger &amp; Inspectable Audit"));
  assert.ok(html.includes("issue-1"));
});
