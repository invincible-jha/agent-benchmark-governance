# Report Format

## BenchmarkResult Structure

```python
BenchmarkResult(
    run_id="uuid",
    adapter_name="MyGovernanceSystem",
    categories_run=[Category.TRUST_ESCALATION, ...],
    aggregate=AggregateScore(...),
    category_results={"trust_escalation": CategoryResult(...)},
    duration_seconds=12.5,
    errors=[],
)
```

## Report Outputs

### Markdown

```python
from governance_benchmark import BenchmarkReporter

reporter = BenchmarkReporter()
markdown = reporter.to_markdown(result)
```

Produces a table with per-category pass rates and overall summary.

### JSON

```python
json_str = reporter.to_json(result)
```

Full serialized BenchmarkResult for machine consumption.

### LaTeX

```python
latex = reporter.to_latex(result)
```

Publication-ready tables suitable for academic papers.

## Aggregate Scoring

- **overall_pass_rate** — total_passed / total_scenarios
- **by_difficulty** — pass/fail counts grouped by easy/medium/hard
- **by_severity** — pass/fail counts grouped by info/warning/critical
- Scores are purely descriptive with no weighting or bias toward any architecture
