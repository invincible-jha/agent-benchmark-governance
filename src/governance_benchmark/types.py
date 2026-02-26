# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 MuVeraAI Corporation

"""All shared Pydantic v2 types for the governance benchmark."""

from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class Difficulty(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class Severity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class Category(str, Enum):
    TRUST_ESCALATION = "trust_escalation"
    BUDGET_ABUSE = "budget_abuse"
    MEMORY_LEAK = "memory_leak"
    CONSENT_VIOLATION = "consent_violation"
    IDENTITY_SPOOFING = "identity_spoofing"
    CROSS_DOMAIN_LEAKAGE = "cross_domain_leakage"
    SOCIAL_ENGINEERING = "social_engineering"
    PRIVILEGE_ESCALATION = "privilege_escalation"


class ScenarioExpected(BaseModel):
    """Expected outcome for a scenario."""

    should_block: bool = Field(
        description="Whether the governance system should block this action."
    )
    acceptable_reasons: list[str] = Field(
        description="List of acceptable reason codes the governance system may return."
    )
    severity: Severity = Field(
        description="Severity level of the violation being tested."
    )


class Scenario(BaseModel):
    """A single benchmark scenario."""

    id: str = Field(description="Unique scenario identifier, e.g. TE-001.")
    category: Category = Field(description="Scenario category.")
    name: str = Field(description="Short human-readable scenario name.")
    description: str = Field(description="Full description of the attack or violation.")
    difficulty: Difficulty = Field(description="Scenario difficulty.")
    input: dict[str, Any] = Field(
        description="The raw input dict passed to the governance adapter."
    )
    expected: ScenarioExpected = Field(description="Expected governance outcome.")


class GovernanceResponse(BaseModel):
    """Response returned by a GovernanceAdapter after evaluating a scenario."""

    blocked: bool = Field(description="True if the governance system blocked the action.")
    reason: str | None = Field(
        default=None,
        description="Machine-readable reason code for the decision.",
    )
    details: str | None = Field(
        default=None,
        description="Optional human-readable explanation.",
    )
    metadata: dict[str, Any] = Field(
        default_factory=dict,
        description="Any additional metadata from the governance system.",
    )


class ScenarioScore(BaseModel):
    """Score for a single scenario evaluation."""

    scenario_id: str
    category: Category
    difficulty: Difficulty
    severity: Severity
    passed: bool = Field(description="True if the governance decision matched expected.")
    block_correct: bool = Field(
        description="True if the block/permit decision was correct."
    )
    reason_acceptable: bool = Field(
        description="True if the returned reason is in acceptable_reasons (or no reason expected)."
    )
    expected_blocked: bool
    actual_blocked: bool
    expected_reasons: list[str]
    actual_reason: str | None
    details: str | None = None


class CategoryResult(BaseModel):
    """Aggregate result for one scenario category."""

    category: Category
    total: int
    passed: int
    failed: int
    pass_rate: float
    scores: list[ScenarioScore]
    by_difficulty: dict[str, dict[str, int]] = Field(
        default_factory=dict,
        description="Breakdown of pass/fail by difficulty level.",
    )
    by_severity: dict[str, dict[str, int]] = Field(
        default_factory=dict,
        description="Breakdown of pass/fail by severity level.",
    )


class AggregateScore(BaseModel):
    """Overall benchmark aggregate score across all categories."""

    total_scenarios: int
    total_passed: int
    total_failed: int
    overall_pass_rate: float
    categories: dict[str, CategoryResult]
    by_difficulty: dict[str, dict[str, int]] = Field(default_factory=dict)
    by_severity: dict[str, dict[str, int]] = Field(default_factory=dict)


class BenchmarkResult(BaseModel):
    """Top-level result returned by BenchmarkRunner.run()."""

    run_id: str = Field(description="Unique identifier for this benchmark run.")
    adapter_name: str = Field(description="Name of the governance adapter used.")
    categories_run: list[Category]
    aggregate: AggregateScore
    category_results: dict[str, CategoryResult]
    duration_seconds: float = Field(description="Total wall-clock time for the run.")
    errors: list[dict[str, Any]] = Field(
        default_factory=list,
        description="Any errors encountered during scenario execution.",
    )
