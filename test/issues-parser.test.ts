// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import {
  loadIssuesFromFile,
  parseIssuesJson,
  parseIssuesMarkdown,
} from "../src/core/issues-parser.ts";

test("parseIssuesJson parses GitHub CLI issue format", () => {
  const json = JSON.stringify([
    {
      number: 10,
      title: "Add audit trail export",
      state: "OPEN",
      assignees: [{ login: "MRJonam91" }],
      labels: [{ name: "feature" }],
    },
    {
      number: 11,
      title: "Fix broken xml regex",
      state: "CLOSED",
      assignees: ["dev-bot"],
      labels: ["bug"],
      closedAt: "2026-11-06T14:00:00Z",
    },
  ]);

  const issues = parseIssuesJson(json);
  assert.equal(issues.length, 2);
  assert.equal(issues[0]?.id, 10);
  assert.equal(issues[0]?.status, "open");
  assert.deepEqual(issues[0]?.assignees, ["MRJonam91"]);

  assert.equal(issues[1]?.id, 11);
  assert.equal(issues[1]?.status, "closed");
});

test("parseIssuesMarkdown extracts issues from checklist format", () => {
  const md = `
# Project Tasks
- [x] #10: Implement HTML exporter
- [ ] #11: Add sponsor prompts
- [x] #12 - Finalize documentation
`;

  const issues = parseIssuesMarkdown(md);
  assert.equal(issues.length, 3);
  assert.equal(issues[0]?.id, 10);
  assert.equal(issues[0]?.status, "closed");
  assert.equal(issues[1]?.id, 11);
  assert.equal(issues[1]?.status, "open");
  assert.equal(issues[2]?.id, 12);
  assert.equal(issues[2]?.status, "closed");
});

test("loadIssuesFromFile loads sample fixture correctly", () => {
  const fixturePath = resolve("test/fixtures/issues-sample.json");
  const issues = loadIssuesFromFile(fixturePath);
  assert.equal(issues.length, 2);
  assert.equal(issues[0]?.id, 1);
  assert.equal(issues[0]?.status, "closed");
  assert.equal(issues[1]?.id, 2);
  assert.equal(issues[1]?.status, "open");
});
