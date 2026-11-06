// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import test from "node:test";
import assert from "node:assert/strict";
import { reconcileWorkLedger } from "../src/core/reconciler.ts";
import type { GitCommitRecord, IssueRecord, TestCaseRecord } from "../src/core/types.ts";

test("reconcileWorkLedger correctly reconciles facts without fictitious percentages", () => {
  const issues: IssueRecord[] = [
    { id: 1, title: "Create CLI engine", status: "closed", assignees: ["MRJonam91"], labels: [] },
    { id: 2, title: "Autonomous agent refactor", status: "open", assignees: ["bot-agent"], labels: [] },
  ];

  const commits: GitCommitRecord[] = [
    {
      sha: "1111111111111111111111111111111111111111",
      shortSha: "1111111",
      authorName: "Manoj Rollo",
      authorEmail: "fbxmano@gmail.com",
      date: "2026-11-06T10:00:00Z",
      subject: "feat: add CLI engine (#1)",
      body: "",
      actorKind: "human",
      filesTouched: ["src/cli.ts"],
      issueRefs: [1],
      coAuthors: [],
      insertions: 50,
      deletions: 5,
      isCriticalPath: false,
    },
    {
      sha: "2222222222222222222222222222222222222222",
      shortSha: "2222222",
      authorName: "AI Copilot Agent",
      authorEmail: "agent@copilot.local",
      date: "2026-11-06T11:00:00Z",
      subject: "refactor: auto-optimise parser (#2)",
      body: "",
      actorKind: "agent",
      filesTouched: ["src/parser.ts"],
      issueRefs: [2],
      coAuthors: [],
      insertions: 300,
      deletions: 20,
      isCriticalPath: false,
    },
  ];

  const tests: TestCaseRecord[] = [
    {
      name: "should run CLI engine #1",
      suite: "CliSuite",
      status: "passed",
      durationMs: 10,
    },
  ];

  const report = reconcileWorkLedger({
    repositoryName: "test-repo",
    commits,
    issues,
    tests,
    signOffs: {},
  });

  assert.equal(report.summary.totalItems, 2);
  assert.equal(report.summary.humanCommitsCount, 1);
  assert.equal(report.summary.agentCommitsCount, 1);
  assert.equal(report.summary.totalInsertions, 350);
  assert.equal(report.summary.totalDeletions, 25);

  // Item 1 (Human, closed, passing test) -> VERIFIED_COMPLETED
  const item1 = report.items.find((i) => i.id === "issue-1");
  assert.ok(item1);
  assert.equal(item1?.status, "VERIFIED_COMPLETED");
  assert.equal(item1?.category, "observed_fact");
  assert.equal(item1?.primaryActor, "human");

  // Item 2 (Agent only, 320 lines, 0 tests) -> NEEDS_HUMAN_REVIEW with untested agent code flag
  const item2 = report.items.find((i) => i.id === "issue-2");
  assert.ok(item2);
  assert.equal(item2?.status, "NEEDS_HUMAN_REVIEW");
  assert.ok(item2?.unsubstantiatedFlags.some((f) => f.includes("Untested agent code")));
  assert.equal(report.summary.untestedAgentCodeCount, 1);
});

test("reconcileWorkLedger flags critical path modifications by agents", () => {
  const issues: IssueRecord[] = [
    { id: 9, title: "Modify workflow security", status: "open", assignees: ["bot"], labels: [] },
  ];

  const commits: GitCommitRecord[] = [
    {
      sha: "9999999999999999999999999999999999999999",
      shortSha: "9999999",
      authorName: "Agent Bot",
      authorEmail: "bot@agent.ai",
      date: "2026-11-06T12:00:00Z",
      subject: "chore: update ci workflow (#9)",
      body: "",
      actorKind: "agent",
      filesTouched: [".github/workflows/ci.yml"],
      issueRefs: [9],
      coAuthors: [],
      insertions: 15,
      deletions: 2,
      isCriticalPath: true,
    },
  ];

  const report = reconcileWorkLedger({
    repositoryName: "security-repo",
    commits,
    issues,
    tests: [],
    signOffs: {},
  });

  const item = report.items[0];
  assert.equal(item?.status, "NEEDS_HUMAN_REVIEW");
  assert.equal(item?.isCriticalRisk, true);
  assert.equal(report.summary.criticalPathWarnings, 1);
  assert.ok(item?.unsubstantiatedFlags.some((f) => f.includes("Critical path")));
});

test("reconcileWorkLedger updates status upon human sign-off", () => {
  const issues: IssueRecord[] = [
    { id: 2, title: "Autonomous agent refactor", status: "open", assignees: ["bot-agent"], labels: [] },
  ];

  const report = reconcileWorkLedger({
    repositoryName: "test-repo",
    commits: [],
    issues,
    tests: [],
    signOffs: {
      "issue-2": {
        approvedBy: "Manoj Rollo",
        timestamp: "2026-11-06T12:00:00Z",
        status: "approved",
        rationale: "Inspected diff and manual run confirmed",
      },
    },
  });

  const item = report.items[0];
  assert.equal(item?.status, "HUMAN_APPROVED");
  assert.equal(item?.category, "human_approval");
  assert.ok(item?.evidence.signOff);
});
