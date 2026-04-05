import { db } from "../db/client";
import { logger } from "../utils/logger";
import { calculateFees } from "./feeCalculator";
import { notifyMerchant } from "./webhookNotifier";

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
  fees?: {
    processingFee: number;
    platformFee: number;
    totalFee: number;
    netAmount: number;
  };
}

export async function processPayment(
  payload: PaymentPayload
): Promise<TransactionResult> {
  if (payload.amount <= 0) {
    throw new Error("Invalid amount");
  }

  // Calculate fees for this transaction
  const fees = calculateFees(payload.amount);

  const transaction = await db.transactions.create({
    data: {
      userId: payload.userId,
      amount: payload.amount,
      currency: payload.currency,
      cardLast4: payload.cardNumber.slice(-4),
      metadata: payload.metadata,
      status: "pending",
      processingFee: fees.processingFee,
      platformFee: fees.platformFee,
      netAmount: fees.netAmount,
    },
  });

  // Process with payment provider
  const result = await chargeCard(payload);

  const finalStatus = result.success ? "completed" : "failed";

  // Notify merchant of payment outcome
  await notifyMerchant(transaction.id, `payment.${finalStatus}`);

  // Update transaction status in database
  await db.transactions.update({
    where: { id: transaction.id },
    data: { status: finalStatus },
  });

  logger.info("payment processed", {
    transactionId: transaction.id,
    status: finalStatus,
    amount: payload.amount,
  });

  return {
    transactionId: transaction.id,
    status: finalStatus,
    amount: payload.amount,
    fees: {
      processingFee: fees.processingFee,
      platformFee: fees.platformFee,
      totalFee: fees.totalFee,
      netAmount: fees.netAmount,
    },
  };
}

async function chargeCard(payload: PaymentPayload) {
  // Stub: real implementation calls payment provider
  return { success: true };
}
