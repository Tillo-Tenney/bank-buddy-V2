// import { useState } from 'react';
// import { Transaction } from '@/types/transaction';
// import { calculateMonthlySummary, calculateQualityReport } from '@/data/mockTransactions';
// import { Download, FileSpreadsheet, Table, ClipboardCheck, FileText } from 'lucide-react';
// import { Button } from '@/components/ui/button';
// import { toast } from 'sonner';
// import * as XLSX from 'xlsx';

// interface ExportPanelProps {
//   transactions: Transaction[];
//   bank: 'SBI' | 'SIB';
// }

// export const ExportPanel = ({ transactions, bank }: ExportPanelProps) => {
//   const [selectedFormat, setSelectedFormat] = useState<'xlsx' | 'csv' | 'both'>('xlsx');
//   const monthlySummary = calculateMonthlySummary(transactions);
//   const qualityReport = calculateQualityReport(transactions);

//   const handleExportXLSX = () => {
//     try {
//       // Create a new workbook
//       const wb = XLSX.utils.book_new();

//       // Sheet 1: Raw Transactions
//       const rawData = transactions.map(t => ({
//         'Date': t.txn_date,
//         'Description': t.description,
//         'Debit': t.debit_amount || '',
//         'Credit': t.credit_amount || '',
//         'Balance': t.balance,
//         'Confidence': `${(t.confidence_score * 100).toFixed(1)}%`,
//         'Flagged': t.is_flagged ? 'Yes' : 'No'
//       }));
//       const ws1 = XLSX.utils.json_to_sheet(rawData);

//       // Apply yellow highlighting to low confidence rows
//       const range = XLSX.utils.decode_range(ws1['!ref'] || 'A1');
//       for (let R = range.s.r + 1; R <= range.e.r; ++R) {
//         const transaction = transactions[R - 1];
//         if (transaction && transaction.confidence_score < 0.8) {
//           for (let C = range.s.c; C <= range.e.c; ++C) {
//             const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
//             if (!ws1[cellAddress]) continue;
            
//             if (!ws1[cellAddress].s) ws1[cellAddress].s = {};
//             ws1[cellAddress].s.fill = { fgColor: { rgb: "FFFF00" } };
//           }
//         }
//       }

//       // Set column widths
//       ws1['!cols'] = [
//         { wch: 12 }, { wch: 40 }, { wch: 12 }, { wch: 12 }, 
//         { wch: 15 }, { wch: 12 }, { wch: 10 }
//       ];

//       XLSX.utils.book_append_sheet(wb, ws1, 'Raw_Transactions');

//       // Sheet 2: Monthly Summary
//       const monthlyData = monthlySummary.map(m => ({
//         'Month': m.month,
//         'Total Credit': m.totalCredit,
//         'Total Debit': m.totalDebit,
//         'Net Flow': m.netFlow,
//         'Transaction Count': m.txnCount
//       }));
//       const ws2 = XLSX.utils.json_to_sheet(monthlyData);
//       ws2['!cols'] = [{ wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 18 }];
//       XLSX.utils.book_append_sheet(wb, ws2, 'Monthly_Summary');

//       // Sheet 3: Quality Report
//       const qualityData = [
//         { 'Metric': 'Total Rows Processed', 'Value': qualityReport.totalRows },
//         { 'Metric': 'Balance Mismatches', 'Value': qualityReport.balanceMismatches },
//         { 'Metric': 'Average Confidence', 'Value': `${(qualityReport.avgConfidence * 100).toFixed(1)}%` },
//         { 'Metric': 'Low Confidence Rows (<80%)', 'Value': transactions.filter(t => t.confidence_score < 0.8).length },
//         { 'Metric': 'Flagged Transactions', 'Value': transactions.filter(t => t.is_flagged).length },
//         { 'Metric': 'Bank Source', 'Value': bank },
//         { 'Metric': 'Export Date', 'Value': new Date().toLocaleDateString('en-IN') },
//         { 'Metric': 'Total Credit', 'Value': transactions.reduce((sum, t) => sum + (t.credit_amount || 0), 0) },
//         { 'Metric': 'Total Debit', 'Value': transactions.reduce((sum, t) => sum + (t.debit_amount || 0), 0) }
//       ];
//       const ws3 = XLSX.utils.json_to_sheet(qualityData);
//       ws3['!cols'] = [{ wch: 30 }, { wch: 20 }];
//       XLSX.utils.book_append_sheet(wb, ws3, 'Quality_Report');

//       // Generate filename with timestamp
//       const timestamp = new Date().toISOString().slice(0, 10);
//       const filename = `Statement_${bank}_${timestamp}.xlsx`;

//       // Write and download the file
//       XLSX.writeFile(wb, filename);

//       return filename;
//     } catch (error) {
//       console.error('XLSX Export error:', error);
//       throw error;
//     }
//   };

//   const handleExportCSV = () => {
//     try {
//       // CSV export includes only raw transactions (CSV is single sheet)
//       const headers = ['Date', 'Description', 'Debit', 'Credit', 'Balance', 'Confidence', 'Flagged'];
//       const csvContent = [
//         headers.join(','),
//         ...transactions.map(t => [
//           t.txn_date,
//           `"${t.description.replace(/"/g, '""')}"`, // Escape quotes in description
//           t.debit_amount || '',
//           t.credit_amount || '',
//           t.balance,
//           `${(t.confidence_score * 100).toFixed(1)}%`,
//           t.is_flagged ? 'Yes' : 'No'
//         ].join(','))
//       ].join('\n');

//       const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
//       const link = document.createElement('a');
//       const timestamp = new Date().toISOString().slice(0, 10);
//       const filename = `Statement_${bank}_${timestamp}.csv`;
      
//       link.href = URL.createObjectURL(blob);
//       link.download = filename;
//       link.click();

//       return filename;
//     } catch (error) {
//       console.error('CSV Export error:', error);
//       throw error;
//     }
//   };

//   const handleExport = () => {
//     try {
//       if (selectedFormat === 'xlsx') {
//         const filename = handleExportXLSX();
//         toast.success('Excel file exported successfully!', {
//           description: `${filename} with 3 sheets downloaded.`,
//         });
//       } else if (selectedFormat === 'csv') {
//         const filename = handleExportCSV();
//         toast.success('CSV file exported successfully!', {
//           description: `${filename} downloaded.`,
//         });
//       } else if (selectedFormat === 'both') {
//         const xlsxFile = handleExportXLSX();
//         const csvFile = handleExportCSV();
//         toast.success('Both files exported successfully!', {
//           description: `${xlsxFile} and ${csvFile} downloaded.`,
//         });
//       }
//     } catch (error) {
//       console.error('Export error:', error);
//       toast.error('Failed to export file', {
//         description: 'Please try again or contact support.',
//       });
//     }
//   };

//   return (
//     <div className="glass-card rounded-xl p-6 animate-fade-in">
//       <div className="flex items-center justify-between mb-6">
//         <div>
//           <h2 className="text-lg font-semibold">Export Report</h2>
//           <p className="text-sm text-muted-foreground">Download processed data in your preferred format</p>
//         </div>
//         <div className="flex items-center gap-3">
//           {/* Format Selection */}
//           <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1">
//             <button
//               onClick={() => setSelectedFormat('xlsx')}
//               className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
//                 selectedFormat === 'xlsx' 
//                   ? 'bg-primary text-primary-foreground shadow-sm' 
//                   : 'text-muted-foreground hover:text-foreground'
//               }`}
//             >
//               <FileSpreadsheet className="w-4 h-4 inline mr-1" />
//               XLSX
//             </button>
//             <button
//               onClick={() => setSelectedFormat('csv')}
//               className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
//                 selectedFormat === 'csv' 
//                   ? 'bg-primary text-primary-foreground shadow-sm' 
//                   : 'text-muted-foreground hover:text-foreground'
//               }`}
//             >
//               <FileText className="w-4 h-4 inline mr-1" />
//               CSV
//             </button>
//             <button
//               onClick={() => setSelectedFormat('both')}
//               className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
//                 selectedFormat === 'both' 
//                   ? 'bg-primary text-primary-foreground shadow-sm' 
//                   : 'text-muted-foreground hover:text-foreground'
//               }`}
//             >
//               <Download className="w-4 h-4 inline mr-1" />
//               Both
//             </button>
//           </div>
          
//           <Button onClick={handleExport} className="gap-2">
//             <Download className="w-4 h-4" />
//             Export {selectedFormat === 'xlsx' ? '.xlsx' : selectedFormat === 'csv' ? '.csv' : 'Files'}
//           </Button>
//         </div>
//       </div>

//       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//         {/* Raw Transactions Sheet Preview */}
//         <div className="border border-border rounded-lg p-4">
//           <div className="flex items-center gap-2 mb-3">
//             <Table className="w-4 h-4 text-primary" />
//             <span className="font-medium text-sm">Raw_Transactions</span>
//           </div>
//           <div className="text-xs text-muted-foreground space-y-1">
//             <p>{transactions.length} rows</p>
//             <p>{transactions.filter(t => t.confidence_score < 0.8).length} highlighted yellow</p>
//             <p>Columns: Date, Description, Dr, Cr, Balance</p>
//           </div>
//         </div>

//         {/* Monthly Summary Sheet Preview */}
//         <div className="border border-border rounded-lg p-4">
//           <div className="flex items-center gap-2 mb-3">
//             <FileSpreadsheet className="w-4 h-4 text-primary" />
//             <span className="font-medium text-sm">Monthly_Summary</span>
//             {selectedFormat === 'csv' && (
//               <span className="text-xs text-muted-foreground">(XLSX only)</span>
//             )}
//           </div>
//           <div className="text-xs text-muted-foreground">
//             {monthlySummary.map(m => (
//               <div key={m.month} className="flex justify-between py-0.5">
//                 <span>{m.month}</span>
//                 <span className="font-mono">
//                   Cr: ₹{(m.totalCredit / 1000).toFixed(0)}K | Dr: ₹{(m.totalDebit / 1000).toFixed(0)}K
//                 </span>
//               </div>
//             ))}
//           </div>
//         </div>

//         {/* Quality Report Sheet Preview */}
//         <div className="border border-border rounded-lg p-4">
//           <div className="flex items-center gap-2 mb-3">
//             <ClipboardCheck className="w-4 h-4 text-primary" />
//             <span className="font-medium text-sm">Quality_Report</span>
//             {selectedFormat === 'csv' && (
//               <span className="text-xs text-muted-foreground">(XLSX only)</span>
//             )}
//           </div>
//           <div className="text-xs text-muted-foreground space-y-1">
//             <p>Rows processed: {qualityReport.totalRows}</p>
//             <p>Balance mismatches: {qualityReport.balanceMismatches}</p>
//             <p>Avg confidence: {(qualityReport.avgConfidence * 100).toFixed(1)}%</p>
//             <p>Bank: {bank}</p>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };



import { useState } from 'react';
import { Transaction } from '@/types/transaction';
import { calculateMonthlySummary, calculateQualityReport } from '@/data/mockTransactions';
import { Download, FileSpreadsheet, Table, ClipboardCheck, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface ExportPanelProps {
  transactions: Transaction[];
  bank: 'SBI' | 'SIB';
}

export const ExportPanel = ({ transactions, bank }: ExportPanelProps) => {
  const [selectedFormat, setSelectedFormat] = useState<'xlsx' | 'csv' | 'both'>('xlsx');
  const monthlySummary = calculateMonthlySummary(transactions);
  const qualityReport = calculateQualityReport(transactions);

  const handleExportXLSX = () => {
    try {
      // Create a new workbook
      const wb = XLSX.utils.book_new();

      // Sheet 1: Raw Transactions
      const rawData = transactions.map(t => ({
        'Date': t.txn_date,
        'Description': t.description,
        'Debit': t.debit_amount || '',
        'Credit': t.credit_amount || '',
        'Balance': t.balance,
        'Confidence': `${(t.confidence_score * 100).toFixed(1)}%`,
        'Flagged': t.is_flagged ? 'Yes' : 'No'
      }));
      const ws1 = XLSX.utils.json_to_sheet(rawData);

      // Apply yellow highlighting to low confidence rows
      const range = XLSX.utils.decode_range(ws1['!ref'] || 'A1');
      for (let R = range.s.r + 1; R <= range.e.r; ++R) {
        const transaction = transactions[R - 1];
        if (transaction && transaction.confidence_score < 0.8) {
          for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
            if (!ws1[cellAddress]) continue;
            
            if (!ws1[cellAddress].s) ws1[cellAddress].s = {};
            ws1[cellAddress].s.fill = { fgColor: { rgb: "FFFF00" } };
          }
        }
      }

      // Set column widths
      ws1['!cols'] = [
        { wch: 12 }, { wch: 40 }, { wch: 12 }, { wch: 12 }, 
        { wch: 15 }, { wch: 12 }, { wch: 10 }
      ];

      XLSX.utils.book_append_sheet(wb, ws1, 'Raw_Transactions');

      // Sheet 2: Monthly Summary
      const monthlyData = monthlySummary.map(m => ({
        'Month': m.month,
        'Total Credit': m.totalCredit,
        'Total Debit': m.totalDebit,
        'Net Flow': m.netFlow,
        'Transaction Count': m.txnCount
      }));
      const ws2 = XLSX.utils.json_to_sheet(monthlyData);
      ws2['!cols'] = [{ wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 18 }];
      XLSX.utils.book_append_sheet(wb, ws2, 'Monthly_Summary');

      // Sheet 3: Quality Report
      const qualityData = [
        { 'Metric': 'Total Rows Processed', 'Value': qualityReport.totalRows },
        { 'Metric': 'Balance Mismatches', 'Value': qualityReport.balanceMismatches },
        { 'Metric': 'Average Confidence', 'Value': `${(qualityReport.avgConfidence * 100).toFixed(1)}%` },
        { 'Metric': 'Low Confidence Rows (<80%)', 'Value': transactions.filter(t => t.confidence_score < 0.8).length },
        { 'Metric': 'Flagged Transactions', 'Value': transactions.filter(t => t.is_flagged).length },
        { 'Metric': 'Bank Source', 'Value': bank },
        { 'Metric': 'Export Date', 'Value': new Date().toLocaleDateString('en-IN') },
        { 'Metric': 'Total Credit', 'Value': transactions.reduce((sum, t) => sum + (t.credit_amount || 0), 0) },
        { 'Metric': 'Total Debit', 'Value': transactions.reduce((sum, t) => sum + (t.debit_amount || 0), 0) }
      ];
      const ws3 = XLSX.utils.json_to_sheet(qualityData);
      ws3['!cols'] = [{ wch: 30 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, ws3, 'Quality_Report');

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `Statement_${bank}_${timestamp}.xlsx`;

      // Write and download the file
      XLSX.writeFile(wb, filename);

      return filename;
    } catch (error) {
      console.error('XLSX Export error:', error);
      throw error;
    }
  };

  const handleExportCSV = () => {
    try {
      // CSV export includes only raw transactions (CSV is single sheet)
      const headers = ['Date', 'Description', 'Debit', 'Credit', 'Balance', 'Confidence', 'Flagged'];
      const csvContent = [
        headers.join(','),
        ...transactions.map(t => [
          t.txn_date,
          `"${t.description.replace(/"/g, '""')}"`, // Escape quotes in description
          t.debit_amount || '',
          t.credit_amount || '',
          t.balance,
          `${(t.confidence_score * 100).toFixed(1)}%`,
          t.is_flagged ? 'Yes' : 'No'
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `Statement_${bank}_${timestamp}.csv`;
      
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();

      return filename;
    } catch (error) {
      console.error('CSV Export error:', error);
      throw error;
    }
  };

  const handleExport = () => {
    try {
      if (selectedFormat === 'xlsx') {
        const filename = handleExportXLSX();
        toast.success('Excel file exported successfully!', {
          description: `${filename} with 3 sheets downloaded.`,
        });
      } else if (selectedFormat === 'csv') {
        const filename = handleExportCSV();
        toast.success('CSV file exported successfully!', {
          description: `${filename} downloaded.`,
        });
      } else if (selectedFormat === 'both') {
        const xlsxFile = handleExportXLSX();
        const csvFile = handleExportCSV();
        toast.success('Both files exported successfully!', {
          description: `${xlsxFile} and ${csvFile} downloaded.`,
        });
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export file', {
        description: 'Please try again or contact support.',
      });
    }
  };

  return (
    <div className="glass-card rounded-xl p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">Export Report</h2>
          <p className="text-sm text-muted-foreground">Download processed data in your preferred format</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Format Selection */}
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1">
            <button
              onClick={() => setSelectedFormat('xlsx')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                selectedFormat === 'xlsx' 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 inline mr-1" />
              XLSX
            </button>
            <button
              onClick={() => setSelectedFormat('csv')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                selectedFormat === 'csv' 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-1" />
              CSV
            </button>
            <button
              onClick={() => setSelectedFormat('both')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                selectedFormat === 'both' 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Download className="w-4 h-4 inline mr-1" />
              Both
            </button>
          </div>
          
          <Button onClick={handleExport} className="gap-2">
            <Download className="w-4 h-4" />
            Export {selectedFormat === 'xlsx' ? '.xlsx' : selectedFormat === 'csv' ? '.csv' : 'Files'}
          </Button>
        </div>
      </div>

      {/* Format Information Note */}
      {selectedFormat === 'csv' && (
        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2 animate-fade-in">
          <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm">
            <p className="font-medium text-amber-900 dark:text-amber-100">CSV Format Note</p>
            <p className="text-amber-800 dark:text-amber-200 mt-1">
              CSV exports contain <strong>raw transactions only</strong>. CSV format doesn't support multiple sheets. 
              For Monthly Summary and Quality Report, please use <strong>XLSX format</strong> or select <strong>Both</strong> to get complete data.
            </p>
          </div>
        </div>
      )}

      {selectedFormat === 'both' && (
        <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-start gap-2 animate-fade-in">
          <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm">
            <p className="font-medium text-blue-900 dark:text-blue-100">Exporting Both Formats</p>
            <p className="text-blue-800 dark:text-blue-200 mt-1">
              You'll receive 2 files: <strong>.xlsx</strong> with all 3 sheets (Raw, Monthly, Quality) and <strong>.csv</strong> with raw transactions.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Raw Transactions Sheet Preview */}
        <div className="border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Table className="w-4 h-4 text-primary" />
            <span className="font-medium text-sm">Raw_Transactions</span>
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-success/10 text-success">
              All formats
            </span>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>{transactions.length} rows</p>
            <p>{transactions.filter(t => t.confidence_score < 0.8).length} highlighted yellow</p>
            <p>Columns: Date, Description, Dr, Cr, Balance</p>
          </div>
        </div>

        {/* Monthly Summary Sheet Preview */}
        <div className={`border rounded-lg p-4 ${selectedFormat === 'csv' ? 'border-amber-500/30 bg-amber-500/5' : 'border-border'}`}>
          <div className="flex items-center gap-2 mb-3">
            <FileSpreadsheet className="w-4 h-4 text-primary" />
            <span className="font-medium text-sm">Monthly_Summary</span>
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              XLSX only
            </span>
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
        <div className={`border rounded-lg p-4 ${selectedFormat === 'csv' ? 'border-amber-500/30 bg-amber-500/5' : 'border-border'}`}>
          <div className="flex items-center gap-2 mb-3">
            <ClipboardCheck className="w-4 h-4 text-primary" />
            <span className="font-medium text-sm">Quality_Report</span>
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              XLSX only
            </span>
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