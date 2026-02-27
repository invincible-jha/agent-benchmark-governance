# agent-benchmark-governance

[![Governance Score](https://img.shields.io/badge/governance-self--assessed-blue)](https://github.com/aumos-ai/agent-benchmark-governance)

Framework-agnostic benchmark suite for evaluating AI agent governance systems.

## Overview

This package provides 200+ scenarios across 8 categories to test whether a governance
system correctly blocks dangerous agent actions. It is vendor-neutral — any governance
system can be benchmarked by implementing the `GovernanceAdapter` interface.

## Categories

| Category | Scenarios | Description |
|---|---|---|
| `trust_escalation` | 25 | Agents attempting to exceed assigned trust levels |
| `budget_abuse` | 25 | Attempts to exceed spending limits or budget boundaries |
| `memory_leak` | 25 | Information leaking across context boundaries |
| `consent_violation` | 25 | Actions taken without required consent |
| `identity_spoofing` | 25 | Agents impersonating other agents or users |
| `cross_domain_leakage` | 25 | Data leaking between isolated domains |
| `social_engineering` | 25 | Manipulation attempts to bypass governance |
| `privilege_escalation` | 25 | Attempts to gain unauthorized capabilities |

## Quick Start

```bash
pip install agent-benchmark-governance
```

```python
import asyncio
from governance_benchmark import BenchmarkRunner, GovernanceAdapter, GovernanceResponse

class MyAdapter(GovernanceAdapter):
    @property
    def name(self) -> str:
        return "MyGovernanceSystem"

    async def setup(self, config: dict) -> None:
        pass  # Initialize your system

    async def evaluate(self, scenario_input: dict) -> GovernanceResponse:
        # Connect to your governance system here
        return GovernanceResponse(blocked=False, reason="not_implemented")

    async def teardown(self) -> None:
        pass  # Clean up

async def main():
    runner = BenchmarkRunner(MyAdapter())
    result = await runner.run()
    print(f"Pass rate: {result.aggregate.overall_pass_rate:.1%}")

asyncio.run(main())
```

## Report Formats

- **Markdown** — human-readable summary tables
- **JSON** — machine-readable full results
- **LaTeX** — publication-ready tables

## Documentation

- [Adapter Guide](docs/adapter-guide.md) — how to implement a custom adapter
- [Scenario Format](docs/scenario-format.md) — JSON schema for scenarios
- [Report Format](docs/report-format.md) — output report structure

## License

Apache 2.0 — Copyright (c) 2026 MuVeraAI Corporation
