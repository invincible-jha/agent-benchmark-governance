// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 MuVeraAI Corporation

/**
 * Governance pipeline load tests and benchmarks.
 *
 * Measures the performance characteristics of each major governance primitive:
 *   - GovernanceEngine.evaluate()  — full policy evaluation
 *   - TrustManager.checkLevel()    — static trust-level lookup
 *   - BudgetManager.checkBudget()  — static budget constraint check
 *   - AuditLogger.log()            — append-only record with SHA-256 hash chain
 *   - Memory footprint             — heap growth per 10 K audit records
 *   - StorageAdapter comparison    — in-process memory vs simulated external adapters
 *
 * CONSTRAINTS (from AumOS fire line):
 *   - Trust levels are MANUAL ONLY — no auto-promotion
 *   - Budget allocations are STATIC ONLY — no adaptive algorithms
 *   - Audit logging is RECORDING ONLY — no anomaly detection, no counterfactuals
 *
 * Run:
 *   npm run benchmark
 *   -- or --
 *   npx tsx benchmarks/governance-pipeline.ts
 */

import { createHash } from "node:crypto";
import {
  type BenchmarkResult,
  formatResults,
  runBenchmark,
  writeResultsToFile,
} from "./harness.js";

// ---------------------------------------------------------------------------
// Simulated governance primitives
//
// These stubs replicate the computational shape of the real primitives so that
// benchmark measurements reflect realistic CPU work — map lookups, policy table
// scans, cryptographic hashing — without importing unpublished packages.
// ---------------------------------------------------------------------------

// ---- TrustLevel enum -------------------------------------------------------

type TrustLevel = "none" | "low" | "medium" | "high" | "owner";

const TRUST_ORDER: Record<TrustLevel, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
  owner: 4,
};

// ---- TrustManager ----------------------------------------------------------

interface TrustEntry {
  agentId: string;
  level: TrustLevel;
  setByOwnerId: string;
  setAt: number;
}

class TrustManager {
  private readonly entries: Map<string, TrustEntry> = new Map();

  setLevel(agentId: string, level: TrustLevel, ownerId: string): void {
    this.entries.set(agentId, {
      agentId,
      level,
      setByOwnerId: ownerId,
      setAt: Date.now(),
    });
  }

  checkLevel(agentId: string, required: TrustLevel): boolean {
    const entry = this.entries.get(agentId);
    if (entry === undefined) return false;
    return TRUST_ORDER[entry.level] >= TRUST_ORDER[required];
  }
}

// ---- BudgetManager ---------------------------------------------------------

interface StaticBudget {
  agentId: string;
  totalAllocation: number;
  spent: number;
  currency: string;
}

class BudgetManager {
  private readonly budgets: Map<string, StaticBudget> = new Map();

  allocate(agentId: string, amount: number, currency: string): void {
    this.budgets.set(agentId, {
      agentId,
      totalAllocation: amount,
      spent: 0,
      currency,
    });
  }

  checkBudget(agentId: string, requestedAmount: number): boolean {
    const budget = this.budgets.get(agentId);
    if (budget === undefined) return false;
    return budget.spent + requestedAmount <= budget.totalAllocation;
  }

  recordSpend(agentId: string, amount: number): void {
    const budget = this.budgets.get(agentId);
    if (budget !== undefined) {
      budget.spent += amount;
    }
  }
}

// ---- AuditLogger -----------------------------------------------------------

interface AuditRecord {
  sequenceNumber: number;
  agentId: string;
  action: string;
  decision: "allow" | "deny";
  timestamp: number;
  previousHash: string;
  hash: string;
}

class AuditLogger {
  private readonly records: AuditRecord[] = [];
  private previousHash = "0000000000000000000000000000000000000000000000000000000000000000";
  private sequenceNumber = 0;

  log(agentId: string, action: string, decision: "allow" | "deny"): void {
    const sequenceNumber = ++this.sequenceNumber;
    const timestamp = Date.now();
    const payload = `${sequenceNumber}|${agentId}|${action}|${decision}|${timestamp}|${this.previousHash}`;
    const hash = createHash("sha256").update(payload).digest("hex");

    const record: AuditRecord = {
      sequenceNumber,
      agentId,
      action,
      decision,
      timestamp,
      previousHash: this.previousHash,
      hash,
    };

    this.records.push(record);
    this.previousHash = hash;
  }

  recordCount(): number {
    return this.records.length;
  }
}

// ---- PolicyTable -----------------------------------------------------------

interface PolicyRule {
  action: string;
  requiredTrustLevel: TrustLevel;
  maxCostPerCall: number;
  requiresConsent: boolean;
}

class PolicyTable {
  private readonly rules: Map<string, PolicyRule> = new Map();

  addRule(rule: PolicyRule): void {
    this.rules.set(rule.action, rule);
  }

  lookup(action: string): PolicyRule | undefined {
    return this.rules.get(action);
  }
}

// ---- GovernanceEngine ------------------------------------------------------

interface EvaluationRequest {
  agentId: string;
  action: string;
  requestedCost: number;
  consentGranted: boolean;
}

type EvaluationDecision = "allow" | "deny";

interface EvaluationResult {
  decision: EvaluationDecision;
  reason: string;
}

class GovernanceEngine {
  constructor(
    private readonly trustManager: TrustManager,
    private readonly budgetManager: BudgetManager,
    private readonly auditLogger: AuditLogger,
    private readonly policyTable: PolicyTable,
  ) {}

  evaluate(request: EvaluationRequest): EvaluationResult {
    const rule = this.policyTable.lookup(request.action);

    if (rule === undefined) {
      const result: EvaluationResult = { decision: "deny", reason: "no_policy_for_action" };
      this.auditLogger.log(request.agentId, request.action, result.decision);
      return result;
    }

    if (!this.trustManager.checkLevel(request.agentId, rule.requiredTrustLevel)) {
      const result: EvaluationResult = { decision: "deny", reason: "insufficient_trust_level" };
      this.auditLogger.log(request.agentId, request.action, result.decision);
      return result;
    }

    if (!this.budgetManager.checkBudget(request.agentId, request.requestedCost)) {
      const result: EvaluationResult = { decision: "deny", reason: "budget_exceeded" };
      this.auditLogger.log(request.agentId, request.action, result.decision);
      return result;
    }

    if (rule.requiresConsent && !request.consentGranted) {
      const result: EvaluationResult = { decision: "deny", reason: "consent_required" };
      this.auditLogger.log(request.agentId, request.action, result.decision);
      return result;
    }

    const result: EvaluationResult = { decision: "allow", reason: "policy_satisfied" };
    this.auditLogger.log(request.agentId, request.action, result.decision);
    return result;
  }
}

// ---- StorageAdapter stubs --------------------------------------------------
// Real adapters would hit network I/O; these stubs simulate the computational
// overhead characteristics for comparison without requiring running services.

interface StorageAdapter {
  name: string;
  write(key: string, value: string): Promise<void>;
  read(key: string): Promise<string | undefined>;
}

class MemoryStorageAdapter implements StorageAdapter {
  readonly name = "Memory";
  private readonly store: Map<string, string> = new Map();

  async write(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async read(key: string): Promise<string | undefined> {
    return this.store.get(key);
  }
}

class SimulatedRedisAdapter implements StorageAdapter {
  readonly name = "Redis (simulated)";
  private readonly store: Map<string, string> = new Map();

  async write(key: string, value: string): Promise<void> {
    // Simulate ~0.1 ms network round-trip for a local Redis instance
    await simulateNetworkDelay(0.1);
    this.store.set(key, value);
  }

  async read(key: string): Promise<string | undefined> {
    await simulateNetworkDelay(0.1);
    return this.store.get(key);
  }
}

class SimulatedSqliteAdapter implements StorageAdapter {
  readonly name = "SQLite (simulated)";
  private readonly store: Map<string, string> = new Map();

  async write(key: string, value: string): Promise<void> {
    // Simulate synchronous file write overhead (~0.5 ms)
    await simulateNetworkDelay(0.5);
    this.store.set(key, value);
  }

  async read(key: string): Promise<string | undefined> {
    await simulateNetworkDelay(0.3);
    return this.store.get(key);
  }
}

class SimulatedPostgresAdapter implements StorageAdapter {
  readonly name = "Postgres (simulated)";
  private readonly store: Map<string, string> = new Map();

  async write(key: string, value: string): Promise<void> {
    // Simulate ~1 ms network round-trip for a co-located Postgres instance
    await simulateNetworkDelay(1.0);
    this.store.set(key, value);
  }

  async read(key: string): Promise<string | undefined> {
    await simulateNetworkDelay(1.0);
    return this.store.get(key);
  }
}

// ---------------------------------------------------------------------------
// Test fixture factory
// ---------------------------------------------------------------------------

function buildFixture(): {
  engine: GovernanceEngine;
  trustManager: TrustManager;
  budgetManager: BudgetManager;
  auditLogger: AuditLogger;
  request: EvaluationRequest;
} {
  const trustManager = new TrustManager();
  const budgetManager = new BudgetManager();
  const auditLogger = new AuditLogger();
  const policyTable = new PolicyTable();

  policyTable.addRule({
    action: "read_file",
    requiredTrustLevel: "low",
    maxCostPerCall: 0.001,
    requiresConsent: false,
  });
  policyTable.addRule({
    action: "send_email",
    requiredTrustLevel: "medium",
    maxCostPerCall: 0.01,
    requiresConsent: true,
  });
  policyTable.addRule({
    action: "write_database",
    requiredTrustLevel: "high",
    maxCostPerCall: 0.05,
    requiresConsent: true,
  });

  // Trust level set manually by an authorized owner — never computed
  trustManager.setLevel("agent-001", "medium", "owner-001");

  // Budget allocated statically by policy — never adaptive
  budgetManager.allocate("agent-001", 100.0, "USD");

  const engine = new GovernanceEngine(
    trustManager,
    budgetManager,
    auditLogger,
    policyTable,
  );

  const request: EvaluationRequest = {
    agentId: "agent-001",
    action: "send_email",
    requestedCost: 0.01,
    consentGranted: true,
  };

  return { engine, trustManager, budgetManager, auditLogger, request };
}

// ---------------------------------------------------------------------------
// Scale benchmark: GovernanceEngine.evaluate() at increasing iteration counts
// ---------------------------------------------------------------------------

async function benchmarkGovernanceEngineAtScale(): Promise<BenchmarkResult[]> {
  const scales = [100, 1_000, 10_000, 100_000];
  const results: BenchmarkResult[] = [];

  for (const scale of scales) {
    const { engine, request } = buildFixture();

    const result = await runBenchmark(
      `GovernanceEngine.evaluate() @ ${scale.toLocaleString()} iterations`,
      () => {
        engine.evaluate(request);
      },
      { iterations: scale, warmupIterations: Math.min(50, Math.floor(scale * 0.05)) },
    );

    results.push(result);
  }

  return results;
}

// ---------------------------------------------------------------------------
// Throughput benchmarks: individual primitives
// ---------------------------------------------------------------------------

async function benchmarkTrustManagerThroughput(): Promise<BenchmarkResult> {
  const trustManager = new TrustManager();
  trustManager.setLevel("agent-bench", "high", "owner-bench");

  return runBenchmark(
    "TrustManager.checkLevel() throughput",
    () => {
      trustManager.checkLevel("agent-bench", "medium");
    },
    { iterations: 100_000, warmupIterations: 1_000 },
  );
}

async function benchmarkBudgetManagerThroughput(): Promise<BenchmarkResult> {
  const budgetManager = new BudgetManager();
  budgetManager.allocate("agent-bench", 999_999, "USD");

  return runBenchmark(
    "BudgetManager.checkBudget() throughput",
    () => {
      budgetManager.checkBudget("agent-bench", 0.001);
    },
    { iterations: 100_000, warmupIterations: 1_000 },
  );
}

async function benchmarkAuditLoggerThroughput(): Promise<BenchmarkResult> {
  const auditLogger = new AuditLogger();

  return runBenchmark(
    "AuditLogger.log() with SHA-256 hash chain",
    () => {
      auditLogger.log("agent-bench", "read_file", "allow");
    },
    { iterations: 10_000, warmupIterations: 100 },
  );
}

// ---------------------------------------------------------------------------
// Memory footprint: heap growth per 10 K audit records
// ---------------------------------------------------------------------------

async function benchmarkAuditLoggerMemoryPer10K(): Promise<BenchmarkResult> {
  if (typeof global.gc === "function") {
    global.gc();
  }

  const baselineBytes = process.memoryUsage().heapUsed;
  const auditLogger = new AuditLogger();
  const recordCount = 10_000;

  const start = performance.now();
  for (let i = 0; i < recordCount; i++) {
    auditLogger.log(`agent-${i % 100}`, "read_file", i % 3 === 0 ? "deny" : "allow");
  }
  const totalMs = performance.now() - start;

  const afterBytes = process.memoryUsage().heapUsed;
  const heapGrowthMB = (afterBytes - baselineBytes) / (1024 * 1024);

  return {
    name: "AuditLogger heap growth per 10K records",
    iterations: recordCount,
    totalMs,
    avgMs: totalMs / recordCount,
    p50Ms: 0,
    p95Ms: 0,
    p99Ms: 0,
    opsPerSecond: recordCount / (totalMs / 1000),
    memoryUsageMB: heapGrowthMB,
  };
}

// ---------------------------------------------------------------------------
// StorageAdapter comparison
// ---------------------------------------------------------------------------

async function benchmarkStorageAdapters(): Promise<BenchmarkResult[]> {
  const adapters: StorageAdapter[] = [
    new MemoryStorageAdapter(),
    new SimulatedRedisAdapter(),
    new SimulatedSqliteAdapter(),
    new SimulatedPostgresAdapter(),
  ];

  const results: BenchmarkResult[] = [];

  for (const adapter of adapters) {
    const iterationsForAdapter = adapter.name === "Memory" ? 10_000 : 500;
    const warmup = Math.min(20, Math.floor(iterationsForAdapter * 0.05));
    let counter = 0;

    const result = await runBenchmark(
      `StorageAdapter write+read — ${adapter.name}`,
      async () => {
        const key = `rec-${counter++}`;
        await adapter.write(key, `{"agentId":"agent-bench","seq":${counter}}`);
        await adapter.read(key);
      },
      { iterations: iterationsForAdapter, warmupIterations: warmup },
    );

    results.push(result);
  }

  return results;
}

// ---------------------------------------------------------------------------
// Entrypoint
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("AumOS Governance Pipeline — Load & Latency Benchmarks");
  console.log("=".repeat(60));
  console.log();

  const allResults: BenchmarkResult[] = [];

  // 1. GovernanceEngine at scale
  console.log("1/6  GovernanceEngine.evaluate() at scale...");
  const scaleResults = await benchmarkGovernanceEngineAtScale();
  allResults.push(...scaleResults);

  // 2. TrustManager throughput
  console.log("2/6  TrustManager.checkLevel() throughput...");
  allResults.push(await benchmarkTrustManagerThroughput());

  // 3. BudgetManager throughput
  console.log("3/6  BudgetManager.checkBudget() throughput...");
  allResults.push(await benchmarkBudgetManagerThroughput());

  // 4. AuditLogger throughput
  console.log("4/6  AuditLogger.log() with SHA-256 hash chain...");
  allResults.push(await benchmarkAuditLoggerThroughput());

  // 5. Memory footprint
  console.log("5/6  AuditLogger memory footprint per 10K records...");
  allResults.push(await benchmarkAuditLoggerMemoryPer10K());

  // 6. StorageAdapter comparison
  console.log("6/6  StorageAdapter latency comparison...");
  const storageResults = await benchmarkStorageAdapters();
  allResults.push(...storageResults);

  // --- Output ---
  console.log();
  console.log(formatResults(allResults));
  console.log();

  writeResultsToFile(allResults, "benchmarks/results-governance-pipeline.md");
  console.log("Results written to benchmarks/results-governance-pipeline.md");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Simulate an async delay without setTimeout jitter for small values. */
function simulateNetworkDelay(targetMs: number): Promise<void> {
  return new Promise((resolve) => {
    const deadline = performance.now() + targetMs;
    // Busy-wait for sub-millisecond accuracy; real adapters would use actual I/O
    while (performance.now() < deadline) {
      // intentional busy wait
    }
    resolve();
  });
}

main().catch((error: unknown) => {
  console.error("Benchmark failed:", error);
  process.exit(1);
});
