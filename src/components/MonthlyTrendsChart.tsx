import { useMemo } from 'react';
import { Transaction } from '@/types/transaction';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';

interface MonthlyTrendsChartProps {
  transactions: Transaction[];
}

const chartConfig = {
  credit: {
    label: 'Credit',
    color: 'hsl(var(--success))',
  },
  debit: {
    label: 'Debit',
    color: 'hsl(var(--destructive))',
  },
};

const formatCurrency = (value: number) => {
  if (value >= 100000) {
    return `₹${(value / 100000).toFixed(1)}L`;
  } else if (value >= 1000) {
    return `₹${(value / 1000).toFixed(1)}K`;
  }
  return `₹${value}`;
};

const formatMonth = (monthStr: string) => {
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
};

export const MonthlyTrendsChart = ({ transactions }: MonthlyTrendsChartProps) => {
  const chartData = useMemo(() => {
    const monthlyMap = new Map<string, { credit: number; debit: number }>();

    transactions.forEach(txn => {
      const month = txn.txn_date.substring(0, 7);
      const current = monthlyMap.get(month) || { credit: 0, debit: 0 };
      current.credit += txn.credit_amount || 0;
      current.debit += txn.debit_amount || 0;
      monthlyMap.set(month, current);
    });

    return Array.from(monthlyMap.entries())
      .map(([month, data]) => ({
        month,
        monthLabel: formatMonth(month),
        credit: Math.round(data.credit * 100) / 100,
        debit: Math.round(data.debit * 100) / 100,
        netFlow: Math.round((data.credit - data.debit) * 100) / 100,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [transactions]);

  const totalCredit = chartData.reduce((sum, d) => sum + d.credit, 0);
  const totalDebit = chartData.reduce((sum, d) => sum + d.debit, 0);

  return (
    <div className="glass-card rounded-xl p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Monthly Credit vs Debit</h3>
          <p className="text-sm text-muted-foreground">Track your cash flow trends over time</p>
        </div>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-success" />
            <span className="text-muted-foreground">Credit: {formatCurrency(totalCredit)}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-destructive" />
            <span className="text-muted-foreground">Debit: {formatCurrency(totalDebit)}</span>
          </div>
        </div>
      </div>

      <ChartContainer config={chartConfig} className="h-[300px] w-full">
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis 
            dataKey="monthLabel" 
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
          />
          <YAxis 
            tickFormatter={formatCurrency}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
          />
          <ChartTooltip 
            content={
              <ChartTooltipContent 
                formatter={(value, name) => (
                  <span className="font-mono">
                    {new Intl.NumberFormat('en-IN', {
                      style: 'currency',
                      currency: 'INR',
                    }).format(Number(value))}
                  </span>
                )}
              />
            } 
          />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar 
            dataKey="credit" 
            fill="hsl(var(--success))" 
            radius={[4, 4, 0, 0]}
            name="Credit"
          />
          <Bar 
            dataKey="debit" 
            fill="hsl(var(--destructive))" 
            radius={[4, 4, 0, 0]}
            name="Debit"
          />
        </BarChart>
      </ChartContainer>

      {/* Net Flow Indicator */}
      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Net Cash Flow</span>
          <span className={`font-semibold ${totalCredit - totalDebit >= 0 ? 'text-success' : 'text-destructive'}`}>
            {totalCredit - totalDebit >= 0 ? '+' : ''}
            {new Intl.NumberFormat('en-IN', {
              style: 'currency',
              currency: 'INR',
            }).format(totalCredit - totalDebit)}
          </span>
        </div>
      </div>
    </div>
  );
};
