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
      const msgMatch = bodyStr.match(/message="([^"]*)"/) || bodyStr.match(/<failure[^>]*>([\s\S]*?)<\/failure>/i);
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
  const total = tests.length;
  const durationMs = tests.reduce((acc, t) => acc + t.durationMs, 0);

  return {
    total,
    passed,
    failed,
    skipped,
    durationMs,
    timestamp: new Date().toISOString(),
    tests,
  };
}

export function parseNodeJsonTestOutput(jsonContent: string): TestSuiteSummary {
  const tests: TestCaseRecord[] = [];

  // Support lines of JSON (ndjson) or a single object
  const lines = jsonContent.split("\n").filter((l) => l.trim().length > 0);
  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      // Node.js test runner event format or Jest format
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
        // Jest/Vitest JSON output format
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
  return parseNodeJsonTestOutput(content);
}
