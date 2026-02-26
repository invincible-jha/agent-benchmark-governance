# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 MuVeraAI Corporation

"""governance_benchmark — 200+ scenarios measuring AI agent governance quality.

Quick start::

    from governance_benchmark import BenchmarkRunner, GovernanceAdapter, GovernanceResponse

    class MyAdapter(GovernanceAdapter):
        async def setup(self, config):
            pass
        async def evaluate(self, scenario_input):
            # Call your governance system here
            return GovernanceResponse(blocked=True, reason="policy_violation")
        async def teardown(self):
            pass

    import asyncio
    runner = BenchmarkRunner(MyAdapter())
    result = asyncio.run(runner.run())
    print(result.aggregate.overall_pass_rate)
"""

from .adapter import GovernanceAdapter
from .reporter import ReportGenerator
from .runner import BenchmarkRunner
from .scorer import BenchmarkScorer
from .types import (
    AggregateScore,
    BenchmarkResult,
    Category,
    CategoryResult,
    Difficulty,
    GovernanceResponse,
    Scenario,
    ScenarioExpected,
    ScenarioScore,
    Severity,
)

__version__ = "0.1.0"

__all__ = [
    "GovernanceAdapter",
    "BenchmarkRunner",
    "BenchmarkScorer",
    "ReportGenerator",
    "AggregateScore",
    "BenchmarkResult",
    "Category",
    "CategoryResult",
    "Difficulty",
    "GovernanceResponse",
    "Scenario",
    "ScenarioExpected",
    "ScenarioScore",
    "Severity",
]
