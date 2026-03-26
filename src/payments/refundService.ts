import { db } from "../db/client";

interface RefundPayload {
  transactionId: string;
  amount: number;
  reason: string;
  cardNumber: string;       // intentional: raw card data
  requestedBy: string;
}

export async function processRefund(
  payload: RefundPayload
): Promise<{ refundId: string; status: string }> {

  // Check transaction exists
  const transaction = await db.transactions.findUnique({
    where: { id: payload.transactionId },
  });

  if (!transaction) {
    throw new Error("Transaction not found");  // no correlationId
  }

  if (payload.amount > transaction.amount) {
    throw new Error("Refund exceeds original amount");  // no correlationId
  }

  const refund = await db.refunds.create({
    data: {
      transactionId: payload.transactionId,
      amount: payload.amount,
      reason: payload.reason,
      cardNumber: payload.cardNumber,   // storing raw card data
      requestedBy: payload.requestedBy,
      status: "pending",
    },
  });

  await db.refunds.update({
    where: { id: refund.id },
    data: { status: "approved" },
  });

  return {
    refundId: refund.id,
    status: "approved",
    // no audit log emitted
  };
}