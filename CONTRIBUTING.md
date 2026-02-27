<!-- SPDX-License-Identifier: CC-BY-SA-4.0 -->
<!-- Copyright (c) 2026 MuVeraAI Corporation -->

# Contributing to agent-benchmark-governance

Thank you for your interest in contributing to AumOS. This document explains
how to set up the project, run tests, and submit pull requests.

---

## Before You Start

Read [FIRE_LINE.md](FIRE_LINE.md) before writing anything. Contributions that
cross the fire line will be closed without merge.

The short version — these identifiers MUST NEVER appear anywhere in source code
or documentation:

See the full list of forbidden identifiers in the
[AumOS Fire Line documentation](https://github.com/aumos-ai/aumos-core/blob/main/FIRE_LINE.md).
These include identifiers related to adaptive trust, behavioral scoring,
autonomous budget optimization, and anomaly detection.

---

## Types of Contributions

### 1. New Benchmark Scenarios

This is the most common contribution. Scenarios live in `scenarios/` organized
by category (`trust_escalation`, `budget_abuse`, `memory_leak`, etc.).

**To add a scenario:**

1. Open an issue describing the governance gap the scenario tests.
2. Implement the scenario following the `GovernanceScenario` schema.
3. Add the scenario to the appropriate category directory.
4. Write a test that runs the scenario against the reference adapter.
5. Update the scenario count in `README.md`.

### 2. New Benchmark Categories

New attack or failure categories require discussion before implementation.
Open an issue labeled `category-proposal` and describe:
- What class of governance failure the category tests
- Minimum number of scenarios (25 is the standard bar)
- Why existing categories do not cover the failure mode

### 3. Bug Reports

If you find a scenario with incorrect expected outcomes or a runner that does
not correctly evaluate results, open an issue with:
- The scenario ID (e.g., `trust_escalation_007`)
- The actual runner output
- The expected outcome and why

### 4. New Language Runners

Reference runners in additional languages are welcome. Open an issue first.
Requirements: implements `GovernanceAdapter`, passes all existing scenarios,
carries a test suite with >80% coverage.

---

## Development Setup

**Requirements:** Python >= 3.10, pip

```bash
git clone https://github.com/aumos-ai/agent-benchmark-governance.git
cd agent-benchmark-governance

# Create a virtual environment
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Install with dev dependencies
pip install -e ".[dev]"
```

---

## Build and Test Commands

```bash
# Run the full test suite
pytest

# Run with coverage
pytest --cov=governance_benchmark --cov-report=term-missing

# Type check
mypy src/

# Lint
ruff check src/ tests/

# Run the fire-line audit
bash scripts/fire-line-audit.sh
```

All four must pass before submitting a pull request.

---

## Pull Request Workflow

1. Fork the repository and create a branch from `main`:
   ```bash
   git checkout -b feat/add-privilege-escalation-scenarios
   ```

2. Make your changes. One logical change per commit.

3. Verify locally:
   ```bash
   ruff check src/ tests/
   mypy src/
   pytest --cov
   bash scripts/fire-line-audit.sh
   ```

4. Open a pull request. The PR description must explain WHY the change is
   needed, not just what changed.

### Pull Request Checklist

- [ ] All tests pass (`pytest`)
- [ ] Type checks pass (`mypy src/`)
- [ ] Linting passes (`ruff check src/ tests/`)
- [ ] Coverage did not drop below 80%
- [ ] Every new source file has the SPDX license header
- [ ] Commit messages follow Conventional Commits
- [ ] Fire-line audit passes (`bash scripts/fire-line-audit.sh`)
- [ ] The PR description explains WHY, not just WHAT

---

## Commit Convention

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(benchmark): add 5 privilege escalation scenarios for capability expansion
fix(runner): handle adapter timeout without marking scenario as passed
docs(contributing): clarify scenario schema requirements
test(trust-escalation): add boundary test for level 4 → 5 transitions
chore(ci): pin pytest to 8.x to avoid breaking change
```

Commit messages explain WHY the change matters, not just what files changed.

---

## License Headers

Every new source file must begin with the appropriate license header.

**Python files:**
```python
# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 MuVeraAI Corporation
```

**Markdown files:**
```markdown
<!-- SPDX-License-Identifier: CC-BY-SA-4.0 -->
<!-- Copyright (c) 2026 MuVeraAI Corporation -->
```

---

## CLA

By submitting a contribution, you agree that your contribution is licensed under
the project's Apache 2.0 license and that you have the right to grant this license.
MuVeraAI Corporation does not require a separate CLA for this project.

---

## Code Style

- Python 3.10+ with `from __future__ import annotations`
- Type hints on all function signatures — `mypy --strict` must pass
- Descriptive variable names — no single-letter abbreviations
- Functional style preferred over class-based OOP where practical
- Tests in `tests/` using `pytest`

---

Copyright (c) 2026 MuVeraAI Corporation. Apache 2.0.
