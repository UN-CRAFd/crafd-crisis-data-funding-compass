"use client";

import { IATITransaction } from "@/types/iati";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface IATITransactionsSummaryProps {
  transactions: IATITransaction[];
  orgName: string;
}

export function IATITransactionsSummary({
  transactions,
  orgName,
}: IATITransactionsSummaryProps) {
  if (!transactions || transactions.length === 0) {
    return null;
  }

  // Group transactions by type
  const transactionsByType = transactions.reduce(
    (acc, t) => {
      const typeCode = t.transaction_type_code || "unknown";
      if (!acc[typeCode]) {
        acc[typeCode] = [];
      }
      acc[typeCode].push(t);
      return acc;
    },
    {} as Record<string, IATITransaction[]>,
  );

  // Calculate totals
  const totalValue = transactions.reduce((sum, t) => {
    return sum + (t.transaction_value || 0);
  }, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  };

  const getTypeName = (code: string) => {
    const typeMap: Record<string, string> = {
      "1": "Incoming Funds",
      "2": "Outgoing Commitment",
      "3": "Disbursement",
      "4": "Expenditure",
      "11": "Incoming Commitment",
    };
    return typeMap[code] || `Type ${code}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          IATI Transactions ({transactions.length})
        </h3>
        <div className="text-right">
          <div className="text-muted-foreground text-xs">Total Value</div>
          <div className="text-lg font-semibold">
            {formatCurrency(totalValue)}
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {Object.entries(transactionsByType).map(([typeCode, txns]) => {
          const typeTotal = txns.reduce(
            (sum, t) => sum + (t.transaction_value || 0),
            0,
          );

          return (
            <Card key={typeCode} className="p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{getTypeName(typeCode)}</Badge>
                  <span className="text-muted-foreground text-xs">
                    {txns.length} txns
                  </span>
                </div>
                <div className="text-2xl font-bold">
                  {formatCurrency(typeTotal)}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Recent transactions preview */}
      <div className="space-y-2">
        <h4 className="text-muted-foreground text-sm font-medium">
          Recent Transactions
        </h4>
        <div className="space-y-2">
          {transactions.slice(0, 5).map((txn, index) => (
            <div
              key={txn.transaction_ref || index}
              className="flex items-center justify-between rounded-md border p-3 text-sm"
            >
              <div className="flex-1">
                <div className="font-medium">
                  {getTypeName(txn.transaction_type_code || "")}
                </div>
                <div className="text-muted-foreground text-xs">
                  {txn.transaction_date_iso_date || "Date not specified"}
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold">
                  {formatCurrency(txn.transaction_value || 0)}
                </div>
                {txn.transaction_value_currency &&
                  txn.transaction_value_currency !== "USD" && (
                    <div className="text-muted-foreground text-xs">
                      {txn.transaction_value_currency}
                    </div>
                  )}
              </div>
            </div>
          ))}
        </div>
        {transactions.length > 5 && (
          <p className="text-muted-foreground text-center text-xs">
            Showing 5 of {transactions.length} transactions
          </p>
        )}
      </div>
    </div>
  );
}
