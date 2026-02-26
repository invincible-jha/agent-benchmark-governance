# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 MuVeraAI Corporation

"""Abstract base class for governance adapters.

Implement GovernanceAdapter to connect any governance system to this benchmark.
See docs/adapter-guide.md for a step-by-step walkthrough.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from .types import GovernanceResponse


class GovernanceAdapter(ABC):
    """Interface for connecting any governance system to the benchmark.

    Implementors must provide three lifecycle methods:

    1. ``setup``   — called once per scenario before ``evaluate``.
    2. ``evaluate``— called with the scenario input dict; returns a GovernanceResponse.
    3. ``teardown``— called once per scenario after ``evaluate``, even on error.

    The adapter is responsible for translating the generic scenario input into
    whatever representation the target governance system expects, invoking that
    system, and translating the result back into a GovernanceResponse.

    Example usage::

        class MyAdapter(GovernanceAdapter):
            @property
            def name(self) -> str:
                return "MyGovernanceSystem v1.0"

            async def setup(self, config: dict) -> None:
                self.client = MyGovernanceClient(**config)

            async def evaluate(self, scenario_input: dict) -> GovernanceResponse:
                result = await self.client.check(scenario_input)
                return GovernanceResponse(
                    blocked=result.is_denied,
                    reason=result.code,
                    details=result.message,
                )

            async def teardown(self) -> None:
                await self.client.reset()
    """

    @property
    def name(self) -> str:
        """Human-readable name of this adapter / governance system.

        Override to return a descriptive string that will appear in reports.
        """
        return self.__class__.__name__

    @abstractmethod
    async def evaluate(self, scenario_input: dict[str, Any]) -> GovernanceResponse:
        """Evaluate a scenario input and return the governance decision.

        Args:
            scenario_input: The ``input`` field from a Scenario, passed verbatim.
                Contains keys such as ``action``, ``scope``, ``context``, etc.
                The exact keys depend on the scenario category.

        Returns:
            GovernanceResponse indicating whether the action was blocked and why.
        """
        ...

    @abstractmethod
    async def setup(self, config: dict[str, Any]) -> None:
        """Prepare the governance system for a single scenario.

        Called before every ``evaluate`` call.  Use this to reset state, load
        per-scenario configuration, or initialise ephemeral resources.

        Args:
            config: Arbitrary configuration dictionary.  Currently always ``{}``
                unless the runner is extended to pass per-scenario config.
        """
        ...

    @abstractmethod
    async def teardown(self) -> None:
        """Clean up after a scenario has been evaluated.

        Called after every ``evaluate`` call (and after any error).  Use this
        to release resources, reset stateful components, or flush logs.
        """
        ...
