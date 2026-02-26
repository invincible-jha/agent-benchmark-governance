# Fire Line — agent-benchmark-governance

## What This Package IS

- Framework-agnostic benchmark suite for evaluating governance systems
- Generic scenarios testing static governance decisions
- Pluggable adapter interface for any governance implementation
- Markdown, JSON, and LaTeX report generation

## What This Package IS NOT

- NOT an AumOS-specific scoring system
- NOT a real-world vulnerability database
- NOT an adaptive or learning benchmark

## Forbidden Identifiers

These must NEVER appear in source code:

```
progressLevel, promoteLevel, computeTrustScore, behavioralScore
adaptiveBudget, optimizeBudget, predictSpending
detectAnomaly, generateCounterfactual
PersonalWorldModel, MissionAlignment, SocialTrust
CognitiveLoop, AttentionFilter, GOVERNANCE_PIPELINE
```

## Scenario Rules

1. All scenarios test STATIC governance decisions only
2. No scenario should give AumOS a scoring advantage over other systems
3. No real vulnerability data or exploit techniques
4. Scenarios must be generic and vendor-neutral
5. No latency targets or performance benchmarks

## Scoring Rules

1. Binary pass/fail per scenario based on block decision + reason code
2. No weighted scoring that favours any specific governance architecture
3. Difficulty and severity are descriptive metadata, not scoring multipliers
