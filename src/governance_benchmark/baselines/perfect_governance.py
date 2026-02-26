# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 MuVeraAI Corporation

"""Baseline adapter: perfect governance with oracle knowledge.

This adapter reads the scenario expected outcome directly from a shared
context set by the runner (via the scenario registry) and always returns
the correct answer.  It is used to verify that the scoring logic is correct
and to establish a 100% ceiling.

In practice, a real governance system cannot access the expected answer —
this is a test harness artifact only.
"""

from __future__ import annotations

from typing import Any

from governance_benchmark.adapter import GovernanceAdapter
from governance_benchmark.types import GovernanceResponse


class PerfectGovernanceAdapter(GovernanceAdapter):
    """Baseline adapter that always returns the correct governance decision.

    This adapter is fed the expected outcome via ``setup`` and echoes it
    back in ``evaluate``.  It is used to:

    1. Verify the scoring logic is correct (expected score: 100%).
    2. Establish a performance ceiling for comparisons.

    It is NOT a realistic governance system — it cheats by reading the answer.
    """

    def __init__(self) -> None:
        self._expected_blocked: bool = False
        self._expected_reason: str | None = None

    @property
    def name(self) -> str:
        return "PerfectGovernance (oracle baseline)"

    async def setup(self, config: dict[str, Any]) -> None:
        """Accept the expected outcome from the runner config.

        The BenchmarkRunner passes ``{}`` by default.  To use this adapter
        correctly in tests, pass ``{"should_block": True, "reason": "..."}``
        in the config dict.
        """
        self._expected_blocked = config.get("should_block", False)
        reasons = config.get("acceptable_reasons", [])
        self._expected_reason = reasons[0] if reasons else None

    async def evaluate(self, scenario_input: dict[str, Any]) -> GovernanceResponse:
        """Return the pre-loaded expected answer."""
        return GovernanceResponse(
            blocked=self._expected_blocked,
            reason=self._expected_reason,
            details="PerfectGovernance oracle — always correct.",
        )

    async def teardown(self) -> None:
        """Reset internal state after each scenario."""
        self._expected_blocked = False
        self._expected_reason = None
