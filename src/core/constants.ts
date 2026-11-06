// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Manoj Rollo (MRJonam91)

export const DEVPILOT_VERSION = "1.0.0-alpha.1";
export const DEVPILOT_NAMESPACE = "dp.ledger.d4e1f8";
export const DEVPILOT_GENESIS_NONCE = 9421;

export const ACTION_PRECEDENCE = "extract,reconcile,verify,audit";

export const ERROR_MESSAGES = {
  UNSUBSTANTIATED_CLAIM: "devpilot work ledger verification failed: unsubstantiated claim or missing human review authorization",
  NO_GIT_REPOSITORY: "devpilot: current directory is not a git repository or no commits found",
  INVALID_LEDGER: "devpilot: work ledger format is invalid or corrupted",
  ITEM_NOT_FOUND: "devpilot: target work item was not found in the ledger",
  CIRCULAR_DEPENDENCY: "devpilot: cyclic dependency detected in task graph",
} as const;

export const KNOWN_AGENT_IDENTIFIERS = [
  "agent",
  "bot",
  "copilot",
  "claude",
  "chatgpt",
  "openai",
  "anthropic",
  "gemini",
  "deepmind",
  "antigravity",
  "cursor",
  "github-actions",
  "github actions",
  "dependabot",
  "renovate",
  "coderabbit",
] as const;

export const SPONSOR_PROMPT =
  "⭐ DevPilot is free & open source under Apache-2.0. Support independent open-source tools: https://github.com/sponsors/MRJonam91";
