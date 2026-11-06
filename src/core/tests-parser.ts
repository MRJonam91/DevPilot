// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import { readFileSync, existsSync } from "node:fs";
import type { TestCaseRecord, TestSuiteSummary } from "./types.ts";

export function parseJunitXml(xmlContent: string): TestSuiteSummary {
  const tests: TestCaseRecord[] = [];
  const testcaseRegex = /<testcase\b([^>]*?)(\/>|>([\s\S]*?)<\/testcase>)/gi;

  let match: RegExpExecArray | null;
  while ((match = testcaseRegex.exec(xmlContent)) !== null) {
    const attrsStr = match[1] || "";
    const bodyStr = match[3] || "";

    const nameMatch = attrsStr.match(/\bname="([^"]*)"/);
    const classnameMatch = attrsStr.match(/\bclassname="([^"]*)"/);
    const timeMatch = attrsStr.match(/\btime="([^"]*)"/);

    const name = nameMatch?.[1] || "unnamed test";
    const suite = classnameMatch?.[1] || "default";
    const timeSeconds = Number.parseFloat(timeMatch?.[1] || "0");
    const durationMs = Math.round(timeSeconds * 1000);

    let status: "passed" | "failed" | "skipped" = "passed";
    let failureMessage: string | undefined;

    if (/<failure\b|<error\b/i.test(bodyStr)) {
      status = "failed";
      const msgMatch = bodyStr.match(/message="([^"]*)"/) || bodyStr.match(/<(?:failure|error)[^>]*>([\s\S]*?)<\/(?:failure|error)>/i);
      failureMessage = msgMatch?.[1]?.trim() || "Test failed";
    } else if (/<skipped\b/i.test(bodyStr)) {
      status = "skipped";
    }

    tests.push({
      name,
      suite,
      status,
      durationMs,
      failureMessage,
    });
  }

  const passed = tests.filter((t) => t.status === "passed").length;
  const failed = tests.filter((t) => t.status === "failed").length;
  const skipped = tests.filter((t) => t.status === "skipped").length;

  return {
    total: tests.length,
    passed,
    failed,
    skipped,
    durationMs: tests.reduce((acc, t) => acc + t.durationMs, 0),
    timestamp: new Date().toISOString(),
    tests,
  };
}

export function parseTapOutput(tapContent: string): TestSuiteSummary {
  const tests: TestCaseRecord[] = [];
  const lines = tapContent.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    // Matches: ok 1 - test description or not ok 2 - test description # SKIP reason
    const match = trimmed.match(/^(ok|not ok)\s*(?:\d+)?\s*(?:-\s*)?([^#\n]+)?(?:\s*#\s*(.+))?$/i);
    if (match && match[1]) {
      const isOk = match[1].toLowerCase() === "ok";
      const desc = match[2]?.trim() || "unnamed test";
      const directive = match[3]?.trim() || "";

      let status: "passed" | "failed" | "skipped" = isOk ? "passed" : "failed";
      let failureMessage: string | undefined;

      if (/^skip\b/i.test(directive) || /^todo\b/i.test(directive)) {
        status = "skipped";
      } else if (!isOk) {
        failureMessage = directive || "Test assertion failed";
      }

      tests.push({
        name: desc,
        suite: "tap",
        status,
        durationMs: 0,
        failureMessage,
      });
    }
  }

  const passed = tests.filter((t) => t.status === "passed").length;
  const failed = tests.filter((t) => t.status === "failed").length;
  const skipped = tests.filter((t) => t.status === "skipped").length;

  return {
    total: tests.length,
    passed,
    failed,
    skipped,
    durationMs: 0,
    timestamp: new Date().toISOString(),
    tests,
  };
}

export function parseNodeJsonTestOutput(jsonContent: string): TestSuiteSummary {
  const tests: TestCaseRecord[] = [];

  const lines = jsonContent.split("\n").filter((l) => l.trim().length > 0);
  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      if (entry.type === "test:pass" || entry.type === "test:fail") {
        const isPass = entry.type === "test:pass";
        const details = entry.data || entry;
        tests.push({
          name: details.name || "test",
          suite: details.file || "suite",
          status: isPass ? "passed" : "failed",
          durationMs: Math.round(details.durationMs || details.duration || 0),
          failureMessage: isPass ? undefined : (details.error?.message || "Test failed"),
        });
      } else if (entry.testResults && Array.isArray(entry.testResults)) {
        for (const suite of entry.testResults) {
          for (const assertion of suite.assertionResults || []) {
            const status = assertion.status === "passed" ? "passed" : (assertion.status === "skipped" ? "skipped" : "failed");
            tests.push({
              name: assertion.title || assertion.fullName || "test",
              suite: suite.name || "suite",
              status,
              durationMs: assertion.duration || 0,
              failureMessage: assertion.failureMessages?.[0],
            });
          }
        }
      }
    } catch {
      // not a json line
    }
  }

  const passed = tests.filter((t) => t.status === "passed").length;
  const failed = tests.filter((t) => t.status === "failed").length;
  const skipped = tests.filter((t) => t.status === "skipped").length;

  return {
    total: tests.length,
    passed,
    failed,
    skipped,
    durationMs: tests.reduce((acc, t) => acc + t.durationMs, 0),
    timestamp: new Date().toISOString(),
    tests,
  };
}

export function loadTestResultsFromFile(filePath: string): TestSuiteSummary {
  if (!existsSync(filePath)) {
    return {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      durationMs: 0,
      timestamp: new Date().toISOString(),
      tests: [],
    };
  }

  const content = readFileSync(filePath, "utf8");
  if (filePath.endsWith(".xml")) {
    return parseJunitXml(content);
  }
  if (filePath.endsWith(".tap") || content.startsWith("TAP version") || /^1\.\.\d+/m.test(content)) {
    return parseTapOutput(content);
  }
  return parseNodeJsonTestOutput(content);
}
