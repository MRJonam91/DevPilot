// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

export type ActorKind = "human" | "agent" | "unknown";

export type EvidenceCategory = "observed_fact" | "estimate" | "human_approval";

export type TaskStatus =
  | "VERIFIED_COMPLETED"
  | "IN_PROGRESS"
  | "TESTS_FAILED"
  | "NEEDS_HUMAN_REVIEW"
  | "HUMAN_APPROVED"
  | "BLOCKED"
  | "UNVERIFIED";

export interface GitCommitRecord {
  sha: string;
  shortSha: string;
  authorName: string;
  authorEmail: string;
  date: string;
  subject: string;
  body: string;
  actorKind: ActorKind;
  filesTouched: string[];
  issueRefs: number[];
  coAuthors: string[];
  insertions: number;
  deletions: number;
  isCriticalPath: boolean;
}

export interface IssueRecord {
  id: number;
  title: string;
  status: "open" | "closed";
  assignees: string[];
  labels: string[];
  body?: string;
  url?: string;
  closedAt?: string;
}

export interface TestCaseRecord {
  name: string;
  suite: string;
  status: "passed" | "failed" | "skipped";
  durationMs: number;
  failureMessage?: string;
}

export interface TestSuiteSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  durationMs: number;
  timestamp: string;
  tests: TestCaseRecord[];
}

export interface HumanSignOff {
  approvedBy: string;
  timestamp: string;
  status: "approved" | "rejected";
  rationale: string;
  signatureNonce?: string;
}

export interface WorkItemEvidence {
  commits: GitCommitRecord[];
  issues: IssueRecord[];
  tests: TestCaseRecord[];
  signOff?: HumanSignOff;
}

export interface WorkLedgerItem {
  id: string;
  title: string;
  description?: string;
  issueId?: number;
  category: EvidenceCategory;
  status: TaskStatus;
  primaryActor: ActorKind;
  evidence: WorkItemEvidence;
  evidenceNotes: string[];
  unsubstantiatedFlags: string[];
  isCriticalRisk?: boolean;
}

export interface WorkLedger {
  version: string;
  repository: string;
  generatedAt: string;
  items: WorkLedgerItem[];
}

export interface AuditSummary {
  totalItems: number;
  verifiedCompleted: number;
  inProgress: number;
  testsFailed: number;
  needsHumanReview: number;
  humanApproved: number;
  blocked: number;
  unverified: number;
  humanCommitsCount: number;
  agentCommitsCount: number;
  observedFactsCount: number;
  estimatesCount: number;
  totalInsertions: number;
  totalDeletions: number;
  criticalPathWarnings: number;
  untestedAgentCodeCount: number;
}

export interface AuditReport {
  version: string;
  repository: string;
  generatedAt: string;
  integrityHash?: string;
  summary: AuditSummary;
  items: WorkLedgerItem[];
  orphanCommits: GitCommitRecord[];
  orphanTests: TestCaseRecord[];
}
