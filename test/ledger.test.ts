// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  initLedger,
  loadLedger,
  recordSignOff,
} from "../src/core/ledger.ts";

test("ledger lifecycle: init, recordSignOff, and load", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "devpilot-test-"));

  try {
    const store = initLedger(tempDir);
    assert.equal(store.genesisNonce, 9421);
    assert.deepEqual(store.signOffs, {});

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
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
