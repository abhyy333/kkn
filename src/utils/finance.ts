export interface Transaction {
  id: string;
  date: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  source?: string;
  receiptUrl?: string;
  programId?: string;
  recordedBy: string;
}

export interface FinanceSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  byCategory: Record<string, number>;
  burnRatePercent: number;
}

/**
 * Calculates finance summary aggregates from a list of transactions.
 */
export function calculateFinanceSummary(
  transactions: Transaction[],
  budgetCeiling: number = 10000000
): FinanceSummary {
  let totalIncome = 0;
  let totalExpense = 0;
  const byCategory: Record<string, number> = {};

  for (const t of transactions) {
    if (t.type === 'income') {
      totalIncome += t.amount;
    } else {
      totalExpense += t.amount;
      byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
    }
  }

  const balance = totalIncome - totalExpense;
  const burnRatePercent =
    totalIncome > 0
      ? Math.round((totalExpense / totalIncome) * 100)
      : budgetCeiling > 0
      ? Math.round((totalExpense / budgetCeiling) * 100)
      : 0;

  return {
    totalIncome,
    totalExpense,
    balance,
    byCategory,
    burnRatePercent,
  };
}

/**
 * Formats a number to Indonesian Rupiah representation.
 */
export function formatRupiah(amount: number): string {
  const isNegative = amount < 0;
  const absVal = Math.abs(amount);
  const formatted = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(absVal);

  return isNegative ? `-${formatted}` : formatted;
}
