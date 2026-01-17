import { useMemo } from 'react';
import { Transaction, AnalyticsSummary } from '@/types/transaction';
import { MetricCard } from './MetricCard';
import { TrendingUp, TrendingDown, ArrowUpDown, AlertTriangle, FileCheck, Calendar } from 'lucide-react';

interface AnalyticsDashboardProps {
  transactions: Transaction[];
  onFilterChange: (filter: 'credit' | 'debit' | 'flagged' | null) => void;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const AnalyticsDashboard = ({ transactions, onFilterChange }: AnalyticsDashboardProps) => {
  const analytics: AnalyticsSummary = useMemo(() => {
    const totalCredit = transactions.reduce((sum, t) => sum + (t.credit_amount || 0), 0);
    const totalDebit = transactions.reduce((sum, t) => sum + (t.debit_amount || 0), 0);
    const netCashFlow = totalCredit - totalDebit;

    const debitTransactions = transactions.filter(t => t.debit_amount !== null && t.debit_amount > 0);
    const highestDebit = debitTransactions.reduce(
      (max, t) => (t.debit_amount! > max.amount ? { amount: t.debit_amount!, date: t.txn_date, description: t.description } : max),
      { amount: 0, date: '', description: '' }
    );

    return {
      totalCredit,
      totalDebit,
      netCashFlow,
      highestDebit,
      rowCount: transactions.length,
      flaggedCount: transactions.filter(t => t.is_flagged).length,
    };
  }, [transactions]);

  return (
    <div className="animate-slide-up">
      <h2 className="text-lg font-semibold mb-4">Analytics Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Credit"
          value={formatCurrency(analytics.totalCredit)}
          icon={<TrendingUp className="w-5 h-5" />}
          trend="positive"
          onClick={() => onFilterChange('credit')}
        />
        
        <MetricCard
          title="Total Debit"
          value={formatCurrency(analytics.totalDebit)}
          icon={<TrendingDown className="w-5 h-5" />}
          trend="negative"
          onClick={() => onFilterChange('debit')}
        />
        
        <MetricCard
          title="Net Cash Flow"
          value={formatCurrency(analytics.netCashFlow)}
          icon={<ArrowUpDown className="w-5 h-5" />}
          trend={analytics.netCashFlow >= 0 ? 'positive' : 'negative'}
        />
        
        <MetricCard
          title="Highest Debit"
          value={formatCurrency(analytics.highestDebit.amount)}
          subtitle={analytics.highestDebit.date ? new Date(analytics.highestDebit.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '-'}
          icon={<Calendar className="w-5 h-5" />}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <MetricCard
          title="Transactions Processed"
          value={analytics.rowCount.toString()}
          subtitle="Total rows parsed"
          icon={<FileCheck className="w-5 h-5" />}
        />
        
        <MetricCard
          title="Flagged Transactions"
          value={analytics.flaggedCount.toString()}
          subtitle={`${((analytics.flaggedCount / analytics.rowCount) * 100).toFixed(1)}% of total`}
          icon={<AlertTriangle className="w-5 h-5" />}
          trend={analytics.flaggedCount > 0 ? 'negative' : 'positive'}
          onClick={() => onFilterChange('flagged')}
        />
      </div>
    </div>
  );
};
