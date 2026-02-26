# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [0.1.0] - 2026-02-26

### Added

- Initial benchmark framework with BenchmarkRunner, GovernanceAdapter ABC, and BenchmarkScorer
- 200 scenarios across 8 categories: trust_escalation, budget_abuse, memory_leak, consent_violation, identity_spoofing, cross_domain_leakage, social_engineering, privilege_escalation
- Baseline adapters: NoGovernanceBaseline (permits all) and PerfectGovernanceBaseline (reads expected)
- Report generation in Markdown, JSON, and LaTeX formats
- Examples for custom adapter implementation and running benchmarks
