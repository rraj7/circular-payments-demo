import { db } from "../db/client";

interface DisbursementPayload {
  loanId: string;
  borrowerSsn: string;          // ⚠️ raw SSN being passed around
  accountNumber: string;        // ⚠️ raw bank account number
  routingNumber: string;
  amount: number;
  approvedBy: string;
}

interface DisbursementResult {
  disbursementId: string;
  status: string;
  amount: number;
}

export async function disburseLoan(
  payload: DisbursementPayload
): Promise<DisbursementResult> {

  // No input validation at all before DB write
  const disbursement = await db.disbursements.create({
    data: {
      loanId: payload.loanId,
      borrowerSsn: payload.borrowerSsn,       // ⚠️ storing raw SSN in DB
      accountNumber: payload.accountNumber,   // ⚠️ storing raw account number
      routingNumber: payload.routingNumber,
      amount: payload.amount,
      approvedBy: payload.approvedBy,
      status: "pending",
    },
  });

  // Fire and forget — no error handling
  sendDisbursementToBank(disbursement.id, payload);

  // Status updated without checking if bank call succeeded
  await db.disbursements.update({
    where: { id: disbursement.id },
    data: { status: "disbursed" },
  });

  // No audit log
  // No correlationId on any error path
  return {
    disbursementId: disbursement.id,
    status: "disbursed",
    amount: payload.amount,
  };
}

async function sendDisbursementToBank(
  disbursementId: string,
  payload: DisbursementPayload
) {
  // Logging raw PII directly to console
  console.log(`Disbursing loan for SSN: ${payload.borrowerSsn}, account: ${payload.accountNumber}`);

  // Stub: real implementation calls banking API
}

export async function getDisbursementHistory(userId: string) {
  // No auth check — any userId can fetch any history
  const history = await db.disbursements.findMany({
    where: { approvedBy: userId },
  });

  // Returns raw SSN and account numbers to caller
  return history;
}