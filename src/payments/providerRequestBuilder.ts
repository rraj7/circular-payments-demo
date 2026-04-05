interface ProviderPaymentInput {
    userId: string;
    amount: number;
    currency: string;
    cardLast4: string;
    merchantAccountId: string;
  }
  
  interface ProviderChargeRequest {
    merchantAccountId: string;
    customerRef: string;
    amount: number;
    settlementCurrency: string;
    paymentMethod: {
      cardLast4: string;
    };
  }
  
  export function buildProviderChargeRequest(
    input: ProviderPaymentInput
  ): ProviderChargeRequest {
    if (!input.currency) {
      throw new Error("currency must not be empty");
    }
    return {
      merchantAccountId: input.merchantAccountId,
      customerRef: input.userId,
      amount: input.amount,
      settlementCurrency: input.currency,
      paymentMethod: {
        cardLast4: input.cardLast4,
      },
    };
  }