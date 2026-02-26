# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 MuVeraAI Corporation

"""Example: Run the full benchmark with the no-governance baseline."""

from __future__ import annotations

import asyncio

from governance_benchmark.baselines.no_governance import NoGovernanceAdapter
from governance_benchmark.reporter import ReportGenerator
from governance_benchmark.runner import BenchmarkRunner


async def main() -> None:
    # The no-governance baseline permits everything — it should fail most scenarios.
    adapter = NoGovernanceAdapter()
    runner = BenchmarkRunner(adapter)

    print(f"Loaded scenarios: {runner.loaded_scenario_counts}")
    print("Running benchmark...")

    result = await runner.run()

    print(f"\nAdapter: {result.adapter_name}")
    print(f"Duration: {result.duration_seconds:.2f}s")
    print(f"Overall pass rate: {result.aggregate.overall_pass_rate:.1%}")
    print()

    for category, cat_result in result.category_results.items():
        print(f"  {category}: {cat_result.passed}/{cat_result.total} ({cat_result.pass_rate:.1%})")

    # Generate a Markdown report
    reporter = ReportGenerator()
    report = reporter.to_markdown(result)
    print("\n--- Markdown Report ---\n")
    print(report)


if __name__ == "__main__":
    asyncio.run(main())
