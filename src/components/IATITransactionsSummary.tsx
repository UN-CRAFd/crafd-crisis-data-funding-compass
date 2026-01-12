"use client";

import { IATITransactionSummary } from "@/types/iati";

interface IATITransactionsSummaryProps {
  transactionSummary: IATITransactionSummary;
  orgName: string;
}

export function IATITransactionsSummary({
  transactionSummary,
  orgName,
}: IATITransactionsSummaryProps) {
  if (!transactionSummary || transactionSummary.count === 0) {
    return null;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  };

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-slate-600 uppercase">Transactions</div>
      <div className="rounded-md bg-slate-50 p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-600">{transactionSummary.count} Transactions</span>
          <span className="text-lg font-bold text-slate-900">
            {formatCurrency(transactionSummary.total_value)}
          </span>
        </div>
      </div>
    </div>
  );
}
