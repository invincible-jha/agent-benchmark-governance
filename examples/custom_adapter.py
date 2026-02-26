# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 MuVeraAI Corporation

"""Example: Implement a custom GovernanceAdapter.

This example shows how to connect any governance system to the benchmark.
The adapter below demonstrates a simple rule-based governance system that
checks trust levels and budget limits.
"""

from __future__ import annotations

import asyncio
from typing import Any

from governance_benchmark.adapter import GovernanceAdapter
from governance_benchmark.runner import BenchmarkRunner
from governance_benchmark.types import GovernanceResponse


class SimpleRuleAdapter(GovernanceAdapter):
    """A minimal rule-based governance adapter for demonstration."""

    @property
    def name(self) -> str:
        return "SimpleRuleEngine v0.1"

    async def setup(self, config: dict[str, Any]) -> None:
        # Reset any per-scenario state
        self._max_trust_level = 2
        self._budget_limit = 100.0

    async def evaluate(self, scenario_input: dict[str, Any]) -> GovernanceResponse:
        action = scenario_input.get("action", "")
        scope = scenario_input.get("scope", "")

        # Trust level checks
        requested_level = scenario_input.get("requested_trust_level")
        if requested_level is not None and requested_level > self._max_trust_level:
            return GovernanceResponse(
                blocked=True,
                reason="trust_level_denied",
                details=f"Requested level {requested_level} exceeds max {self._max_trust_level}",
            )

        # Budget checks
        amount = scenario_input.get("amount")
        if amount is not None and amount > self._budget_limit:
            return GovernanceResponse(
                blocked=True,
                reason="budget_exceeded",
                details=f"Amount {amount} exceeds limit {self._budget_limit}",
            )

        # Default: permit
        return GovernanceResponse(blocked=False, reason="permitted")

    async def teardown(self) -> None:
        pass


async def main() -> None:
    adapter = SimpleRuleAdapter()
    runner = BenchmarkRunner(adapter)

    result = await runner.run(categories=["trust_escalation", "budget_abuse"])

    print(f"Adapter: {result.adapter_name}")
    print(f"Pass rate: {result.aggregate.overall_pass_rate:.1%}")

    for category, cat_result in result.category_results.items():
        print(f"  {category}: {cat_result.passed}/{cat_result.total}")


if __name__ == "__main__":
    asyncio.run(main())
