// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 MuVeraAI Corporation

/**
 * Reusable benchmark harness for AumOS governance pipeline measurements.
 *
 * Uses only Node.js built-ins: performance.now() and process.memoryUsage().
 * No external benchmark dependencies required.
 */

import { writeFileSync } from "node:fs";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface BenchmarkResult {
  name: string;
  iterations: number;
  totalMs: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  opsPerSecond: number;
  memoryUsageMB: number;
}

export interface RunBenchmarkOptions {
  /** Number of measured iterations. Defaults to 1000. */
  iterations?: number;
  /** Number of warmup iterations before measurement begins. Defaults to 50. */
  warmupIterations?: number;
}

// ---------------------------------------------------------------------------
// Core harness
// ---------------------------------------------------------------------------

/**
 * Run a benchmark and return a BenchmarkResult.
 *
 * The harness performs warmup iterations first (to JIT-stabilise the function),
 * then collects per-iteration timings using performance.now().
 * Memory usage is sampled once at the end of the measured run.
 */
export async function runBenchmark(
  name: string,
  fn: () => void | Promise<void>,
  options?: RunBenchmarkOptions,
): Promise<BenchmarkResult> {
  const iterations = options?.iterations ?? 1000;
  const warmupIterations = options?.warmupIterations ?? 50;

  // --- Warmup phase ---
  for (let i = 0; i < warmupIterations; i++) {
    await fn();
  }

  // --- Force a GC pass before measurement if available ---
  if (typeof global.gc === "function") {
    global.gc();
  }

  // --- Measurement phase ---
  const latencySamples: number[] = new Array(iterations) as number[];
  const startTotal = performance.now();

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    latencySamples[i] = performance.now() - start;
  }

  const totalMs = performance.now() - startTotal;

  // --- Memory snapshot ---
  const memoryBytes = process.memoryUsage().heapUsed;
  const memoryUsageMB = memoryBytes / (1024 * 1024);

  // --- Percentile computation ---
  latencySamples.sort((a, b) => a - b);

  const p50Ms = percentile(latencySamples, 50);
  const p95Ms = percentile(latencySamples, 95);
  const p99Ms = percentile(latencySamples, 99);
  const avgMs = totalMs / iterations;
  const opsPerSecond = iterations / (totalMs / 1000);

  return {
    name,
    iterations,
    totalMs,
    avgMs,
    p50Ms,
    p95Ms,
    p99Ms,
    opsPerSecond,
    memoryUsageMB,
  };
}

// ---------------------------------------------------------------------------
// Reporting utilities
// ---------------------------------------------------------------------------

/**
 * Format an array of BenchmarkResults as a Markdown table.
 *
 * Columns: Name | Iterations | Avg (ms) | p50 (ms) | p95 (ms) | p99 (ms) | Ops/sec | Heap (MB)
 */
export function formatResults(results: BenchmarkResult[]): string {
  const header = [
    "| Benchmark | Iterations | Avg (ms) | p50 (ms) | p95 (ms) | p99 (ms) | Ops/sec | Heap (MB) |",
    "|-----------|------------|----------|----------|----------|----------|---------|-----------|",
  ];

  const rows = results.map((r) => {
    const avg = r.avgMs.toFixed(4);
    const p50 = r.p50Ms.toFixed(4);
    const p95 = r.p95Ms.toFixed(4);
    const p99 = r.p99Ms.toFixed(4);
    const ops = Math.round(r.opsPerSecond).toLocaleString();
    const mem = r.memoryUsageMB.toFixed(2);
    return `| ${r.name} | ${r.iterations} | ${avg} | ${p50} | ${p95} | ${p99} | ${ops} | ${mem} |`;
  });

  return [...header, ...rows].join("\n");
}

/**
 * Write formatted benchmark results as a Markdown table to a file.
 *
 * @param results - Array of BenchmarkResult objects to write.
 * @param filePath - Absolute or relative path to the output file.
 */
export function writeResultsToFile(
  results: BenchmarkResult[],
  filePath: string,
): void {
  const timestamp = new Date().toISOString();
  const content = [
    "# AumOS Governance Benchmark Results",
    "",
    `Generated: ${timestamp}`,
    "",
    formatResults(results),
    "",
  ].join("\n");

  writeFileSync(filePath, content, "utf8");
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Compute a percentile value from a sorted array of numbers.
 *
 * Uses the nearest-rank method.  Array MUST be sorted ascending before calling.
 */
function percentile(sortedSamples: number[], pct: number): number {
  if (sortedSamples.length === 0) return 0;
  const index = Math.ceil((pct / 100) * sortedSamples.length) - 1;
  const clampedIndex = Math.max(0, Math.min(index, sortedSamples.length - 1));
  return sortedSamples[clampedIndex] ?? 0;
}
