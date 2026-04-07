# I Tested 4 AI Code Review Agents on a Payments Service. Here's the One Bug None of Them Caught.

> **Greptile vs CodeRabbit vs Qodo Merge vs GitHub Copilot** — a head-to-head comparison on real payment infrastructure code, with deliberately planted business logic flaws.

[![Medium Article](https://img.shields.io/badge/Read_the_full_article-Medium-black?logo=medium)](https://medium.com/@rishiraj)

---

## What This Repo Is

A minimal TypeScript payment processing service built specifically to **stress-test AI code review agents**. It contains deliberately planted business logic flaws — some obvious, some subtle — to measure what AI reviewers catch and what they miss.

This is the companion repository to the Medium article linked above.

## The Experiment

Four AI code review agents were configured on this repo with the **same set of business rules**, then tested against two pull requests:

| Agent | Configuration | Custom Config? |
|---|---|---|
| **Greptile** | Reads `circular/payments-api-conventions.md` automatically | No (auto-discovers) |
| **CodeRabbit** | `.coderabbit.yaml` with `path_instructions` | Yes |
| **Qodo Merge** | `.pr_agent.toml` with `extra_instructions` | Yes |
| **GitHub Copilot** | Requested as PR reviewer | No (zero config) |

## The Two Test PRs

### [PR #6 — The Control Test](../../pull/6)
A `refundPayment()` function with **4 obvious violations**: raw PAN storage, missing `correlationId`, no audit log, no idempotency guard.

**Result: All 4 agents caught all 4 flaws.** Score: 4/4 across the board.

### [PR #7 — The Trap](../../pull/7)
Three new modules (`feeCalculator.ts`, `settlementBatcher.ts`, `webhookNotifier.ts`) that look like clean, well-structured code but contain **3 hidden business logic flaws**:

| # | Flaw | File | What's Wrong |
|---|---|---|---|
| 1 | **Floating-point fee math** | `feeCalculator.ts` | `amount * 0.029` — IEEE-754 rounding errors accumulate across settlement batches |
| 2 | **Webhook fires before DB commit** | `transactionService.ts` | Merchant gets notified "completed" while DB still says "pending" |
| 3 | **Timezone-dependent settlement cutoff** | `settlementBatcher.ts` | `new Date()` uses server-local time — breaks in multi-region deployments |

**Results:**

| Flaw | Greptile | CodeRabbit | Qodo Merge | Copilot |
|:---|:---:|:---:|:---:|:---:|
| Floating-point fees | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| Webhook before DB | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| **Timezone cutoff** | :x: | :x: | :x: | :x: |

**All 4 agents missed the timezone flaw.** The one bug that would cause silent financial reconciliation failures in production — and no AI reviewer caught it.

## Business Rules

The agents were given these rules (from [`circular/payments-api-conventions.md`](circular/payments-api-conventions.md)):

```
rule: All payment mutations must emit a structured audit log before returning
rule: Never store or log raw card data (PAN, CVV, full card number)
rule: All thrown errors must include a correlationId field
rule: Error responses must include correlationId for tracing
applies_to: ["src/payments/**/*.ts", "src/lending/**/*.kt"]
```

## Repo Structure

```
src/payments/
  transactionService.ts    # Core payment + refund flow
  feeCalculator.ts         # Fee computation (PR #7)
  settlementBatcher.ts     # Daily merchant settlement (PR #7)
  webhookNotifier.ts       # Merchant webhook delivery (PR #7)

circular/
  payments-api-conventions.md   # Business rules for AI reviewers

.coderabbit.yaml               # CodeRabbit configuration
.pr_agent.toml                 # Qodo Merge configuration

article/
  medium-draft.md              # Full Medium article draft
```

## Key Takeaway

AI code review agents are **production-ready for pattern matching** — PCI violations, missing error context, non-atomic operations. They're **getting better at cross-file reasoning** — tracing data flow between webhook notifier and transaction service.

But they **cannot yet reason about deployment topology** — how `new Date()` behaves differently across AWS regions, and why that matters for financial settlement windows. That's still senior engineer territory.

> The senior engineer's role isn't going away. It's shifting — from "read every line" to "focus on the three things AI can't see."

---

## License

MIT

---

**Built by [@rraj7](https://github.com/rraj7)** with [Claude Code](https://claude.com/claude-code)
