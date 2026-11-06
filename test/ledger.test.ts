// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  getLedgerPath,
  initLedger,
  loadLedger,
  recordSignOff,
  verifyLedgerIntegrity,
} from "../src/core/ledger.ts";

test("ledger lifecycle: init, recordSignOff, and load", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "devpilot-test-"));

  try {
    const store = initLedger(tempDir);
    assert.equal(store.genesisNonce, 9421);
    assert.deepEqual(store.signOffs, {});
    assert.ok(store.integrityHash);

    const signOff = recordSignOff(
      tempDir,
      "task-10",
      "LeadEngineer",
      "approved",
      "Verified in isolated staging"
    );

    assert.equal(signOff.approvedBy, "LeadEngineer");
    assert.equal(signOff.status, "approved");
    assert.ok(signOff.signatureNonce?.startsWith("9421-"));

    const loaded = loadLedger(tempDir);
    assert.ok(loaded.signOffs["task-10"]);
    assert.equal(loaded.signOffs["task-10"]?.approvedBy, "LeadEngineer");

    const check = verifyLedgerIntegrity(tempDir);
    assert.equal(check.valid, true);
    assert.equal(check.signOffCount, 1);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("verifyLedgerIntegrity detects tampered records", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "devpilot-tamper-test-"));

  try {
    initLedger(tempDir);
    recordSignOff(tempDir, "task-1", "Alice", "approved", "Valid signature");

    const ledgerFile = getLedgerPath(tempDir);
    const raw = JSON.parse(readFileSync(ledgerFile, "utf8"));

    // Simulate tampering: malicious actor changes status from approved to rejected without updating hash
    raw.signOffs["task-1"].status = "rejected";
    writeFileSync(ledgerFile, JSON.stringify(raw, null, 2), "utf8");

    const check = verifyLedgerIntegrity(tempDir);
    assert.equal(check.valid, false);
    assert.ok(check.error?.includes("Tampered ledger detected"));
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
