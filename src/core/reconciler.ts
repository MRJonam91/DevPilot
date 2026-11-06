// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import { DEVPILOT_VERSION } from "./constants.ts";
import type {
  ActorKind,
  AuditReport,
  AuditSummary,
  GitCommitRecord,
  HumanSignOff,
  IssueRecord,
  TaskStatus,
  TestCaseRecord,
  WorkItemEvidence,
  WorkLedgerItem,
} from "./types.ts";

export interface ReconcileOptions {
  repositoryName?: string;
  commits?: GitCommitRecord[];
  issues?: IssueRecord[];
  tests?: TestCaseRecord[];
  signOffs?: Record<string, HumanSignOff>;
}

export function matchTestsToItem(itemId: string, issueId: number | undefined, title: string, tests: TestCaseRecord[]): TestCaseRecord[] {
  const normTitle = title.toLowerCase();
  const searchTerms = [
    `#${issueId}`,
    itemId.toLowerCase(),
    ...normTitle.split(/[^a-z0-9_-]+/).filter((w) => w.length > 3),
  ];

  return tests.filter((t) => {
    const normTest = `${t.suite} ${t.name}`.toLowerCase();
    return searchTerms.some((term) => normTest.includes(term));
  });
}

export function reconcileWorkLedger(options: ReconcileOptions): AuditReport {
  const repoName = options.repositoryName || "local-repo";
  const commits = options.commits || [];
  const issues = options.issues || [];
  const tests = options.tests || [];
  const signOffs = options.signOffs || {};

  const matchedCommitShas = new Set<string>();
  const matchedTestNames = new Set<string>();

  const items: WorkLedgerItem[] = [];

  // Group by issues first (if present)
  for (const issue of issues) {
    const itemCommits = commits.filter((c) => {
      const match = c.issueRefs.includes(issue.id) || c.subject.toLowerCase().includes(`issue-${issue.id}`);
      if (match) matchedCommitShas.add(c.sha);
      return match;
    });

    const itemTests = matchTestsToItem(`issue-${issue.id}`, issue.id, issue.title, tests);
    for (const t of itemTests) matchedTestNames.add(`${t.suite}::${t.name}`);

    const signOff = signOffs[`issue-${issue.id}`] || signOffs[String(issue.id)];

    const evidence: WorkItemEvidence = {
      commits: itemCommits,
      issues: [issue],
      tests: itemTests,
      signOff,
    };

    const notes: string[] = [];
    const flags: string[] = [];

    // Determine primary actor
    const agentCommits = itemCommits.filter((c) => c.actorKind === "agent").length;
    const humanCommits = itemCommits.filter((c) => c.actorKind === "human").length;
    let primaryActor: ActorKind = "unknown";
    if (humanCommits > 0 && agentCommits > 0) primaryActor = "human";
    else if (humanCommits > 0) primaryActor = "human";
    else if (agentCommits > 0) primaryActor = "agent";

    // Compute status strictly based on evidence
    let status: TaskStatus = "UNVERIFIED";
    const hasFailedTests = itemTests.some((t) => t.status === "failed");
    const hasPassedTests = itemTests.some((t) => t.status === "passed");

    if (signOff) {
      if (signOff.status === "approved") {
        status = "HUMAN_APPROVED";
        notes.push(`Human sign-off provided by ${signOff.approvedBy}: "${signOff.rationale}"`);
      } else {
        status = "BLOCKED";
        flags.push(`Rejected during human review by ${signOff.approvedBy}`);
      }
    } else if (hasFailedTests) {
      status = "TESTS_FAILED";
      flags.push(`Observed test failures in associated test cases`);
    } else if (primaryActor === "agent" && itemCommits.length > 0 && !signOff) {
      status = "NEEDS_HUMAN_REVIEW";
      flags.push("Agent-generated commits require explicit human review");
    } else if (issue.status === "closed" && (hasPassedTests || itemCommits.length > 0)) {
      status = "VERIFIED_COMPLETED";
      notes.push("Closed issue with verified commit and/or passing test suite");
    } else if (itemCommits.length > 0) {
      status = "IN_PROGRESS";
      notes.push(`${itemCommits.length} commits recorded`);
    } else {
      status = "UNVERIFIED";
      flags.push("No observed commits or test executions found for this issue");
    }

    const category = signOff ? "human_approval" : (itemCommits.length > 0 || itemTests.length > 0 ? "observed_fact" : "estimate");

    items.push({
      id: `issue-${issue.id}`,
      title: issue.title,
      issueId: issue.id,
      category,
      status,
      primaryActor,
      evidence,
      evidenceNotes: notes,
      unsubstantiatedFlags: flags,
    });
  }

  // Find commits not tied to known issues
  const orphanCommits = commits.filter((c) => !matchedCommitShas.has(c.sha));

  // Synthesize work items for orphan commit groups (e.g. standalone features or refactors)
  const commitsBySubjectGroup = new Map<string, GitCommitRecord[]>();
  for (const c of orphanCommits) {
    const key = c.subject.replace(/^(feat|fix|docs|refactor|test|chore)(\([^)]+\))?:\s*/i, "").trim().toLowerCase();
    const group = commitsBySubjectGroup.get(key) || [];
    group.push(c);
    commitsBySubjectGroup.set(key, group);
  }

  let autoId = 1;
  for (const [key, group] of commitsBySubjectGroup) {
    const first = group[0]!;
    const itemTests = matchTestsToItem(`task-${autoId}`, undefined, key, tests);
    for (const t of itemTests) matchedTestNames.add(`${t.suite}::${t.name}`);

    const signOff = signOffs[`task-${autoId}`];
    const evidence: WorkItemEvidence = {
      commits: group,
      issues: [],
      tests: itemTests,
      signOff,
    };

    const notes: string[] = [`Observed from git history: ${group.length} commit(s)`];
    const flags: string[] = [];

    const agentCommits = group.filter((c) => c.actorKind === "agent").length;
    const humanCommits = group.filter((c) => c.actorKind === "human").length;
    const primaryActor: ActorKind = agentCommits > 0 && humanCommits === 0 ? "agent" : (humanCommits > 0 ? "human" : "unknown");

    let status: TaskStatus = "IN_PROGRESS";
    const hasFailedTests = itemTests.some((t) => t.status === "failed");
    const hasPassedTests = itemTests.some((t) => t.status === "passed");

    if (signOff) {
      status = signOff.status === "approved" ? "HUMAN_APPROVED" : "BLOCKED";
    } else if (hasFailedTests) {
      status = "TESTS_FAILED";
      flags.push("Test cases associated with this task failed");
    } else if (primaryActor === "agent" && !signOff) {
      status = "NEEDS_HUMAN_REVIEW";
      flags.push("Agent work requires human verification before sign-off");
    } else if (hasPassedTests) {
      status = "VERIFIED_COMPLETED";
    }

    items.push({
      id: `task-${autoId}`,
      title: first.subject,
      category: signOff ? "human_approval" : "observed_fact",
      status,
      primaryActor,
      evidence,
      evidenceNotes: notes,
      unsubstantiatedFlags: flags,
    });
    autoId++;
  }

  const orphanTests = tests.filter((t) => !matchedTestNames.has(`${t.suite}::${t.name}`));

  const summary: AuditSummary = {
    totalItems: items.length,
    verifiedCompleted: items.filter((i) => i.status === "VERIFIED_COMPLETED").length,
    inProgress: items.filter((i) => i.status === "IN_PROGRESS").length,
    testsFailed: items.filter((i) => i.status === "TESTS_FAILED").length,
    needsHumanReview: items.filter((i) => i.status === "NEEDS_HUMAN_REVIEW").length,
    humanApproved: items.filter((i) => i.status === "HUMAN_APPROVED").length,
    blocked: items.filter((i) => i.status === "BLOCKED").length,
    unverified: items.filter((i) => i.status === "UNVERIFIED").length,
    humanCommitsCount: commits.filter((c) => c.actorKind === "human").length,
    agentCommitsCount: commits.filter((c) => c.actorKind === "agent").length,
    observedFactsCount: items.filter((i) => i.category === "observed_fact").length,
    estimatesCount: items.filter((i) => i.category === "estimate").length,
  };

  return {
    version: DEVPILOT_VERSION,
    repository: repoName,
    generatedAt: new Date().toISOString(),
    summary,
    items,
    orphanCommits,
    orphanTests,
  };
}
