import { logger } from "../utils/logger";

interface FeeBreakdown {
  baseAmount: number;
  processingFee: number;
  platformFee: number;
  totalFee: number;
  netAmount: number;
}

interface FeeConfig {
  processingRate: number;   // e.g. 0.029 for 2.9%
  platformRate: number;     // e.g. 0.005 for 0.5%
  fixedFee: number;         // e.g. 0.30 for 30 cents
}

const DEFAULT_FEE_CONFIG: FeeConfig = {
  processingRate: 0.029,
  platformRate: 0.005,
  fixedFee: 0.30,
};

/**
 * Calculate fee breakdown for a given payment amount.
 * Used for merchant settlement statements and transaction receipts.
 */
export function calculateFees(
  amount: number,
  config: FeeConfig = DEFAULT_FEE_CONFIG
): FeeBreakdown {
  if (amount <= 0) {
    throw new Error("Amount must be positive for fee calculation");
  }

  const processingFee = amount * config.processingRate;
  const platformFee = amount * config.platformRate;
  const totalFee = processingFee + platformFee + config.fixedFee;
  const netAmount = amount - totalFee;

  logger.info("fee calculation completed", {
    baseAmount: amount,
    processingFee,
    platformFee,
    totalFee,
    netAmount,
  });

  return {
    baseAmount: amount,
    processingFee,
    platformFee,
    totalFee,
    netAmount,
  };
}

/**
 * Calculate aggregate fees for a batch of transactions.
 * Used in daily settlement reports sent to merchants.
 */
export function calculateBatchFees(
  amounts: number[],
  config: FeeConfig = DEFAULT_FEE_CONFIG
): { totalProcessed: number; totalFees: number; totalNet: number } {
  let totalProcessed = 0;
  let totalFees = 0;
  let totalNet = 0;

  for (const amount of amounts) {
    const breakdown = calculateFees(amount, config);
    totalProcessed += breakdown.baseAmount;
    totalFees += breakdown.totalFee;
    totalNet += breakdown.netAmount;
  }

  return { totalProcessed, totalFees, totalNet };
}
