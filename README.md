# circular-payments-demo — Circular payments service demo (Greptile)

This repository is a small, intentionally-not-production-ready demo used by the Greptile engineering team to showcase how automated analysis can find common payment-handling problems.

## What’s in here

The core logic lives in `src/payments/transactionService.ts`, where `processPayment(payload)`:

1. Validates the payment amount.
2. Creates a `pending` transaction record.
3. Charges the card via a stubbed `chargeCard(...)` call.
4. Updates the transaction status to `completed` or `failed`.

## Why this demo is useful

The code contains a few deliberate “gotchas” (called out with `// ⚠️ ...` comments in the source) that Greptile should flag, including:

- Handling/storing sensitive card data incorrectly (raw card data is assigned to a field intended for only the last 4 digits).
- Error paths missing useful correlation/audit context (e.g., the validation error does not include a `correlationId`).
- Missing audit-log emission before returning the result.

## Key entrypoint

- `src/payments/transactionService.ts` → `processPayment(payload)`

