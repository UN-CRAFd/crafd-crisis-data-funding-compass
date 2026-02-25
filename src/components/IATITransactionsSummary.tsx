"use client";

import { IATITransactionSummary } from "@/types/iati";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

  const getTypeName = (typeCode: string) => {
    const typeMap: Record<string, string> = {
      "1": "Incoming Funds",
      "2": "Outgoing Commitment",
      "3": "Disbursement",
      "4": "Expenditure",
      "11": "Incoming Commitment",
      "12": "Outgoing Pledge",
      "13": "Incoming Pledge",
    };
    return typeMap[typeCode] || `Type ${typeCode}`;
  };

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-slate-600 uppercase">
        Transactions
      </div>
      <div className="rounded-md bg-slate-50 p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-600">
            {transactionSummary.count} Transactions
          </span>
          <span className="text-lg font-bold text-slate-900">
            {formatCurrency(transactionSummary.total_value)}
          </span>
        </div>

        {/* Breakdown by type */}
        {transactionSummary.by_type &&
          Object.keys(transactionSummary.by_type).length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="text-xs font-medium text-slate-600">By Type</div>
              <div className="grid gap-2">
                {Object.entries(transactionSummary.by_type).map(
                  ([typeCode, data]) => (
                    <div
                      key={typeCode}
                      className="flex items-center justify-between rounded border bg-white p-2 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {getTypeName(typeCode)}
                        </Badge>
                        <span className="text-slate-600">
                          {data.count} txns
                        </span>
                      </div>
                      <span className="font-semibold">
                        {formatCurrency(data.total_value)}
                      </span>
                    </div>
                  ),
                )}
              </div>
            </div>
          )}

        {/* Breakdown by year */}
        {transactionSummary.by_year &&
          Object.keys(transactionSummary.by_year).length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="text-xs font-medium text-slate-600">By Year</div>
              <div className="grid gap-1">
                {Object.entries(transactionSummary.by_year)
                  .sort(([a], [b]) => b.localeCompare(a))
                  .slice(0, 5)
                  .map(([year, value]) => (
                    <div
                      key={year}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="text-slate-600">{year}</span>
                      <span className="font-semibold">
                        {formatCurrency(value)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

        {/* Breakdown by currency */}
        {transactionSummary.by_currency &&
          Object.keys(transactionSummary.by_currency).length > 1 && (
            <div className="mt-3 space-y-2">
              <div className="text-xs font-medium text-slate-600">
                By Currency
              </div>
              <div className="grid gap-1">
                {Object.entries(transactionSummary.by_currency)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 5)
                  .map(([currency, value]) => (
                    <div
                      key={currency}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="text-slate-600">{currency}</span>
                      <span className="font-semibold">
                        {formatCurrency(value)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
