# AumOS Governance Benchmark Suite — Load Testing & Latency Benchmarks

This directory contains TypeScript load-testing and latency benchmarks for
AumOS governance primitives.  They are separate from the correctness
benchmark suite (in `src/`) which tests whether a governance system blocks
the right scenarios.  These benchmarks answer a different question: *how
fast is each primitive under load?*

## Prerequisites

- Node.js >= 20.0.0
- `npm install` (installs `tsx` and `typescript` dev dependencies)

## Running the benchmarks

### Run all benchmarks

```bash
npm run benchmark
```

This runs both suites in sequence:

1. `benchmarks/governance-pipeline.ts`
2. `benchmarks/trust-gate-pipeline.ts`

Results are printed as Markdown tables to stdout and also written to:

- `benchmarks/results-governance-pipeline.md`
- `benchmarks/results-trust-gate-pipeline.md`

### Run individual suites

```bash
# Governance pipeline only
npm run benchmark:governance

# Trust-gate pipeline only
npm run benchmark:trust-gate
```

### Type-check without running

```bash
npm run typecheck
```

---

## What each benchmark measures

### `governance-pipeline.ts` — Governance Pipeline

| Benchmark group | Description |
|---|---|
| GovernanceEngine.evaluate() at scale | Full policy evaluation (trust check + budget check + consent check + audit log) at 100, 1 K, 10 K, and 100 K iterations. Reports p50/p95/p99 latency and ops/sec. |
| TrustManager.checkLevel() throughput | Isolated Map lookup for a static trust-level comparison.  100 K iterations. |
| BudgetManager.checkBudget() throughput | Isolated arithmetic comparison against a static allocation.  100 K iterations. |
| AuditLogger.log() with SHA-256 hash chain | Append-only audit record with `crypto.createHash('sha256')`.  10 K iterations. |
| AuditLogger heap growth per 10 K records | Measures heap growth (MB) after writing 10 000 audit records.  The `memoryUsageMB` column shows heap delta, not total heap. |
| StorageAdapter write+read comparison | Compares write+read round-trip latency across four adapter types: in-process Memory, simulated Redis (~0.1 ms round-trip), simulated SQLite (~0.5 ms write), and simulated Postgres (~1 ms round-trip). |

### `trust-gate-pipeline.ts` — Trust-Gate 6-Step Pipeline

| Benchmark | Description |
|---|---|
| Full 6-step pipeline | All layers active: circuit breaker + rate limiter + tool policy + budget check + audit log. |
| Pipeline minus circuit breaker | Full pipeline with circuit breaker skipped.  Difference vs full = circuit breaker overhead. |
| Pipeline minus rate limiter | Full pipeline with rate limiter skipped.  Difference vs full = token-bucket check overhead. |
| Pipeline minus tool policy | Full pipeline with tool policy skipped.  Difference vs full = policy table lookup overhead. |
| Pipeline minus budget tracker | Full pipeline with budget check skipped.  Difference vs full = budget tracker overhead. |
| Pipeline minus audit logger | Full pipeline with audit logger skipped.  Difference vs full = SHA-256 hash chain overhead. |
| AuditLogger SHA-256 hash chain alone | The audit logger in isolation with no other pipeline steps. |
| CircuitBreaker.isOpen() alone | `isOpen()` method in isolation. |
| RateLimiter.checkAndConsume() alone | Token-bucket consume in isolation. |

---

## Result columns

| Column | Meaning |
|---|---|
| Benchmark | Name of the benchmark |
| Iterations | Number of measured invocations |
| Avg (ms) | Mean latency per iteration |
| p50 (ms) | 50th-percentile (median) latency |
| p95 (ms) | 95th-percentile latency |
| p99 (ms) | 99th-percentile latency |
| Ops/sec | Throughput — iterations per second |
| Heap (MB) | Heap usage at end of run (or heap delta for memory footprint tests) |

---

## Benchmark design constraints

These benchmarks follow the AumOS fire line:

- **Trust levels are MANUAL ONLY** — set by an authorized owner, never computed
  from behaviour signals.
- **Budget allocations are STATIC ONLY** — set at fixture construction time,
  never adapted during the run.
- **Audit logging is RECORDING ONLY** — the logger appends immutable records
  with a SHA-256 hash chain.  No anomaly detection, no pattern analysis.

The benchmarks use only Node.js built-in APIs:

- `performance.now()` for sub-millisecond timing
- `process.memoryUsage()` for heap snapshots
- `node:crypto` `createHash('sha256')` for hash chain computation
- `node:fs` `writeFileSync` for results output

No external benchmark libraries (Benchmark.js, tinybench, etc.) are used.

---

## Interpreting results

The per-layer overhead benchmarks let you identify which pipeline step
dominates latency in your deployment environment:

```
circuit_breaker_overhead_ms = full_pipeline_avg - without_circuit_breaker_avg
rate_limiter_overhead_ms    = full_pipeline_avg - without_rate_limiter_avg
tool_policy_overhead_ms     = full_pipeline_avg - without_tool_policy_avg
budget_check_overhead_ms    = full_pipeline_avg - without_budget_check_avg
audit_logger_overhead_ms    = full_pipeline_avg - without_audit_logger_avg
```

The SHA-256 hash chain (audit logger) is typically the most expensive
single step because it performs a full cryptographic hash per record.
The rate limiter token-bucket is typically the cheapest.

---

Copyright (c) 2026 MuVeraAI Corporation. Apache 2.0.
