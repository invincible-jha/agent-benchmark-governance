// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 MuVeraAI Corporation

/**
 * Trust-gate 6-step pipeline benchmarks.
 *
 * Measures the latency overhead introduced by each layer of the trust-gate
 * evaluation pipeline in isolation and in combination:
 *
 *   Step 1 — Full evaluate() cycle (baseline — all six layers together)
 *   Step 2 — Circuit breaker check overhead
 *   Step 3 — Rate limiter token-bucket check overhead
 *   Step 4 — Tool policy evaluation overhead
 *   Step 5 — Static budget tracker check overhead
 *   Step 6 — AuditLogger append with SHA-256 hash chain overhead
 *
 * Each step is measured standalone so you can see exactly how much each
 * layer contributes to total latency.  The "overhead" benchmarks run the
 * six-layer pipeline minus one layer, then the difference reveals the cost
 * of that layer.
 *
 * CONSTRAINTS (from AumOS fire line):
 *   - Trust levels are MANUAL ONLY — no auto-promotion
 *   - Budget allocations are STATIC ONLY — no adaptive algorithms
 *   - Audit logging is RECORDING ONLY — no anomaly detection, no counterfactuals
 *
 * Run:
 *   npx tsx benchmarks/trust-gate-pipeline.ts
 */

import { createHash } from "node:crypto";
import {
  type BenchmarkResult,
  formatResults,
  runBenchmark,
  writeResultsToFile,
} from "./harness.js";

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

const DEFAULT_ITERATIONS = 10_000;
const DEFAULT_WARMUP = 200;

// ---------------------------------------------------------------------------
// Step 1 — CircuitBreaker
//
// Opens after a configurable number of consecutive failures and stays open
// for a fixed cool-down window.  All state is in-memory; no side effects.
// ---------------------------------------------------------------------------

interface CircuitBreakerState {
  consecutiveFailures: number;
  openedAt: number | null;
}

class CircuitBreaker {
  private state: CircuitBreakerState = { consecutiveFailures: 0, openedAt: null };

  constructor(
    private readonly failureThreshold: number,
    private readonly cooldownMs: number,
  ) {}

  isOpen(): boolean {
    if (this.state.openedAt === null) return false;
    const elapsed = Date.now() - this.state.openedAt;
    if (elapsed >= this.cooldownMs) {
      // Cool-down expired — reset to half-open
      this.state.openedAt = null;
      this.state.consecutiveFailures = 0;
      return false;
    }
    return true;
  }

  recordSuccess(): void {
    this.state.consecutiveFailures = 0;
    this.state.openedAt = null;
  }

  recordFailure(): void {
    this.state.consecutiveFailures++;
    if (this.state.consecutiveFailures >= this.failureThreshold) {
      this.state.openedAt = Date.now();
    }
  }
}

// ---------------------------------------------------------------------------
// Step 2 — RateLimiter (token bucket)
//
// Each agent gets a bucket of tokens that refills at a fixed rate.
// checkAndConsume() returns true if tokens are available and deducts one.
// No network or I/O — purely in-process.
// ---------------------------------------------------------------------------

interface TokenBucket {
  tokens: number;
  lastRefillAt: number;
}

class RateLimiter {
  private readonly buckets: Map<string, TokenBucket> = new Map();

  constructor(
    private readonly maxTokens: number,
    private readonly refillRatePerMs: number,
  ) {}

  checkAndConsume(agentId: string): boolean {
    const now = Date.now();
    let bucket = this.buckets.get(agentId);

    if (bucket === undefined) {
      bucket = { tokens: this.maxTokens, lastRefillAt: now };
      this.buckets.set(agentId, bucket);
    }

    // Refill tokens proportional to elapsed time
    const elapsed = now - bucket.lastRefillAt;
    const refilled = Math.min(
      this.maxTokens,
      bucket.tokens + elapsed * this.refillRatePerMs,
    );
    bucket.tokens = refilled;
    bucket.lastRefillAt = now;

    if (bucket.tokens < 1) return false;
    bucket.tokens -= 1;
    return true;
  }
}

// ---------------------------------------------------------------------------
// Step 3 — ToolPolicy
//
// Evaluates whether a named tool is permitted for a given trust level.
// Rules are loaded statically at construction time from a policy table.
// ---------------------------------------------------------------------------

type TrustLevel = "none" | "low" | "medium" | "high" | "owner";

const TRUST_ORDER: Record<TrustLevel, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
  owner: 4,
};

interface ToolPolicyRule {
  toolName: string;
  minimumTrustLevel: TrustLevel;
  requiresConsent: boolean;
  allowedScopes: ReadonlySet<string>;
}

class ToolPolicyEvaluator {
  private readonly rules: Map<string, ToolPolicyRule>;

  constructor(rules: ToolPolicyRule[]) {
    this.rules = new Map(rules.map((r) => [r.toolName, r]));
  }

  evaluate(
    toolName: string,
    agentTrustLevel: TrustLevel,
    consentGranted: boolean,
    requestedScope: string,
  ): { permitted: boolean; reason: string } {
    const rule = this.rules.get(toolName);
    if (rule === undefined) {
      return { permitted: false, reason: "no_policy_for_tool" };
    }
    if (TRUST_ORDER[agentTrustLevel] < TRUST_ORDER[rule.minimumTrustLevel]) {
      return { permitted: false, reason: "insufficient_trust" };
    }
    if (rule.requiresConsent && !consentGranted) {
      return { permitted: false, reason: "consent_required" };
    }
    if (!rule.allowedScopes.has(requestedScope)) {
      return { permitted: false, reason: "scope_not_allowed" };
    }
    return { permitted: true, reason: "policy_satisfied" };
  }
}

// ---------------------------------------------------------------------------
// Step 4 — BudgetTracker
//
// Tracks static per-agent spending allocations.  checkBudget returns false
// when the agent has no remaining budget.  Budget is set by policy owner;
// it is never computed or adapted automatically.
// ---------------------------------------------------------------------------

interface BudgetEntry {
  totalAllocation: number;
  spent: number;
}

class BudgetTracker {
  private readonly entries: Map<string, BudgetEntry> = new Map();

  setAllocation(agentId: string, amount: number): void {
    this.entries.set(agentId, { totalAllocation: amount, spent: 0 });
  }

  checkBudget(agentId: string, cost: number): boolean {
    const entry = this.entries.get(agentId);
    if (entry === undefined) return false;
    return entry.spent + cost <= entry.totalAllocation;
  }

  recordSpend(agentId: string, cost: number): void {
    const entry = this.entries.get(agentId);
    if (entry !== undefined) {
      entry.spent += cost;
    }
  }
}

// ---------------------------------------------------------------------------
// Step 5 — AuditLogger (recording only, SHA-256 hash chain)
// ---------------------------------------------------------------------------

interface AuditEntry {
  sequenceNumber: number;
  agentId: string;
  toolName: string;
  decision: "allow" | "deny";
  reason: string;
  timestamp: number;
  previousHash: string;
  hash: string;
}

class AuditLogger {
  private readonly log: AuditEntry[] = [];
  private previousHash = "0".repeat(64);
  private sequenceNumber = 0;

  append(
    agentId: string,
    toolName: string,
    decision: "allow" | "deny",
    reason: string,
  ): void {
    const sequenceNumber = ++this.sequenceNumber;
    const timestamp = Date.now();
    const payload = `${sequenceNumber}|${agentId}|${toolName}|${decision}|${reason}|${timestamp}|${this.previousHash}`;
    const hash = createHash("sha256").update(payload).digest("hex");

    this.log.push({
      sequenceNumber,
      agentId,
      toolName,
      decision,
      reason,
      timestamp,
      previousHash: this.previousHash,
      hash,
    });

    this.previousHash = hash;
  }

  entryCount(): number {
    return this.log.length;
  }
}

// ---------------------------------------------------------------------------
// TrustGate — the 6-step pipeline
//
// Each flag lets a benchmark skip individual steps to measure their overhead.
// ---------------------------------------------------------------------------

interface TrustGateOptions {
  skipCircuitBreaker?: boolean;
  skipRateLimiter?: boolean;
  skipToolPolicy?: boolean;
  skipBudgetCheck?: boolean;
  skipAudit?: boolean;
}

interface TrustGateRequest {
  agentId: string;
  agentTrustLevel: TrustLevel;
  toolName: string;
  requestedScope: string;
  cost: number;
  consentGranted: boolean;
}

interface TrustGateResult {
  allowed: boolean;
  reason: string;
}

class TrustGate {
  constructor(
    private readonly circuitBreaker: CircuitBreaker,
    private readonly rateLimiter: RateLimiter,
    private readonly policyEvaluator: ToolPolicyEvaluator,
    private readonly budgetTracker: BudgetTracker,
    private readonly auditLogger: AuditLogger,
  ) {}

  evaluate(request: TrustGateRequest, options: TrustGateOptions = {}): TrustGateResult {
    // Step 1 — Circuit breaker
    if (!options.skipCircuitBreaker && this.circuitBreaker.isOpen()) {
      const result: TrustGateResult = { allowed: false, reason: "circuit_open" };
      if (!options.skipAudit) {
        this.auditLogger.append(request.agentId, request.toolName, "deny", result.reason);
      }
      return result;
    }

    // Step 2 — Rate limiter
    if (!options.skipRateLimiter && !this.rateLimiter.checkAndConsume(request.agentId)) {
      const result: TrustGateResult = { allowed: false, reason: "rate_limit_exceeded" };
      if (!options.skipAudit) {
        this.auditLogger.append(request.agentId, request.toolName, "deny", result.reason);
      }
      return result;
    }

    // Step 3 — Tool policy evaluation
    if (!options.skipToolPolicy) {
      const policyResult = this.policyEvaluator.evaluate(
        request.toolName,
        request.agentTrustLevel,
        request.consentGranted,
        request.requestedScope,
      );
      if (!policyResult.permitted) {
        if (!options.skipAudit) {
          this.auditLogger.append(
            request.agentId,
            request.toolName,
            "deny",
            policyResult.reason,
          );
        }
        return { allowed: false, reason: policyResult.reason };
      }
    }

    // Step 4 — Budget check
    if (!options.skipBudgetCheck && !this.budgetTracker.checkBudget(request.agentId, request.cost)) {
      const result: TrustGateResult = { allowed: false, reason: "budget_exceeded" };
      if (!options.skipAudit) {
        this.auditLogger.append(request.agentId, request.toolName, "deny", result.reason);
      }
      return result;
    }

    // All checks passed — record the allowed decision
    if (!options.skipAudit) {
      this.auditLogger.append(request.agentId, request.toolName, "allow", "all_checks_passed");
    }

    return { allowed: true, reason: "all_checks_passed" };
  }
}

// ---------------------------------------------------------------------------
// Fixture factory
// ---------------------------------------------------------------------------

function buildGate(): { gate: TrustGate; request: TrustGateRequest } {
  const circuitBreaker = new CircuitBreaker(5, 30_000);
  const rateLimiter = new RateLimiter(10_000, 10); // 10 tokens/ms = 10k/s
  const policyEvaluator = new ToolPolicyEvaluator([
    {
      toolName: "web_search",
      minimumTrustLevel: "low",
      requiresConsent: false,
      allowedScopes: new Set(["read"]),
    },
    {
      toolName: "send_email",
      minimumTrustLevel: "medium",
      requiresConsent: true,
      allowedScopes: new Set(["write"]),
    },
    {
      toolName: "execute_code",
      minimumTrustLevel: "high",
      requiresConsent: true,
      allowedScopes: new Set(["execute", "read", "write"]),
    },
  ]);
  const budgetTracker = new BudgetTracker();
  // Budget allocated statically by policy owner — never computed
  budgetTracker.setAllocation("agent-gate-bench", 999_999);
  const auditLogger = new AuditLogger();

  const gate = new TrustGate(
    circuitBreaker,
    rateLimiter,
    policyEvaluator,
    budgetTracker,
    auditLogger,
  );

  const request: TrustGateRequest = {
    agentId: "agent-gate-bench",
    agentTrustLevel: "high",
    toolName: "execute_code",
    requestedScope: "execute",
    cost: 0.001,
    consentGranted: true,
  };

  return { gate, request };
}

// ---------------------------------------------------------------------------
// Benchmark definitions
// ---------------------------------------------------------------------------

/** Step A: Full 6-step pipeline (all layers active) */
async function benchmarkFullPipeline(): Promise<BenchmarkResult> {
  const { gate, request } = buildGate();
  return runBenchmark(
    "TrustGate full evaluate() — all 6 steps",
    () => {
      gate.evaluate(request);
    },
    { iterations: DEFAULT_ITERATIONS, warmupIterations: DEFAULT_WARMUP },
  );
}

/** Step B: Pipeline minus circuit breaker — isolate circuit breaker overhead */
async function benchmarkWithoutCircuitBreaker(): Promise<BenchmarkResult> {
  const { gate, request } = buildGate();
  return runBenchmark(
    "TrustGate — circuit breaker SKIPPED (overhead = full - this)",
    () => {
      gate.evaluate(request, { skipCircuitBreaker: true });
    },
    { iterations: DEFAULT_ITERATIONS, warmupIterations: DEFAULT_WARMUP },
  );
}

/** Step C: Pipeline minus rate limiter — isolate rate limiter overhead */
async function benchmarkWithoutRateLimiter(): Promise<BenchmarkResult> {
  const { gate, request } = buildGate();
  return runBenchmark(
    "TrustGate — rate limiter SKIPPED (overhead = full - this)",
    () => {
      gate.evaluate(request, { skipRateLimiter: true });
    },
    { iterations: DEFAULT_ITERATIONS, warmupIterations: DEFAULT_WARMUP },
  );
}

/** Step D: Pipeline minus tool policy — isolate tool policy evaluation overhead */
async function benchmarkWithoutToolPolicy(): Promise<BenchmarkResult> {
  const { gate, request } = buildGate();
  return runBenchmark(
    "TrustGate — tool policy SKIPPED (overhead = full - this)",
    () => {
      gate.evaluate(request, { skipToolPolicy: true });
    },
    { iterations: DEFAULT_ITERATIONS, warmupIterations: DEFAULT_WARMUP },
  );
}

/** Step E: Pipeline minus budget check — isolate budget tracker overhead */
async function benchmarkWithoutBudgetCheck(): Promise<BenchmarkResult> {
  const { gate, request } = buildGate();
  return runBenchmark(
    "TrustGate — budget tracker SKIPPED (overhead = full - this)",
    () => {
      gate.evaluate(request, { skipBudgetCheck: true });
    },
    { iterations: DEFAULT_ITERATIONS, warmupIterations: DEFAULT_WARMUP },
  );
}

/** Step F: Pipeline minus audit logger — isolate SHA-256 hash chain overhead */
async function benchmarkWithoutAuditLogger(): Promise<BenchmarkResult> {
  const { gate, request } = buildGate();
  return runBenchmark(
    "TrustGate — audit logger SKIPPED (overhead = full - this)",
    () => {
      gate.evaluate(request, { skipAudit: true });
    },
    { iterations: DEFAULT_ITERATIONS, warmupIterations: DEFAULT_WARMUP },
  );
}

/** Standalone: Just the SHA-256 hash chain in isolation */
async function benchmarkAuditHashChainAlone(): Promise<BenchmarkResult> {
  const auditLogger = new AuditLogger();
  return runBenchmark(
    "AuditLogger SHA-256 hash chain alone",
    () => {
      auditLogger.append("agent-bench", "execute_code", "allow", "all_checks_passed");
    },
    { iterations: DEFAULT_ITERATIONS, warmupIterations: DEFAULT_WARMUP },
  );
}

/** Standalone: Just the circuit breaker isOpen() in isolation */
async function benchmarkCircuitBreakerAlone(): Promise<BenchmarkResult> {
  const breaker = new CircuitBreaker(5, 30_000);
  return runBenchmark(
    "CircuitBreaker.isOpen() alone",
    () => {
      breaker.isOpen();
    },
    { iterations: DEFAULT_ITERATIONS, warmupIterations: DEFAULT_WARMUP },
  );
}

/** Standalone: Just the rate limiter in isolation */
async function benchmarkRateLimiterAlone(): Promise<BenchmarkResult> {
  const limiter = new RateLimiter(999_999_999, 1_000_000);
  return runBenchmark(
    "RateLimiter.checkAndConsume() alone",
    () => {
      limiter.checkAndConsume("agent-bench");
    },
    { iterations: DEFAULT_ITERATIONS, warmupIterations: DEFAULT_WARMUP },
  );
}

// ---------------------------------------------------------------------------
// Entrypoint
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("AumOS Trust-Gate 6-Step Pipeline — Latency Benchmarks");
  console.log("=".repeat(60));
  console.log();

  const allResults: BenchmarkResult[] = [];

  console.log("1/8  Full 6-step pipeline...");
  allResults.push(await benchmarkFullPipeline());

  console.log("2/8  Pipeline minus circuit breaker...");
  allResults.push(await benchmarkWithoutCircuitBreaker());

  console.log("3/8  Pipeline minus rate limiter...");
  allResults.push(await benchmarkWithoutRateLimiter());

  console.log("4/8  Pipeline minus tool policy evaluator...");
  allResults.push(await benchmarkWithoutToolPolicy());

  console.log("5/8  Pipeline minus budget tracker...");
  allResults.push(await benchmarkWithoutBudgetCheck());

  console.log("6/8  Pipeline minus audit logger...");
  allResults.push(await benchmarkWithoutAuditLogger());

  console.log("7/8  AuditLogger SHA-256 hash chain alone...");
  allResults.push(await benchmarkAuditHashChainAlone());

  console.log("8/8  CircuitBreaker + RateLimiter standalone...");
  allResults.push(await benchmarkCircuitBreakerAlone());
  allResults.push(await benchmarkRateLimiterAlone());

  // --- Output ---
  console.log();
  console.log(formatResults(allResults));
  console.log();

  writeResultsToFile(allResults, "benchmarks/results-trust-gate-pipeline.md");
  console.log("Results written to benchmarks/results-trust-gate-pipeline.md");
}

main().catch((error: unknown) => {
  console.error("Benchmark failed:", error);
  process.exit(1);
});
