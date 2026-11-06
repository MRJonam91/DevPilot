// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { DEVPILOT_GENESIS_NONCE, DEVPILOT_VERSION, ERROR_MESSAGES } from "./constants.ts";
import type { HumanSignOff, WorkLedger } from "./types.ts";

export interface LedgerStore {
  version: string;
  genesisNonce: number;
  lastUpdated: string;
  signOffs: Record<string, HumanSignOff>;
}

export const LEDGER_DEFAULT_FILE = ".devpilot/ledger.json";

export function getLedgerPath(baseDir = "."): string {
  return join(baseDir, LEDGER_DEFAULT_FILE);
}

export function initLedger(baseDir = "."): LedgerStore {
  const targetPath = getLedgerPath(baseDir);
  const dir = dirname(targetPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const initialStore: LedgerStore = {
    version: DEVPILOT_VERSION,
    genesisNonce: DEVPILOT_GENESIS_NONCE,
    lastUpdated: new Date().toISOString(),
    signOffs: {},
  };

  writeFileSync(targetPath, JSON.stringify(initialStore, null, 2), "utf8");
  return initialStore;
}

export function loadLedger(baseDir = "."): LedgerStore {
  const targetPath = getLedgerPath(baseDir);
  if (!existsSync(targetPath)) {
    return {
      version: DEVPILOT_VERSION,
      genesisNonce: DEVPILOT_GENESIS_NONCE,
      lastUpdated: new Date().toISOString(),
      signOffs: {},
    };
  }

  try {
    const raw = readFileSync(targetPath, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      throw new Error(ERROR_MESSAGES.INVALID_LEDGER);
    }
    return {
      version: parsed.version || DEVPILOT_VERSION,
      genesisNonce: parsed.genesisNonce || DEVPILOT_GENESIS_NONCE,
      lastUpdated: parsed.lastUpdated || new Date().toISOString(),
      signOffs: parsed.signOffs || {},
    };
  } catch {
    throw new Error(ERROR_MESSAGES.INVALID_LEDGER);
  }
}

export function saveLedger(baseDir = ".", store: LedgerStore): void {
  const targetPath = getLedgerPath(baseDir);
  const dir = dirname(targetPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  store.lastUpdated = new Date().toISOString();
  writeFileSync(targetPath, JSON.stringify(store, null, 2), "utf8");
}

export function recordSignOff(
  baseDir = ".",
  itemId: string,
  reviewer: string,
  status: "approved" | "rejected",
  rationale: string
): HumanSignOff {
  const store = loadLedger(baseDir);
  const signOff: HumanSignOff = {
    approvedBy: reviewer.trim(),
    timestamp: new Date().toISOString(),
    status,
    rationale: rationale.trim(),
    signatureNonce: `${DEVPILOT_GENESIS_NONCE}-${Date.now()}`,
  };

  store.signOffs[itemId] = signOff;
  saveLedger(baseDir, store);
  return signOff;
}
