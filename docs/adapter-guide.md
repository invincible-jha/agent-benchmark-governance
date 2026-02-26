# Adapter Guide

## Overview

To benchmark your governance system, implement the `GovernanceAdapter` abstract base class.

## Interface

```python
from governance_benchmark import GovernanceAdapter, GovernanceResponse

class MyAdapter(GovernanceAdapter):
    @property
    def name(self) -> str:
        return "My Governance System v1.0"

    async def setup(self, config: dict) -> None:
        # Called before each scenario. Initialize or reset state.
        self.engine = MyEngine()

    async def evaluate(self, scenario_input: dict) -> GovernanceResponse:
        # scenario_input contains: action, scope, context, and category-specific fields
        result = await self.engine.check(scenario_input)
        return GovernanceResponse(
            blocked=result.is_denied,
            reason=result.code,
            details=result.message,
        )

    async def teardown(self) -> None:
        # Called after each scenario. Clean up resources.
        await self.engine.close()
```

## Scenario Input Fields

Every scenario input contains at minimum:

| Field | Type | Description |
|---|---|---|
| `action` | `str` | The action being attempted |
| `scope` | `str` | The domain/scope of the action |
| `context` | `dict` | Additional context for the scenario |

Category-specific fields vary. See [Scenario Format](scenario-format.md).

## GovernanceResponse

| Field | Type | Required | Description |
|---|---|---|---|
| `blocked` | `bool` | Yes | Whether the action was blocked |
| `reason` | `str \| None` | No | Machine-readable reason code |
| `details` | `str \| None` | No | Human-readable explanation |
| `metadata` | `dict` | No | Any additional data |

## Running

```python
runner = BenchmarkRunner(MyAdapter())
result = await runner.run()

# Run specific categories only
result = await runner.run(categories=["trust_escalation", "budget_abuse"])
```
