# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 MuVeraAI Corporation

"""BenchmarkRunner — orchestrates scenario loading, execution, and scoring."""

from __future__ import annotations

import asyncio
import importlib.resources
import json
import time
import uuid
from pathlib import Path
from typing import Any

from .adapter import GovernanceAdapter
from .scorer import BenchmarkScorer
from .types import (
    BenchmarkResult,
    Category,
    CategoryResult,
    GovernanceResponse,
    Scenario,
    ScenarioScore,
)


_SCENARIO_DIR = Path(__file__).parent.parent.parent.parent / "scenarios"


class BenchmarkRunner:
    """Orchestrates the full benchmark lifecycle.

    Usage::

        adapter = MyGovernanceAdapter()
        runner = BenchmarkRunner(adapter)
        result = await runner.run()
        print(result.aggregate.overall_pass_rate)

    Args:
        adapter: A GovernanceAdapter implementation to test.
        scenario_dir: Optional path override for the scenarios directory.
            Defaults to the bundled ``scenarios/`` folder at the repo root.
        concurrency: Maximum number of scenarios to evaluate concurrently
            within a category.  Defaults to 1 (serial execution) for
            deterministic results with stateful adapters.
    """

    def __init__(
        self,
        adapter: GovernanceAdapter,
        scenario_dir: Path | None = None,
        concurrency: int = 1,
    ) -> None:
        self.adapter = adapter
        self.scenario_dir = scenario_dir or _SCENARIO_DIR
        self.concurrency = concurrency
        self._scorer = BenchmarkScorer()
        self._scenarios: dict[str, list[Scenario]] = {}
        self._load_all_scenarios()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def run(
        self,
        categories: list[str] | None = None,
    ) -> BenchmarkResult:
        """Run the benchmark across all (or specified) categories.

        Args:
            categories: Optional list of category names to run.  If None,
                all eight categories are run.

        Returns:
            BenchmarkResult with per-category and aggregate scores.
        """
        start = time.monotonic()
        run_id = str(uuid.uuid4())

        target_categories = categories or [c.value for c in Category]
        category_results: dict[str, CategoryResult] = {}
        errors: list[dict[str, Any]] = []

        for category in target_categories:
            if category not in self._scenarios:
                errors.append({"category": category, "error": "no_scenarios_found"})
                continue
            try:
                result = await self.run_category(category)
                category_results[category] = result
            except Exception as exc:
                errors.append({"category": category, "error": str(exc)})

        aggregate = self._scorer.aggregate(category_results)
        duration = time.monotonic() - start

        return BenchmarkResult(
            run_id=run_id,
            adapter_name=self.adapter.name,
            categories_run=[Category(c) for c in target_categories if c in category_results],
            aggregate=aggregate,
            category_results=category_results,
            duration_seconds=duration,
            errors=errors,
        )

    async def run_category(self, category: str) -> CategoryResult:
        """Run all scenarios in a single category.

        Args:
            category: Category name string, e.g. ``"trust_escalation"``.

        Returns:
            CategoryResult with per-scenario scores and breakdowns.
        """
        scenarios = self._scenarios.get(category, [])
        if not scenarios:
            return BenchmarkScorer.build_category_result(category, [])

        if self.concurrency == 1:
            scores = []
            for scenario in scenarios:
                score = await self._run_single(scenario)
                scores.append(score)
        else:
            semaphore = asyncio.Semaphore(self.concurrency)
            tasks = [self._run_single_limited(scenario, semaphore) for scenario in scenarios]
            scores = list(await asyncio.gather(*tasks))

        return BenchmarkScorer.build_category_result(category, scores)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    async def _run_single(self, scenario: Scenario) -> ScenarioScore:
        """Execute one scenario: setup -> evaluate -> teardown -> score."""
        await self.adapter.setup({})
        try:
            response: GovernanceResponse = await self.adapter.evaluate(scenario.input)
        except Exception as exc:
            # On adapter error, treat as a failed evaluation (not blocked, no reason).
            response = GovernanceResponse(
                blocked=False,
                reason="adapter_error",
                details=str(exc),
            )
        finally:
            await self.adapter.teardown()

        return self._scorer.score_scenario(scenario, response)

    async def _run_single_limited(
        self,
        scenario: Scenario,
        semaphore: asyncio.Semaphore,
    ) -> ScenarioScore:
        async with semaphore:
            return await self._run_single(scenario)

    def _load_all_scenarios(self) -> None:
        """Load all scenario JSON files from the scenarios directory."""
        if not self.scenario_dir.exists():
            return

        for category_dir in sorted(self.scenario_dir.iterdir()):
            if not category_dir.is_dir():
                continue
            category_name = category_dir.name
            scenario_list: list[Scenario] = []

            for json_file in sorted(category_dir.glob("*.json")):
                try:
                    raw = json_file.read_text(encoding="utf-8")
                    data = json.loads(raw)
                    scenario = Scenario.model_validate(data)
                    scenario_list.append(scenario)
                except Exception as exc:
                    # Log but don't crash — bad files are reported at run time.
                    import warnings
                    warnings.warn(
                        f"Failed to load scenario {json_file}: {exc}",
                        stacklevel=2,
                    )

            if scenario_list:
                self._scenarios[category_name] = scenario_list

    @property
    def loaded_scenario_counts(self) -> dict[str, int]:
        """Return a mapping of category -> number of loaded scenarios."""
        return {cat: len(scenarios) for cat, scenarios in self._scenarios.items()}
