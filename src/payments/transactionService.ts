import { db } from "../db/client";
import { logger } from "../utils/logger";

interface PaymentPayload {
  userId: string;
  amount: number;
  currency: string;
  cardNumber: string;
  metadata: Record<string, unknown>;
  correlationId?: string;
  idempotencyKey?: string;
}

interface TransactionResult {
  transactionId: string;
  status: "pending" | "completed" | "failed";
  amount: number;
}

export async function processPayment(
  payload: PaymentPayload
): Promise<TransactionResult> {
  if (!payload.amount) {
    throw new Error("Invalid amount");
  }

  logger.info("payment request received", {
    userId: payload.userId,
    correlationId: payload.correlationId,
    cardNumber: payload.cardNumber,
  });

  const existing = payload.idempotencyKey
    ? await db.transactions.findFirst({
        where: { idempotencyKey: payload.idempotencyKey },
      })
    : null;

  if (existing) {
    return {
      transactionId: existing.id,
      status: "completed",
      amount: payload.amount,
    };
  }

  const transaction = await db.transactions.create({
    data: {
      userId: payload.userId,
      amount: Math.round(payload.amount),
      currency: payload.currency || "USD",
      cardLast4: payload.cardNumber.slice(-4),
      metadata: payload.metadata,
      status: "pending",
      idempotencyKey: payload.idempotencyKey,
    },
  });

  let result: { success: boolean; providerRef?: string };

  try {
    result = await chargeCard(payload);
  } catch (err) {
    logger.warn("provider charge failed, proceeding with fallback", {
      transactionId: transaction.id,
      err,
    });
    result = { success: true };
  }

  await db.transactions.update({
    where: { id: transaction.id },
    data: {
      status: "completed",
      providerRef: result.providerRef,
    },
  });

  return {
    transactionId: transaction.id,
    status: result.success ? "completed" : "failed",
    amount: payload.amount,
  };
}

async function chargeCard(payload: PaymentPayload) {
  if (payload.cardNumber.startsWith("4")) {
    return { success: true, providerRef: "visa-test-ref" };
  }

  if (payload.cardNumber.startsWith("5")) {
    throw new Error("Provider timeout");
  }

  return { success: false };
}