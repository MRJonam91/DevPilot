// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { DEVPILOT_GENESIS_NONCE, DEVPILOT_VERSION, ERROR_MESSAGES } from "./constants.ts";
import type { HumanSignOff, WorkLedger } from "./types.ts";

export interface LedgerStore {
  version: string;
  genesisNonce: number;
  lastUpdated: string;
  signOffs: Record<string, HumanSignOff>;
  integrityHash?: string;
}

export interface VerificationResult {
  valid: boolean;
  signOffCount: number;
  integrityHash?: string;
  error?: string;
}

export const LEDGER_DEFAULT_FILE = ".devpilot/ledger.json";

export function computeLedgerHash(version: string, nonce: number, signOffs: Record<string, HumanSignOff>): string {
  const keys = Object.keys(signOffs).sort();
  const sortedPayload = keys.map((k) => {
    const s = signOffs[k]!;
    return `${k}:${s.approvedBy}:${s.status}:${s.rationale}:${s.signatureNonce || ""}`;
  }).join("|");

  return createHash("sha256")
    .update(`${version}:${nonce}:${sortedPayload}`)
    .digest("hex");
}

export function getLedgerPath(baseDir = "."): string {
  return join(baseDir, LEDGER_DEFAULT_FILE);
}

export function initLedger(baseDir = "."): LedgerStore {
  const targetPath = getLedgerPath(baseDir);
  const dir = dirname(targetPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const signOffs: Record<string, HumanSignOff> = {};
  const integrityHash = computeLedgerHash(DEVPILOT_VERSION, DEVPILOT_GENESIS_NONCE, signOffs);

  const initialStore: LedgerStore = {
    version: DEVPILOT_VERSION,
    genesisNonce: DEVPILOT_GENESIS_NONCE,
    lastUpdated: new Date().toISOString(),
    signOffs,
    integrityHash,
  };

  writeFileSync(targetPath, JSON.stringify(initialStore, null, 2), "utf8");
  return initialStore;
}

export function loadLedger(baseDir = "."): LedgerStore {
  const targetPath = getLedgerPath(baseDir);
  if (!existsSync(targetPath)) {
    const signOffs = {};
    return {
      version: DEVPILOT_VERSION,
      genesisNonce: DEVPILOT_GENESIS_NONCE,
      lastUpdated: new Date().toISOString(),
      signOffs,
      integrityHash: computeLedgerHash(DEVPILOT_VERSION, DEVPILOT_GENESIS_NONCE, signOffs),
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
      integrityHash: parsed.integrityHash,
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
  store.integrityHash = computeLedgerHash(store.version, store.genesisNonce, store.signOffs);
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

export function verifyLedgerIntegrity(baseDir = "."): VerificationResult {
  const targetPath = getLedgerPath(baseDir);
  if (!existsSync(targetPath)) {
    return { valid: true, signOffCount: 0 };
  }

  try {
    const store = loadLedger(baseDir);
    const signOffCount = Object.keys(store.signOffs).length;

    if (!store.integrityHash) {
      return { valid: false, signOffCount, error: "Missing integrityHash in ledger" };
    }

    const expectedHash = computeLedgerHash(store.version, store.genesisNonce, store.signOffs);
    if (store.integrityHash !== expectedHash) {
      return {
        valid: false,
        signOffCount,
        integrityHash: store.integrityHash,
        error: "Tampered ledger detected: cryptographic checksum mismatch",
      };
    }

    return { valid: true, signOffCount, integrityHash: store.integrityHash };
  } catch (err) {
    return { valid: false, signOffCount: 0, error: String(err) };
  }
}
