// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseArgs, runCli } from "../src/cli/index.ts";

test("parseArgs parses flags and positional arguments accurately", () => {
  const { positional, flags } = parseArgs([
    "report",
    "--repo",
    "./my-repo",
    "--format",
    "html",
    "--no-sponsor",
    "--strict",
    "--since",
    "2026-01-01",
    "-o",
    "out.html",
  ]);

  assert.equal(positional[0], "report");
  assert.equal(flags.repo, "./my-repo");
  assert.equal(flags.format, "html");
  assert.equal(flags.noSponsor, true);
  assert.equal(flags.strict, true);
  assert.equal(flags.since, "2026-01-01");
  assert.equal(flags.o, "out.html");
});

test("runCli commands: help, version, init, verify, status, export, diff", async () => {
  const tempDir = mkdtempSync(join(tmpdir(), "devpilot-cli-test-"));

  try {
    const codeHelp = await runCli(["--help"]);
    assert.equal(codeHelp, 0);

    const codeVersion = await runCli(["--version"]);
    assert.equal(codeVersion, 0);

    const codeInit = await runCli(["init", "--repo", tempDir]);
    assert.equal(codeInit, 0);

    const codeApprove = await runCli([
      "approve",
      "task-99",
      "--repo",
      tempDir,
      "--by",
      "Auditor",
      "--note",
      "Checked test assertions",
    ]);
    assert.equal(codeApprove, 0);

    const codeVerify = await runCli(["verify", "--repo", tempDir]);
    assert.equal(codeVerify, 0);

    const codeStatus = await runCli(["status", "--repo", tempDir]);
    assert.equal(codeStatus, 0);

    const codeExport = await runCli(["export", "--repo", tempDir, "--output", tempDir]);
    assert.equal(codeExport, 0);
    assert.ok(existsSync(join(tempDir, "devpilot-report.html")));
    assert.ok(existsSync(join(tempDir, "devpilot-report.md")));
    assert.ok(existsSync(join(tempDir, "devpilot-report.json")));

    const codeDiff = await runCli(["diff", "task-99", "--repo", tempDir]);
    // Task-99 exists in ledger as a signOff, but no commits/tests in empty tempDir; diff handles missing item gracefully
    assert.ok(codeDiff === 0 || codeDiff === 1);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
