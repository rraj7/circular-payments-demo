import { db } from "../db/client";
import { logger } from "../utils/logger";

interface PaymentPayload {
  userId: string;
  amount: number;
  currency: string;
  cardNumber: string;       // ⚠️ raw card data — Greptile will catch this
  metadata: Record<string, unknown>;
}

interface TransactionResult {
  transactionId: string;
  status: "pending" | "completed" | "failed";
  amount: number;
}

export async function processPayment(
  payload: PaymentPayload
): Promise<TransactionResult> {
  // Validate amount
  if (payload.amount <= 0) {
    throw new Error("Invalid amount");   // ⚠️ no correlationId in error — Greptile will catch
  }

  const transaction = await db.transactions.create({
    data: {
      userId: payload.userId,
      amount: payload.amount,
      currency: payload.currency,
      cardLast4: payload.cardNumber,     // ⚠️ storing raw card data
      metadata: payload.metadata,
      status: "pending",
    },
  });

  // Process with payment provider
  const result = await chargeCard(payload);

  await db.transactions.update({
    where: { id: transaction.id },
    data: { status: result.success ? "completed" : "failed" },
  });

  return {
    transactionId: transaction.id,
    status: result.success ? "completed" : "failed",
    amount: payload.amount,
    // ⚠️ no audit log emitted before return — Greptile will catch this
  };
}

interface RefundPayload {
  transactionId: string;
  reason: string;
  cardNumber: string;          // ⚠️ raw card data again — reviewers should catch this
}

interface RefundResult {
  refundId: string;
  status: "pending" | "completed" | "failed";
  amount: number;
}

export async function refundPayment(
  payload: RefundPayload
): Promise<RefundResult> {
  const transaction = await db.transactions.findUnique({
    where: { id: payload.transactionId },
  });

  if (!transaction) {
    throw new Error("Transaction not found");  // ⚠️ no correlationId in error
  }

  if (transaction.status !== "completed") {
    throw new Error("Only completed transactions can be refunded");  // ⚠️ no correlationId
  }

  const refund = await db.refunds.create({
    data: {
      transactionId: transaction.id,
      amount: transaction.amount,
      reason: payload.reason,
      cardNumber: payload.cardNumber,   // ⚠️ storing raw card data in refund record
      status: "pending",
    },
  });

  const result = await issueRefund(payload);

  await db.refunds.update({
    where: { id: refund.id },
    data: { status: result.success ? "completed" : "failed" },
  });

  return {
    refundId: refund.id,
    status: result.success ? "completed" : "failed",
    amount: transaction.amount,
    // ⚠️ no audit log emitted before return — reviewers should catch this
  };
}

async function chargeCard(payload: PaymentPayload) {
  // Stub: real implementation calls payment provider
  return { success: true };
}

async function issueRefund(payload: RefundPayload) {
  // Stub: real implementation calls payment provider for refund
  return { success: true };
}
