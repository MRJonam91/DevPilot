// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import {
  loadTestResultsFromFile,
  parseJunitXml,
  parseNodeJsonTestOutput,
  parseTapOutput,
} from "../src/core/tests-parser.ts";

test("parseJunitXml parses JUnit XML suites and test cases", () => {
  const fixturePath = resolve("test/fixtures/junit-sample.xml");
  const summary = loadTestResultsFromFile(fixturePath);

  assert.equal(summary.total, 3);
  assert.equal(summary.passed, 1);
  assert.equal(summary.failed, 1);
  assert.equal(summary.skipped, 1);
  assert.ok(summary.durationMs >= 100);

  const failedTest = summary.tests.find((t) => t.status === "failed");
  assert.ok(failedTest);
  assert.equal(failedTest?.name, "should fail on unverified agent code");
  assert.ok(failedTest?.failureMessage?.includes("Agent commit detected"));
});

test("parseTapOutput parses Test Anything Protocol streams", () => {
  const tap = `
TAP version 13
1..3
ok 1 - Core reconciliation unit test
not ok 2 - Critical path agent check # Timeout in sandbox
ok 3 - Legacy parser benchmark # SKIP disabled on CI
`;

  const summary = parseTapOutput(tap);
  assert.equal(summary.total, 3);
  assert.equal(summary.passed, 1);
  assert.equal(summary.failed, 1);
  assert.equal(summary.skipped, 1);
  assert.equal(summary.tests[1]?.failureMessage, "Timeout in sandbox");
});

test("parseNodeJsonTestOutput parses test runner json events", () => {
  const jsonEvents = [
    JSON.stringify({ type: "test:pass", data: { name: "test A", file: "suite.js", durationMs: 15 } }),
    JSON.stringify({ type: "test:fail", data: { name: "test B", file: "suite.js", durationMs: 25, error: { message: "Value mismatch" } } }),
  ].join("\n");

  const summary = parseNodeJsonTestOutput(jsonEvents);
  assert.equal(summary.total, 2);
  assert.equal(summary.passed, 1);
  assert.equal(summary.failed, 1);
  assert.equal(summary.tests[1]?.failureMessage, "Value mismatch");
});
