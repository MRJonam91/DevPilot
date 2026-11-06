// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import { readFileSync, existsSync } from "node:fs";
import type { IssueRecord } from "./types.ts";

export function parseIssuesJson(jsonContent: string): IssueRecord[] {
  if (!jsonContent.trim()) return [];
  const parsed = JSON.parse(jsonContent);
  const rawList = Array.isArray(parsed) ? parsed : (parsed.issues || []);

  const issues: IssueRecord[] = [];
  for (const item of rawList) {
    if (!item) continue;
    const id = Number(item.number ?? item.id);
    if (Number.isNaN(id)) continue;

    const title = String(item.title ?? `Issue #${id}`);
    const stateRaw = String(item.state ?? item.status ?? "open").toLowerCase();
    const status: "open" | "closed" = stateRaw === "closed" ? "closed" : "open";

    const assignees: string[] = [];
    if (Array.isArray(item.assignees)) {
      for (const a of item.assignees) {
        if (typeof a === "string") assignees.push(a);
        else if (a && typeof a.login === "string") assignees.push(a.login);
      }
    }

    const labels: string[] = [];
    if (Array.isArray(item.labels)) {
      for (const l of item.labels) {
        if (typeof l === "string") labels.push(l);
        else if (l && typeof l.name === "string") labels.push(l.name);
      }
    }

    issues.push({
      id,
      title,
      status,
      assignees,
      labels,
      body: item.body ? String(item.body) : undefined,
      url: item.url ? String(item.url) : (item.html_url ? String(item.html_url) : undefined),
      closedAt: item.closedAt || item.closed_at ? String(item.closedAt || item.closed_at) : undefined,
    });
  }

  return issues.sort((a, b) => a.id - b.id);
}

export function parseIssuesMarkdown(markdownContent: string): IssueRecord[] {
  const lines = markdownContent.split("\n");
  const issues: IssueRecord[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Matches patterns like: - [x] #12 Feature title or - [ ] #13 Bug title
    const match = trimmed.match(/^-\s*\[([ xX])\]\s*(?:#|GH-)?(\d+)\s*[:\-]\s*(.+)$/);
    if (match?.[1] && match[2] && match[3]) {
      const isClosed = match[1].toLowerCase() === "x";
      const id = Number.parseInt(match[2], 10);
      const title = match[3].trim();

      issues.push({
        id,
        title,
        status: isClosed ? "closed" : "open",
        assignees: [],
        labels: [],
      });
    }
  }

  return issues;
}

export function loadIssuesFromFile(filePath: string): IssueRecord[] {
  if (!existsSync(filePath)) return [];
  const content = readFileSync(filePath, "utf8");
  if (filePath.endsWith(".json")) {
    return parseIssuesJson(content);
  }
  return parseIssuesMarkdown(content);
}
