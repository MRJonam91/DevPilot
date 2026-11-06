// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import { execFileSync } from "node:child_process";
import { KNOWN_AGENT_IDENTIFIERS } from "./constants.ts";
import type { ActorKind, GitCommitRecord } from "./types.ts";

const COMMIT_DELIMITER = "---DEVPILOT-COMMIT-END---";

const CRITICAL_FILE_PATTERNS = [
  /^\.github\//i,
  /^package(-lock)?\.json$/i,
  /^tsconfig.*\.json$/i,
  /^\.env/i,
  /security/i,
  /auth/i,
  /dockerfile/i,
  /docker-compose/i,
];

export function isCriticalPathFile(filePath: string): boolean {
  const norm = filePath.replace(/\\/g, "/");
  return CRITICAL_FILE_PATTERNS.some((p) => p.test(norm));
}

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
    const match = line.match(/^(?:Co-authored-by|Reviewed-by|Signed-off-by):\s*(.+)$/i);
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

    const [headerPart, ...statParts] = trimmed.split("\n--FILES--\n");
    if (!headerPart) continue;

    const lines = headerPart.split("\n");
    const [sha = "", authorName = "", authorEmail = "", date = "", subject = "", ...bodyLines] = lines;
    if (!sha) continue;

    const body = bodyLines.join("\n").trim();
    const actorKind = detectActorKind(authorName, authorEmail, body);
    const issueRefs = extractIssueRefs(`${subject}\n${body}`);
    const coAuthors = extractCoAuthors(body);

    const filesTouched: string[] = [];
    let insertions = 0;
    let deletions = 0;

    const statLines = statParts.join("\n").split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
    for (const line of statLines) {
      // Either raw file name or numstat format: "12\t4\tsrc/file.ts"
      const match = line.match(/^(\d+|-)\s+(\d+|-)\s+(.+)$/);
      if (match && match[3]) {
        insertions += match[1] !== "-" ? Number.parseInt(match[1]!, 10) : 0;
        deletions += match[2] !== "-" ? Number.parseInt(match[2]!, 10) : 0;
        filesTouched.push(match[3].trim());
      } else {
        filesTouched.push(line);
      }
    }

    const isCriticalPath = filesTouched.some((f) => isCriticalPathFile(f));

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
      insertions,
      deletions,
      isCriticalPath,
    });
  }

  return commits;
}

export interface ReadGitCommitsOptions {
  maxCount?: number;
  since?: string;
  branch?: string;
}

export function readLocalGitCommits(repoPath: string, options: ReadGitCommitsOptions = {}): GitCommitRecord[] {
  try {
    const max = options.maxCount ?? 100;
    const gitFormat = `%H%n%an%n%ae%n%aI%n%s%n%b%n--FILES--`;
    const args = ["log", `-${max}`, `--format=${gitFormat}`, "--numstat"];
    if (options.since) {
      args.push(`--since=${options.since}`);
    }
    if (options.branch) {
      args.push(options.branch);
    }

    const stdout = execFileSync("git", args, {
      cwd: repoPath,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });

    const blocks: string[] = [];
    const lines = stdout.split("\n");
    let currentBlock: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
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
