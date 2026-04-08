import { db } from "../db/client";
import { logger } from "../utils/logger";

interface WebhookPayload {
  event: string;
  transactionId: string;
  status: string;
  amount: number;
  currency: string;
  timestamp: string;
}

interface WebhookConfig {
  url: string;
  secret: string;
  merchantId: string;
}

/**
 * Send a webhook notification to the merchant when a payment event occurs.
 * Called after payment processing to keep merchants informed in real-time.
 */
export async function notifyMerchant(
  transactionId: string,
  event: string
): Promise<{ delivered: boolean; attemptCount: number }> {
  const transaction = await db.transactions.findUnique({
    where: { id: transactionId },
  });

  if (!transaction) {
    throw new Error(`Transaction ${transactionId} not found for webhook`);
  }

  const config = await db.webhookConfigs.findFirst({
    where: { merchantId: transaction.merchantId },
  });

  if (!config) {
    logger.info("no webhook config for merchant, skipping", {
      merchantId: transaction.merchantId,
    });
    return { delivered: false, attemptCount: 0 };
  }

  const payload: WebhookPayload = {
    event,
    transactionId: transaction.id,
    status: transaction.status,
    amount: transaction.amount,
    currency: transaction.currency,
    timestamp: new Date().toISOString(),
  };

  let delivered = false;
  let attemptCount = 0;
  const maxRetries = 3;

  while (attemptCount < maxRetries && !delivered) {
    attemptCount++;
    try {
      const response = await fetch(config.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Secret": config.secret,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        delivered = true;
      } else {
        logger.warn("webhook delivery failed, retrying", {
          transactionId,
          attempt: attemptCount,
          statusCode: response.status,
        });
      }
    } catch (err) {
      logger.warn("webhook delivery error, retrying", {
        transactionId,
        attempt: attemptCount,
        error: err,
      });
    }
  }

  await db.webhookDeliveries.create({
    data: {
      transactionId,
      merchantId: transaction.merchantId,
      event,
      delivered,
      attemptCount,
      payload: JSON.stringify(payload),
    },
  });

  return { delivered, attemptCount };
}
