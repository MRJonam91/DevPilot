// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
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
    "-o",
    "out.html",
  ]);

  assert.equal(positional[0], "report");
  assert.equal(flags.repo, "./my-repo");
  assert.equal(flags.format, "html");
  assert.equal(flags.noSponsor, true);
  assert.equal(flags.o, "out.html");
});

test("runCli commands: help, version, init, verify", async () => {
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
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
