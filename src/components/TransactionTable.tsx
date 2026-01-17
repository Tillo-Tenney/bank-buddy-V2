import { useState } from 'react';
import { Transaction } from '@/types/transaction';
import { AlertTriangle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TransactionTableProps {
  transactions: Transaction[];
  filterType?: 'credit' | 'debit' | 'flagged' | null;
  onClearFilter?: () => void;
}

const formatCurrency = (amount: number | null) => {
  if (amount === null || amount === 0) return '-';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const ConfidenceIndicator = ({ score }: { score: number }) => {
  const percentage = Math.round(score * 100);
  const color = score >= 0.9 ? 'bg-success' : score >= 0.7 ? 'bg-warning' : 'bg-destructive';
  
  return (
    <div className="flex items-center gap-2">
      <div className="confidence-bar w-16">
        <div className={cn('confidence-fill', color)} style={{ width: `${percentage}%` }} />
      </div>
      <span className="text-xs font-mono text-muted-foreground">{percentage}%</span>
    </div>
  );
};

export const TransactionTable = ({ transactions, filterType, onClearFilter }: TransactionTableProps) => {
  const [sortField, setSortField] = useState<'txn_date' | 'balance'>('txn_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const filteredTransactions = transactions.filter(txn => {
    if (!filterType) return true;
    if (filterType === 'credit') return txn.credit_amount !== null && txn.credit_amount > 0;
    if (filterType === 'debit') return txn.debit_amount !== null && txn.debit_amount > 0;
    if (filterType === 'flagged') return txn.is_flagged;
    return true;
  });

  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    const aVal = sortField === 'txn_date' ? new Date(a.txn_date).getTime() : a.balance;
    const bVal = sortField === 'txn_date' ? new Date(b.txn_date).getTime() : b.balance;
    return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
  });

  const handleSort = (field: 'txn_date' | 'balance') => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }: { field: 'txn_date' | 'balance' }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  return (
    <div className="glass-card rounded-xl overflow-hidden animate-fade-in">
      {filterType && (
        <div className="px-6 py-3 bg-primary/5 border-b border-border flex items-center justify-between">
          <span className="text-sm font-medium">
            Showing {filterType === 'credit' ? 'credit' : filterType === 'debit' ? 'debit' : 'flagged'} transactions 
            ({filteredTransactions.length} of {transactions.length})
          </span>
          <button
            onClick={onClearFilter}
            className="text-sm text-primary hover:underline"
          >
            Clear filter
          </button>
        </div>
      )}
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th 
                className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground"
                onClick={() => handleSort('txn_date')}
              >
                <div className="flex items-center gap-1">
                  Date
                  <SortIcon field="txn_date" />
                </div>
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Debit
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Credit
              </th>
              <th 
                className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground"
                onClick={() => handleSort('balance')}
              >
                <div className="flex items-center justify-end gap-1">
                  Balance
                  <SortIcon field="balance" />
                </div>
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Confidence
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedTransactions.map((txn) => (
              <tr 
                key={txn.id} 
                className={cn(
                  'data-table-row',
                  txn.is_flagged && 'flagged'
                )}
              >
                <td className="px-6 py-4">
                  {txn.is_flagged ? (
                    <div className="badge-warning">
                      <AlertTriangle className="w-3 h-3" />
                      Flagged
                    </div>
                  ) : (
                    <div className="badge-success">
                      <CheckCircle className="w-3 h-3" />
                      Valid
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 font-mono text-sm">
                  {formatDate(txn.txn_date)}
                </td>
                <td className="px-6 py-4 text-sm max-w-xs truncate" title={txn.description}>
                  {txn.description}
                </td>
                <td className="px-6 py-4 text-right font-mono text-sm text-destructive">
                  {formatCurrency(txn.debit_amount)}
                </td>
                <td className="px-6 py-4 text-right font-mono text-sm text-success">
                  {formatCurrency(txn.credit_amount)}
                </td>
                <td className="px-6 py-4 text-right font-mono text-sm font-medium">
                  {formatCurrency(txn.balance)}
                </td>
                <td className="px-6 py-4">
                  <ConfidenceIndicator score={txn.confidence_score} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
