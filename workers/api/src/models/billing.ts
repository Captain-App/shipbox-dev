import { Schema } from "effect";

export const TransactionType = Schema.Literal("top-up", "usage", "refund");
export type TransactionType = typeof TransactionType.Type;

export const UserBalance = Schema.Struct({
  userId: Schema.String,
  balanceCredits: Schema.Number,
  updatedAt: Schema.Number,
});
export type UserBalance = typeof UserBalance.Type;

export const Transaction = Schema.Struct({
  id: Schema.String,
  userId: Schema.String,
  amountCredits: Schema.Number,
  type: TransactionType,
  description: Schema.optionalWith(Schema.String, { exact: true }),
  createdAt: Schema.Number,
  metadata: Schema.optionalWith(Schema.String, { exact: true }),
});
export type Transaction = typeof Transaction.Type;

export const UsageReportInput = Schema.Struct({
  userId: Schema.String,
  sessionId: Schema.String,
  durationMs: Schema.Number,
  tool: Schema.optionalWith(Schema.String, { exact: true }),
});
export type UsageReportInput = typeof UsageReportInput.Type;
