## Review Objective

Review this code like a senior production engineer reviewing payment infrastructure.

Only report concrete, high-confidence issues supported by the code.
Do not report cosmetic style feedback or speculative architecture suggestions.

Prioritize:
- payment correctness
- idempotency and replay safety
- money and currency integrity
- failure handling and state consistency
- sensitive data handling
- observability and auditability

For each finding:
1. state the issue clearly
2. explain the exact production risk
3. cite the precise code causing it
4. suggest the safest fix

Avoid:
- style-only comments
- naming preferences
- broad refactor advice without concrete evidence