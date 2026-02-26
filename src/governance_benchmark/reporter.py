# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 MuVeraAI Corporation

"""ReportGenerator — formats BenchmarkResult into human and machine-readable output."""

from __future__ import annotations

import json
from typing import Any

from .types import BenchmarkResult, CategoryResult


class ReportGenerator:
    """Generates reports in Markdown, JSON, and single-line summary formats.

    All methods are pure functions that accept a BenchmarkResult and return
    a formatted string — no side effects, no file I/O.

    Usage::

        reporter = ReportGenerator()
        print(reporter.format_summary(result))
        Path("report.md").write_text(reporter.format_markdown(result))
        Path("report.json").write_text(reporter.format_json(result))
    """

    def format_summary(self, result: BenchmarkResult) -> str:
        """Return a single-line summary of the benchmark result.

        Example output::

            [MyAdapter] 182/200 passed (91.0%) across 8 categories in 4.32s

        Args:
            result: The BenchmarkResult from BenchmarkRunner.run().

        Returns:
            A concise one-line string suitable for CI log output.
        """
        agg = result.aggregate
        pct = agg.overall_pass_rate * 100
        return (
            f"[{result.adapter_name}] "
            f"{agg.total_passed}/{agg.total_scenarios} passed ({pct:.1f}%) "
            f"across {len(result.categories_run)} categories "
            f"in {result.duration_seconds:.2f}s"
        )

    def format_markdown(self, result: BenchmarkResult) -> str:
        """Return a Markdown report with a per-category table and breakdowns.

        Args:
            result: The BenchmarkResult from BenchmarkRunner.run().

        Returns:
            A Markdown string suitable for writing to a .md file or GitHub comment.
        """
        agg = result.aggregate
        lines: list[str] = []

        lines.append("# Governance Benchmark Report")
        lines.append("")
        lines.append(f"**Adapter:** {result.adapter_name}  ")
        lines.append(f"**Run ID:** `{result.run_id}`  ")
        lines.append(f"**Duration:** {result.duration_seconds:.2f}s  ")
        lines.append("")

        # Overall summary box
        pct = agg.overall_pass_rate * 100
        lines.append("## Overall Score")
        lines.append("")
        lines.append(f"| Metric | Value |")
        lines.append(f"|--------|-------|")
        lines.append(f"| Total scenarios | {agg.total_scenarios} |")
        lines.append(f"| Passed | {agg.total_passed} |")
        lines.append(f"| Failed | {agg.total_failed} |")
        lines.append(f"| Pass rate | **{pct:.1f}%** |")
        lines.append("")

        # Per-category table
        lines.append("## Results by Category")
        lines.append("")
        lines.append("| Category | Total | Passed | Failed | Pass Rate |")
        lines.append("|----------|-------|--------|--------|-----------|")

        for cat_name, cat_result in sorted(result.category_results.items()):
            rate = cat_result.pass_rate * 100
            lines.append(
                f"| {cat_name} | {cat_result.total} | {cat_result.passed} "
                f"| {cat_result.failed} | {rate:.1f}% |"
            )
        lines.append("")

        # By difficulty
        lines.append("## Results by Difficulty")
        lines.append("")
        lines.append("| Difficulty | Total | Passed | Failed | Pass Rate |")
        lines.append("|------------|-------|--------|--------|-----------|")
        for diff_key in ["easy", "medium", "hard"]:
            counts = agg.by_difficulty.get(diff_key, {})
            if not counts:
                continue
            total = counts.get("total", 0)
            passed = counts.get("passed", 0)
            failed = counts.get("failed", 0)
            rate = (passed / total * 100) if total else 0.0
            lines.append(f"| {diff_key} | {total} | {passed} | {failed} | {rate:.1f}% |")
        lines.append("")

        # By severity
        lines.append("## Results by Severity")
        lines.append("")
        lines.append("| Severity | Total | Passed | Failed | Pass Rate |")
        lines.append("|----------|-------|--------|--------|-----------|")
        for sev_key in ["info", "warning", "critical"]:
            counts = agg.by_severity.get(sev_key, {})
            if not counts:
                continue
            total = counts.get("total", 0)
            passed = counts.get("passed", 0)
            failed = counts.get("failed", 0)
            rate = (passed / total * 100) if total else 0.0
            lines.append(f"| {sev_key} | {total} | {passed} | {failed} | {rate:.1f}% |")
        lines.append("")

        # Failed scenario details
        failed_scores = [
            score
            for cat_result in result.category_results.values()
            for score in cat_result.scores
            if not score.passed
        ]

        if failed_scores:
            lines.append("## Failed Scenarios")
            lines.append("")
            lines.append(
                "| ID | Category | Difficulty | Severity | Expected Block | Actual Block | Reason |"
            )
            lines.append(
                "|----|----------|------------|----------|----------------|--------------|--------|"
            )
            for score in sorted(failed_scores, key=lambda s: s.scenario_id):
                lines.append(
                    f"| {score.scenario_id} | {score.category.value} "
                    f"| {score.difficulty.value} | {score.severity.value} "
                    f"| {score.expected_blocked} | {score.actual_blocked} "
                    f"| {score.actual_reason or '-'} |"
                )
            lines.append("")

        # Errors
        if result.errors:
            lines.append("## Errors")
            lines.append("")
            for error in result.errors:
                lines.append(f"- **{error.get('category', 'unknown')}**: {error.get('error', '')}")
            lines.append("")

        return "\n".join(lines)

    def format_json(self, result: BenchmarkResult) -> str:
        """Return machine-readable JSON of the full BenchmarkResult.

        The output is a pretty-printed JSON string using Pydantic's serialization
        so all enum values are rendered as their string values.

        Args:
            result: The BenchmarkResult from BenchmarkRunner.run().

        Returns:
            A JSON string with 2-space indentation.
        """
        return result.model_dump_json(indent=2)
