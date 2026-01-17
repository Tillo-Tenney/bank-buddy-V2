import { Transaction } from '@/types/transaction';
import { calculateMonthlySummary, calculateQualityReport } from '@/data/mockTransactions';
import { Download, FileSpreadsheet, Table, ClipboardCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ExportPanelProps {
  transactions: Transaction[];
  bank: 'SBI' | 'SIB';
}

export const ExportPanel = ({ transactions, bank }: ExportPanelProps) => {
  const monthlySummary = calculateMonthlySummary(transactions);
  const qualityReport = calculateQualityReport(transactions);

  const handleExport = () => {
    // Simulate export - in real app would generate actual Excel
    toast.success('Excel file exported successfully!', {
      description: 'Statement_Export.xlsx with 3 sheets downloaded.',
    });
  };

  return (
    <div className="glass-card rounded-xl p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">Export Report</h2>
          <p className="text-sm text-muted-foreground">Download processed data as Excel</p>
        </div>
        <Button onClick={handleExport} className="gap-2">
          <Download className="w-4 h-4" />
          Export .xlsx
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Raw Transactions Sheet Preview */}
        <div className="border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Table className="w-4 h-4 text-primary" />
            <span className="font-medium text-sm">Raw_Transactions</span>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>{transactions.length} rows</p>
            <p>{transactions.filter(t => t.confidence_score < 0.8).length} highlighted yellow</p>
            <p>Columns: Date, Description, Dr, Cr, Balance</p>
          </div>
        </div>

        {/* Monthly Summary Sheet Preview */}
        <div className="border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileSpreadsheet className="w-4 h-4 text-primary" />
            <span className="font-medium text-sm">Monthly_Summary</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {monthlySummary.map(m => (
              <div key={m.month} className="flex justify-between py-0.5">
                <span>{m.month}</span>
                <span className="font-mono">
                  Cr: ₹{(m.totalCredit / 1000).toFixed(0)}K | Dr: ₹{(m.totalDebit / 1000).toFixed(0)}K
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quality Report Sheet Preview */}
        <div className="border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardCheck className="w-4 h-4 text-primary" />
            <span className="font-medium text-sm">Quality_Report</span>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Rows processed: {qualityReport.totalRows}</p>
            <p>Balance mismatches: {qualityReport.balanceMismatches}</p>
            <p>Avg confidence: {(qualityReport.avgConfidence * 100).toFixed(1)}%</p>
            <p>Bank: {bank}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
