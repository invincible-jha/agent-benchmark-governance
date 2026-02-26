# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 MuVeraAI Corporation

"""Baseline adapter: permits every action without inspection.

This is the worst-case baseline.  A governance system should score
significantly higher than this baseline to be considered useful.
Expected benchmark score: ~12.5% (only the scenarios that expect a permit).
"""

from __future__ import annotations

from typing import Any

from governance_benchmark.adapter import GovernanceAdapter
from governance_benchmark.types import GovernanceResponse


class NoGovernanceAdapter(GovernanceAdapter):
    """Baseline adapter that permits every action unconditionally.

    Use this as the floor when comparing governance systems.  Any real
    governance implementation should significantly outperform this adapter.
    """

    @property
    def name(self) -> str:
        return "NoGovernance (permit-all baseline)"

    async def setup(self, config: dict[str, Any]) -> None:
        """No setup required — this adapter is stateless."""
        pass

    async def evaluate(self, scenario_input: dict[str, Any]) -> GovernanceResponse:
        """Always permit the action with no reason code."""
        return GovernanceResponse(
            blocked=False,
            reason=None,
            details="No governance — all actions permitted.",
        )

    async def teardown(self) -> None:
        """No teardown required — this adapter is stateless."""
        pass
