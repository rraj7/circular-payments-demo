import { db } from "../db/client";
import { logger } from "../utils/logger";

interface PaymentPayload {
  userId: string;
  amount: number;
  currency: string;
  cardNumber: string;
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
  if (payload.amount <= 0) {
    throw new Error("Invalid amount");
  }

  const transaction = await db.transactions.create({
    data: {
      userId: payload.userId,
      amount: payload.amount,
      currency: payload.currency,
      cardLast4: payload.cardNumber,
      metadata: payload.metadata,
      status: "pending",
    },
  });

  const result = await chargeCard(payload);

  await db.transactions.update({
    where: { id: transaction.id },
    data: { status: result.success ? "completed" : "failed" },
  });

  return {
    transactionId: transaction.id,
    status: result.success ? "completed" : "failed",
    amount: payload.amount,
  };
}

async function chargeCard(payload: PaymentPayload) {
  // Stub: real implementation calls payment provider
  return { success: true };
}
