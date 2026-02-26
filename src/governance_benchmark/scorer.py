# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 MuVeraAI Corporation

"""BenchmarkScorer — translates raw adapter responses into objective scores."""

from __future__ import annotations

from .types import (
    AggregateScore,
    CategoryResult,
    GovernanceResponse,
    Scenario,
    ScenarioScore,
)


class BenchmarkScorer:
    """Scores individual scenarios and aggregates results across categories.

    Scoring is intentionally objective:

    * ``block_correct`` — the governance system's block/permit decision matched
      ``expected.should_block``.
    * ``reason_acceptable`` — the returned ``reason`` code is present in
      ``expected.acceptable_reasons``, OR the list is empty (meaning any reason
      is acceptable), OR ``expected.should_block`` is False and no reason
      checking is relevant.
    * ``passed`` — both ``block_correct`` AND ``reason_acceptable`` are True.

    No opinionated weighting is applied.  All scenarios count equally.
    """

    def score_scenario(
        self,
        scenario: Scenario,
        response: GovernanceResponse,
    ) -> ScenarioScore:
        """Score a single scenario given the governance adapter's response.

        Args:
            scenario: The original Scenario being evaluated.
            response: The GovernanceResponse returned by the adapter.

        Returns:
            ScenarioScore with pass/fail and diagnostic fields populated.
        """
        block_correct = response.blocked == scenario.expected.should_block

        acceptable_reasons = scenario.expected.acceptable_reasons
        if not acceptable_reasons:
            # No reason constraint — any response (or no reason) is acceptable.
            reason_acceptable = True
        elif response.reason is None:
            # A reason was expected but none was provided.
            reason_acceptable = not scenario.expected.should_block
        else:
            reason_acceptable = response.reason in acceptable_reasons

        passed = block_correct and reason_acceptable

        return ScenarioScore(
            scenario_id=scenario.id,
            category=scenario.category,
            difficulty=scenario.difficulty,
            severity=scenario.expected.severity,
            passed=passed,
            block_correct=block_correct,
            reason_acceptable=reason_acceptable,
            expected_blocked=scenario.expected.should_block,
            actual_blocked=response.blocked,
            expected_reasons=acceptable_reasons,
            actual_reason=response.reason,
            details=response.details,
        )

    def aggregate(self, results: dict[str, CategoryResult]) -> AggregateScore:
        """Aggregate per-category results into an overall benchmark score.

        Args:
            results: Mapping of category name to CategoryResult.

        Returns:
            AggregateScore with overall totals and cross-category breakdowns.
        """
        total_scenarios = sum(r.total for r in results.values())
        total_passed = sum(r.passed for r in results.values())
        total_failed = sum(r.failed for r in results.values())
        overall_pass_rate = total_passed / total_scenarios if total_scenarios else 0.0

        by_difficulty: dict[str, dict[str, int]] = {}
        by_severity: dict[str, dict[str, int]] = {}

        for category_result in results.values():
            for difficulty_key, counts in category_result.by_difficulty.items():
                bucket = by_difficulty.setdefault(difficulty_key, {"passed": 0, "failed": 0, "total": 0})
                bucket["passed"] += counts.get("passed", 0)
                bucket["failed"] += counts.get("failed", 0)
                bucket["total"] += counts.get("total", 0)

            for severity_key, counts in category_result.by_severity.items():
                bucket = by_severity.setdefault(severity_key, {"passed": 0, "failed": 0, "total": 0})
                bucket["passed"] += counts.get("passed", 0)
                bucket["failed"] += counts.get("failed", 0)
                bucket["total"] += counts.get("total", 0)

        return AggregateScore(
            total_scenarios=total_scenarios,
            total_passed=total_passed,
            total_failed=total_failed,
            overall_pass_rate=overall_pass_rate,
            categories=results,
            by_difficulty=by_difficulty,
            by_severity=by_severity,
        )

    @staticmethod
    def build_category_result(
        category: str,
        scores: list[ScenarioScore],
    ) -> CategoryResult:
        """Build a CategoryResult from a list of ScenarioScore objects.

        Args:
            category: Category name string.
            scores: All ScenarioScore objects for this category.

        Returns:
            CategoryResult with pass/fail totals and breakdowns.
        """
        from .types import Category

        total = len(scores)
        passed_count = sum(1 for s in scores if s.passed)
        failed_count = total - passed_count
        pass_rate = passed_count / total if total else 0.0

        by_difficulty: dict[str, dict[str, int]] = {}
        by_severity: dict[str, dict[str, int]] = {}

        for score in scores:
            diff_key = score.difficulty.value
            diff_bucket = by_difficulty.setdefault(diff_key, {"passed": 0, "failed": 0, "total": 0})
            diff_bucket["total"] += 1
            if score.passed:
                diff_bucket["passed"] += 1
            else:
                diff_bucket["failed"] += 1

            sev_key = score.severity.value
            sev_bucket = by_severity.setdefault(sev_key, {"passed": 0, "failed": 0, "total": 0})
            sev_bucket["total"] += 1
            if score.passed:
                sev_bucket["passed"] += 1
            else:
                sev_bucket["failed"] += 1

        return CategoryResult(
            category=Category(category),
            total=total,
            passed=passed_count,
            failed=failed_count,
            pass_rate=pass_rate,
            scores=scores,
            by_difficulty=by_difficulty,
            by_severity=by_severity,
        )
