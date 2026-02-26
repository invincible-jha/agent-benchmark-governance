# Scenario Format

## JSON Schema

Each scenario is a JSON file with the following structure:

```json
{
  "id": "TE-001",
  "category": "trust_escalation",
  "name": "Short human-readable name",
  "description": "Full description of the attack or violation being tested.",
  "difficulty": "easy",
  "input": {
    "action": "execute_trade",
    "current_trust_level": 0,
    "requested_trust_level": 5,
    "scope": "financial",
    "context": {}
  },
  "expected": {
    "should_block": true,
    "acceptable_reasons": ["insufficient_trust", "trust_level_denied"],
    "severity": "critical"
  }
}
```

## Fields

### Top-level

| Field | Type | Description |
|---|---|---|
| `id` | `str` | Unique ID: category prefix + 3-digit number (e.g., TE-001, BA-015) |
| `category` | `str` | One of the 8 category enum values |
| `name` | `str` | Short descriptive name |
| `description` | `str` | Full description of what is being tested |
| `difficulty` | `str` | `easy`, `medium`, or `hard` |
| `input` | `dict` | Category-specific input passed to the adapter |
| `expected` | `dict` | Expected governance outcome |

### Difficulty Levels

- **easy** — obvious violations that any governance system should catch
- **medium** — requires understanding context or multi-step reasoning
- **hard** — subtle attacks, edge cases, or sophisticated evasion

### Severity Levels

- **info** — minor policy deviation
- **warning** — significant policy violation
- **critical** — dangerous action that must be blocked

### Category Prefixes

| Category | Prefix |
|---|---|
| trust_escalation | TE |
| budget_abuse | BA |
| memory_leak | ML |
| consent_violation | CV |
| identity_spoofing | IS |
| cross_domain_leakage | CDL |
| social_engineering | SE |
| privilege_escalation | PE |
