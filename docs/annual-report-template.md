<!--
  SPDX-License-Identifier: CC-BY-SA-4.0
  Copyright (c) 2026 MuVeraAI Corporation

  State of AI Agent Governance — Annual Report Template
  License: Creative Commons Attribution-ShareAlike 4.0 International
  https://creativecommons.org/licenses/by-sa/4.0/
-->

# State of AI Agent Governance — [YEAR] Annual Report

**Published by:** AumOS Open Source / MuVeraAI Corporation
**Report period:** January [YEAR] – December [YEAR]
**Benchmark version:** [X.Y.Z]
**DOI:** [INSERT DOI WHEN PUBLISHED]
**License:** [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)

---

## Executive Summary

> **Instructions:** Write 3–5 sentences summarising the headline findings.
> Cover: overall improvement or regression year-over-year, which attack
> categories showed the most movement, and the key industry takeaway.

[EXECUTIVE SUMMARY PLACEHOLDER]

**Headline figures:**

| Metric | [YEAR-1] | [YEAR] | Change |
|---|---|---|---|
| Average total score across all submissions | — | — | — |
| Number of implementations benchmarked | — | — | — |
| Highest recorded total score | — | — | — |
| Lowest recorded total score | — | — | — |
| Categories where average score exceeded 80% | — | — | — |
| Categories where average score fell below 60% | — | — | — |

---

## 1. Benchmark Overview

### 1.1 Methodology

The AumOS Agent Governance Benchmark evaluates AI agent governance systems against
200+ scenarios across eight attack categories. Each scenario presents a structured
input to the implementation under test via a standardised `GovernanceAdapter` interface.
The governance system returns a `blocked` decision and an optional `reason` code.
Scoring is binary per scenario: the decision either matches the expected outcome or
it does not. No weighting is applied. All scenarios count equally.

**Score definition:** Pass rate = (scenarios where decision matched expected) /
(total scenarios in category), expressed as a percentage 0–100.

**Submission requirements:**
- Implementations must ship a public `GovernanceAdapter` wrapper.
- Results must be reproducible via the published CI workflow.
- Self-reported scores must include a link to a full JSON results artifact.

### 1.2 Scenario Categories

| Category | Scenarios | Description |
|---|---|---|
| `trust_escalation` | 25+ | Agents exceeding assigned trust levels |
| `budget_abuse` | 25+ | Attempts to breach static budget limits |
| `memory_leak` | 25+ | Information leaking across context boundaries |
| `consent_violation` | 25+ | Actions taken without required user consent |
| `identity_spoofing` | 25+ | Agents impersonating other agents or users |
| `cross_domain_leakage` | 25+ | Data escaping isolated domain boundaries |
| `social_engineering` | 25+ | Manipulation attempts to bypass governance |
| `privilege_escalation` | 25+ | Gaining capabilities beyond authorised scope |
| `red_team` | Varies | Adversarial and combined-attack scenarios |

---

## 2. Year-over-Year Results

### 2.1 Overall Score Distribution

> **Instructions:** Insert a histogram or box plot of total scores.
> X-axis: score range buckets (0–19, 20–39, …, 80–100).
> Y-axis: number of implementations.

[INSERT CHART: score distribution histogram]

### 2.2 Trend by Category

> **Instructions:** Insert a grouped bar chart or line chart showing
> average category score in [YEAR-1] vs [YEAR].

[INSERT CHART: year-over-year category averages]

| Category | [YEAR-1] Avg | [YEAR] Avg | Delta |
|---|---|---|---|
| trust_escalation | — | — | — |
| budget_abuse | — | — | — |
| memory_leak | — | — | — |
| consent_violation | — | — | — |
| identity_spoofing | — | — | — |
| cross_domain_leakage | — | — | — |
| social_engineering | — | — | — |
| privilege_escalation | — | — | — |
| **Overall** | **—** | **—** | **—** |

---

## 3. Per-Category Analysis

### 3.1 Trust Escalation

> **Instructions:** Describe what the category tests, which specific
> scenario patterns caused the most failures, and what patterns the
> highest-scoring implementations used to handle them well.

**Key findings:**

- [FINDING 1]
- [FINDING 2]

**Common failure mode:** [DESCRIBE]

**Top-scoring approach pattern:** [DESCRIBE WITHOUT REFERENCING PROPRIETARY IP]

---

### 3.2 Budget Abuse

**Key findings:**

- [FINDING 1]
- [FINDING 2]

**Common failure mode:** [DESCRIBE]

---

### 3.3 Memory Leak

**Key findings:**

- [FINDING 1]
- [FINDING 2]

**Common failure mode:** [DESCRIBE]

---

### 3.4 Consent Violation

**Key findings:**

- [FINDING 1]
- [FINDING 2]

**Common failure mode:** [DESCRIBE]

---

### 3.5 Identity Spoofing

**Key findings:**

- [FINDING 1]
- [FINDING 2]

**Common failure mode:** [DESCRIBE]

---

### 3.6 Cross-Domain Leakage

**Key findings:**

- [FINDING 1]
- [FINDING 2]

**Common failure mode:** [DESCRIBE]

---

### 3.7 Social Engineering

**Key findings:**

- [FINDING 1]
- [FINDING 2]

**Common failure mode:** [DESCRIBE]

---

### 3.8 Privilege Escalation

**Key findings:**

- [FINDING 1]
- [FINDING 2]

**Common failure mode:** [DESCRIBE]

---

### 3.9 Red Team Scenarios

> **Instructions:** Red team scenarios were introduced in [YEAR].
> Describe the new adversarial scenario types added this year and
> average pass rates.

**Pass rate across red team scenarios:** [X]%

| Scenario Type | Pass Rate |
|---|---|
| Prompt injection | — |
| Budget manipulation | — |
| Consent bypass | — |
| Identity forgery | — |
| Audit tampering | — |

---

## 4. Industry Trends

> **Instructions:** Describe 3–5 macro trends observed in governance
> system design this year. Examples: shift toward rule-based systems,
> adoption of cryptographic identity verification, etc.
> Do NOT reference any proprietary product features or internal
> architecture details.

### 4.1 [TREND TITLE]

[TREND DESCRIPTION PLACEHOLDER]

### 4.2 [TREND TITLE]

[TREND DESCRIPTION PLACEHOLDER]

### 4.3 [TREND TITLE]

[TREND DESCRIPTION PLACEHOLDER]

---

## 5. Full Leaderboard

> **Instructions:** Copy the full leaderboard table from
> `leaderboard/data.json` at the time of report publication.
> Include all submissions received by the cutoff date.

| Rank | Implementation | Vendor | Language | Total | TE | BA | ML | CV | IS | CDL | SE | PE |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | — | — | — | — | — | — | — | — | — | — | — | — |

**Leaderboard as of:** [DATE]
**Benchmark version:** [X.Y.Z]
**Full results:** [LINK TO ARTIFACTS]

---

## 6. Methodology Notes

### 6.1 Scoring Integrity

All scores published in this report were generated by running the
`governance_benchmark` package version [X.Y.Z] against each implementation's
published `GovernanceAdapter`. Scores are reproducible: the full scenario set,
runner code, and CI workflow are available at
[github.com/aumos-ai/agent-benchmark-governance](https://github.com/aumos-ai/agent-benchmark-governance).

### 6.2 Inclusion Criteria

An implementation is included in this report if:

1. A public `GovernanceAdapter` wrapper is available under an open-source license.
2. The full results JSON artifact is publicly accessible.
3. The submission was received before the annual cutoff date of [DATE].

### 6.3 Limitations

- Benchmark scenarios represent a defined set of attack patterns; they do not
  cover all possible governance failure modes.
- Pass rates measure correctness of block/permit decisions only. They do not
  measure implementation security, operational reliability, or other qualities.
- Scenario difficulty distribution is fixed across all implementations; no
  adaptive scenario selection is performed.

### 6.4 Changes from Previous Year

> **Instructions:** List any new categories, retired scenarios, scoring
> rule changes, or other methodological changes made since the last report.

- [CHANGE 1]
- [CHANGE 2]

---

## 7. Acknowledgements

> **Instructions:** Thank contributors, reviewers, and community members
> who submitted scenarios or implementations this year.

[ACKNOWLEDGEMENTS PLACEHOLDER]

---

## 8. License and Citation

This report is published under the
[Creative Commons Attribution-ShareAlike 4.0 International License](https://creativecommons.org/licenses/by-sa/4.0/).
You are free to share and adapt this material for any purpose, provided you
give appropriate credit and distribute derivatives under the same license.

**Suggested citation (APA):**

> MuVeraAI Corporation. ([YEAR]). *State of AI Agent Governance: [YEAR] Annual Report*
> (Benchmark v[X.Y.Z]). AumOS Open Source.
> https://github.com/aumos-ai/agent-benchmark-governance

**BibTeX:**

```bibtex
@techreport{aumos_governance_[YEAR],
  title     = {State of {AI} Agent Governance: [YEAR] Annual Report},
  author    = {{MuVeraAI Corporation}},
  year      = {[YEAR]},
  institution = {AumOS Open Source},
  url       = {https://github.com/aumos-ai/agent-benchmark-governance},
  note      = {Benchmark v[X.Y.Z]}
}
```
