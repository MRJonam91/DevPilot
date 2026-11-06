// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import { execFileSync } from "node:child_process";
import { KNOWN_AGENT_IDENTIFIERS } from "./constants.ts";
import type { ActorKind, GitCommitRecord } from "./types.ts";

const COMMIT_DELIMITER = "---DEVPILOT-COMMIT-END---";

export function detectActorKind(authorName: string, authorEmail: string, commitBody: string): ActorKind {
  const norm = `${authorName} ${authorEmail} ${commitBody}`.toLowerCase();
  for (const id of KNOWN_AGENT_IDENTIFIERS) {
    if (norm.includes(id)) {
      return "agent";
    }
  }
  return "human";
}

export function extractIssueRefs(text: string): number[] {
  const matches = text.match(/(?:#|gh-|issues?\/)(\d+)\b/gi);
  if (!matches) return [];
  const set = new Set<number>();
  for (const m of matches) {
    const num = m.match(/\d+/);
    if (num) {
      set.add(Number.parseInt(num[0], 10));
    }
  }
  return Array.from(set).sort((a, b) => a - b);
}

export function extractCoAuthors(body: string): string[] {
  const lines = body.split("\n");
  const authors: string[] = [];
  for (const line of lines) {
    const match = line.match(/^Co-authored-by:\s*(.+)$/i);
    if (match?.[1]) {
      authors.push(match[1].trim());
    }
  }
  return authors;
}

export function parseGitLogOutput(rawLog: string): GitCommitRecord[] {
  if (!rawLog || !rawLog.trim()) return [];

  const rawBlocks = rawLog.split(COMMIT_DELIMITER);
  const commits: GitCommitRecord[] = [];

  for (const block of rawBlocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    const [headerPart, ...fileParts] = trimmed.split("\n--FILES--\n");
    if (!headerPart) continue;

    const lines = headerPart.split("\n");
    const [sha = "", authorName = "", authorEmail = "", date = "", subject = "", ...bodyLines] = lines;
    if (!sha) continue;

    const body = bodyLines.join("\n").trim();
    const actorKind = detectActorKind(authorName, authorEmail, body);
    const issueRefs = extractIssueRefs(`${subject}\n${body}`);
    const coAuthors = extractCoAuthors(body);

    const filesTouched = fileParts.join("\n")
      .split("\n")
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

    commits.push({
      sha,
      shortSha: sha.slice(0, 7),
      authorName,
      authorEmail,
      date,
      subject,
      body,
      actorKind,
      filesTouched,
      issueRefs,
      coAuthors,
    });
  }

  return commits;
}

export function readLocalGitCommits(repoPath: string, maxCount = 100): GitCommitRecord[] {
  try {
    const gitFormat = `%H%n%an%n%ae%n%aI%n%s%n%b%n--FILES--`;
    const stdout = execFileSync(
      "git",
      ["log", `-${maxCount}`, `--format=${gitFormat}`, "--name-only"],
      {
        cwd: repoPath,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }
    );

    // Git outputs each commit followed by file list. We reconstruct blocks.
    const blocks: string[] = [];
    const lines = stdout.split("\n");
    let currentBlock: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      // Commit hash line regex (40 hex chars)
      if (/^[0-9a-f]{40}$/i.test(line) && (i === 0 || lines[i - 1]?.trim() === "" || lines[i - 1]?.includes("---"))) {
        if (currentBlock.length > 0) {
          blocks.push(currentBlock.join("\n"));
          currentBlock = [];
        }
      }
      currentBlock.push(line);
    }
    if (currentBlock.length > 0) {
      blocks.push(currentBlock.join("\n"));
    }

    const syntheticLog = blocks.join(`\n${COMMIT_DELIMITER}\n`);
    return parseGitLogOutput(syntheticLog);
  } catch {
    return [];
  }
}
