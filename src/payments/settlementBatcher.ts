import { db } from "../db/client";
import { logger } from "../utils/logger";
import { calculateBatchFees } from "./feeCalculator";

interface SettlementBatch {
  batchId: string;
  merchantId: string;
  transactionCount: number;
  totalProcessed: number;
  totalFees: number;
  totalNet: number;
  cutoffTimestamp: Date;
  createdAt: Date;
}

/**
 * Create a settlement batch for a merchant, capturing all completed
 * transactions since the last settlement up to the current cutoff.
 */
export async function createSettlementBatch(
  merchantId: string
): Promise<SettlementBatch> {
  const lastBatch = await db.settlementBatches.findFirst({
    where: { merchantId },
    orderBy: { cutoffTimestamp: "desc" },
  });

  const cutoff = new Date();
  const since = lastBatch?.cutoffTimestamp ?? new Date("2024-01-01");

  const transactions = await db.transactions.findMany({
    where: {
      merchantId,
      status: "completed",
      createdAt: {
        gte: since,
        lt: cutoff,
      },
    },
  });

  if (transactions.length === 0) {
    throw new Error(`No completed transactions to settle for merchant ${merchantId}`);
  }

  const amounts = transactions.map((t: { amount: number }) => t.amount);
  const { totalProcessed, totalFees, totalNet } = calculateBatchFees(amounts);

  const batch = await db.settlementBatches.create({
    data: {
      merchantId,
      transactionCount: transactions.length,
      totalProcessed,
      totalFees,
      totalNet,
      cutoffTimestamp: cutoff,
    },
  });

  logger.info("settlement batch created", {
    batchId: batch.id,
    merchantId,
    transactionCount: transactions.length,
    totalProcessed,
    totalFees,
    totalNet,
    cutoffTimestamp: cutoff.toISOString(),
  });

  return {
    batchId: batch.id,
    merchantId,
    transactionCount: transactions.length,
    totalProcessed,
    totalFees,
    totalNet,
    cutoffTimestamp: cutoff,
    createdAt: batch.createdAt,
  };
}
