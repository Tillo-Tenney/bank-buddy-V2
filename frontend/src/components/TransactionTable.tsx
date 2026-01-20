// import { useState } from 'react';
// import { Transaction } from '@/types/transaction';
// import { AlertTriangle, CheckCircle, ChevronDown, ChevronUp, ExternalLink, Download, Flag, CheckSquare, Square } from 'lucide-react';
// import { cn } from '@/lib/utils';
// import { TransactionDetailModal } from './TransactionDetailModal';

// interface TransactionTableProps {
//   transactions: Transaction[];
//   filterType?: 'credit' | 'debit' | 'flagged' | null;
//   onClearFilter?: () => void;
// }

// const formatCurrency = (amount: number | null) => {
//   if (amount === null || amount === 0) return '-';
//   return new Intl.NumberFormat('en-IN', {
//     style: 'currency',
//     currency: 'INR',
//     minimumFractionDigits: 2,
//   }).format(amount);
// };

// const formatDate = (dateStr: string) => {
//   const date = new Date(dateStr);
//   return date.toLocaleDateString('en-IN', {
//     day: '2-digit',
//     month: 'short',
//     year: 'numeric',
//   });
// };

// const ConfidenceIndicator = ({ score }: { score: number }) => {
//   const percentage = Math.round(score * 100);
//   const color = score >= 0.9 ? 'bg-success' : score >= 0.7 ? 'bg-warning' : 'bg-destructive';
  
//   return (
//     <div className="flex items-center gap-2">
//       <div className="confidence-bar w-16">
//         <div className={cn('confidence-fill', color)} style={{ width: `${percentage}%` }} />
//       </div>
//       <span className="text-xs font-mono text-muted-foreground">{percentage}%</span>
//     </div>
//   );
// };

// export const TransactionTable = ({ transactions, filterType, onClearFilter }: TransactionTableProps) => {
//   const [sortField, setSortField] = useState<'txn_date' | 'balance' | 'debit_amount' | 'credit_amount'>('txn_date');
//   const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
//   const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  
//   // Feature 4: Batch Selection State
//   const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

//   const filteredTransactions = transactions.filter(txn => {
//     if (!filterType) return true;
//     if (filterType === 'credit') return txn.credit_amount !== null && txn.credit_amount > 0;
//     if (filterType === 'debit') return txn.debit_amount !== null && txn.debit_amount > 0;
//     if (filterType === 'flagged') return txn.is_flagged;
//     return true;
//   });

//   const sortedTransactions = [...filteredTransactions].sort((a, b) => {
//     let aVal = 0;
//     let bVal = 0;

//     if (sortField === 'txn_date') {
//       aVal = new Date(a.txn_date).getTime();
//       bVal = new Date(b.txn_date).getTime();
//     } else if (sortField === 'balance') {
//       aVal = a.balance;
//       bVal = b.balance;
//     } else if (sortField === 'debit_amount') {
//       aVal = a.debit_amount || 0;
//       bVal = b.debit_amount || 0;
//     } else if (sortField === 'credit_amount') {
//       aVal = a.credit_amount || 0;
//       bVal = b.credit_amount || 0;
//     }

//     return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
//   });

//   const handleSort = (field: 'txn_date' | 'balance' | 'debit_amount' | 'credit_amount') => {
//     if (sortField === field) {
//       setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
//     } else {
//       setSortField(field);
//       setSortDir('asc');
//     }
//   };

//   const SortIcon = ({ field }: { field: 'txn_date' | 'balance' | 'debit_amount' | 'credit_amount' }) => {
//     if (sortField !== field) return null;
//     return sortDir === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
//   };

//   // Feature 4: Selection Logic
//   const toggleSelection = (id: string) => {
//     const newSelected = new Set(selectedIds);
//     if (newSelected.has(id)) newSelected.delete(id);
//     else newSelected.add(id);
//     setSelectedIds(newSelected);
//   };

//   const toggleSelectAll = () => {
//     if (selectedIds.size === sortedTransactions.length) setSelectedIds(new Set());
//     else setSelectedIds(new Set(sortedTransactions.map(t => t.id)));
//   };

//   const handleBulkExport = () => {
//     const selectedTxns = transactions.filter(t => selectedIds.has(t.id));
//     if (selectedTxns.length === 0) return;
    
//     // Simple CSV export
//     const headers = ['Date', 'Description', 'Debit', 'Credit', 'Balance'];
//     const csvContent = [
//       headers.join(','),
//       ...selectedTxns.map(t => [
//         t.txn_date, 
//         `"${t.description.replace(/"/g, '""')}"`, 
//         t.debit_amount || 0, 
//         t.credit_amount || 0, 
//         t.balance
//       ].join(','))
//     ].join('\n');

//     const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
//     const link = document.createElement('a');
//     link.href = URL.createObjectURL(blob);
//     link.download = `selected_transactions_${new Date().toISOString()}.csv`;
//     link.click();
//   };

//   const getPreviousBalance = (txn: Transaction): number | null => {
//     const sortedByDate = [...transactions].sort((a, b) => 
//       new Date(a.txn_date).getTime() - new Date(b.txn_date).getTime()
//     );
//     const currentIndex = sortedByDate.findIndex(t => t.id === txn.id);
//     if (currentIndex <= 0) return null;
//     return sortedByDate[currentIndex - 1].balance;
//   };

//   return (
//     <div className="glass-card rounded-xl overflow-hidden animate-fade-in flex flex-col h-full">
//       {/* Filters & Bulk Actions */}
//       <div className="px-6 py-3 bg-primary/5 border-b border-border flex items-center justify-between">
//         <div className="flex items-center gap-4">
//           {filterType && (
//             <span className="text-sm font-medium">
//               Showing {filterType === 'credit' ? 'credit' : filterType === 'debit' ? 'debit' : 'flagged'} transactions 
//               ({filteredTransactions.length} of {transactions.length})
//               <button onClick={onClearFilter} className="ml-2 text-primary hover:underline">Clear</button>
//             </span>
//           )}
//           {/* Feature 4: Bulk Actions UI */}
//           {selectedIds.size > 0 && (
//             <div className="flex items-center gap-2 animate-fade-in">
//               <span className="text-sm font-semibold bg-primary/10 px-2 py-1 rounded text-primary">
//                 {selectedIds.size} Selected
//               </span>
//               <button 
//                 onClick={handleBulkExport}
//                 className="flex items-center gap-1 text-xs bg-card border border-border px-2 py-1 rounded hover:bg-muted"
//               >
//                 <Download className="w-3 h-3" /> Export
//               </button>
//               <button className="flex items-center gap-1 text-xs bg-card border border-border px-2 py-1 rounded hover:bg-muted text-warning">
//                 <Flag className="w-3 h-3" /> Flag
//               </button>
//             </div>
//           )}
//         </div>
//       </div>
      
//       <div className="overflow-auto flex-1">
//         <table className="w-full">
//           <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-sm">
//             <tr className="border-b border-border">
//               {/* Checkbox Column */}
//               <th className="px-4 py-4 w-10">
//                 <button onClick={toggleSelectAll} className="flex items-center justify-center text-muted-foreground hover:text-primary">
//                   {selectedIds.size > 0 && selectedIds.size === sortedTransactions.length ? 
//                     <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
//                 </button>
//               </th>
//               <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
//                 Status
//               </th>
//               <th 
//                 className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground"
//                 onClick={() => handleSort('txn_date')}
//               >
//                 <div className="flex items-center gap-1">
//                   Date
//                   <SortIcon field="txn_date" />
//                 </div>
//               </th>
//               <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
//                 Description
//               </th>
//               <th 
//                 className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground"
//                 onClick={() => handleSort('debit_amount')}
//               >
//                 <div className="flex items-center justify-end gap-1">
//                   Debit
//                   <SortIcon field="debit_amount" />
//                 </div>
//               </th>
//               <th 
//                 className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground"
//                 onClick={() => handleSort('credit_amount')}
//               >
//                 <div className="flex items-center justify-end gap-1">
//                   Credit
//                   <SortIcon field="credit_amount" />
//                 </div>
//               </th>
//               <th 
//                 className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground"
//                 onClick={() => handleSort('balance')}
//               >
//                 <div className="flex items-center justify-end gap-1">
//                   Balance
//                   <SortIcon field="balance" />
//                 </div>
//               </th>
//               <th className="px-6 py-4 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
//                 Confidence
//               </th>
//             </tr>
//           </thead>
//           <tbody className="divide-y divide-border">
//             {sortedTransactions.map((txn) => (
//               <tr 
//                 key={txn.id} 
//                 className={cn(
//                   'data-table-row cursor-pointer',
//                   txn.is_flagged && 'flagged',
//                   selectedIds.has(txn.id) && 'bg-primary/5'
//                 )}
//                 onClick={(e) => {
//                   if ((e.target as HTMLElement).closest('button')) return;
//                   setSelectedTransaction(txn);
//                 }}
//               >
//                 <td className="px-4 py-4">
//                   <button 
//                     onClick={(e) => { e.stopPropagation(); toggleSelection(txn.id); }}
//                     className={cn("flex items-center justify-center", selectedIds.has(txn.id) ? "text-primary" : "text-muted-foreground")}
//                   >
//                     {selectedIds.has(txn.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
//                   </button>
//                 </td>
//                 <td className="px-6 py-4">
//                   {txn.is_flagged ? (
//                     <div className="badge-warning">
//                       <AlertTriangle className="w-3 h-3" />
//                       Flagged
//                     </div>
//                   ) : (
//                     <div className="badge-success">
//                       <CheckCircle className="w-3 h-3" />
//                       Valid
//                     </div>
//                   )}
//                 </td>
//                 <td className="px-6 py-4 font-mono text-sm">
//                   {formatDate(txn.txn_date)}
//                 </td>
//                 <td className="px-6 py-4 text-sm max-w-xs truncate" title={txn.description}>
//                   {txn.description}
//                 </td>
//                 <td className="px-6 py-4 text-right font-mono text-sm text-destructive">
//                   {formatCurrency(txn.debit_amount)}
//                 </td>
//                 <td className="px-6 py-4 text-right font-mono text-sm text-success">
//                   {formatCurrency(txn.credit_amount)}
//                 </td>
//                 <td className="px-6 py-4 text-right font-mono text-sm font-medium">
//                   {formatCurrency(txn.balance)}
//                 </td>
//                 <td className="px-6 py-4">
//                   <div className="flex items-center gap-2">
//                     <ConfidenceIndicator score={txn.confidence_score} />
//                     <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
//                   </div>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>

//       <TransactionDetailModal 
//         transaction={selectedTransaction}
//         previousBalance={selectedTransaction ? getPreviousBalance(selectedTransaction) : null}
//         onClose={() => setSelectedTransaction(null)}
//       />
//     </div>
//   );
// };



import { useState } from 'react';
import { Transaction } from '@/types/transaction';
import { AlertTriangle, CheckCircle, ChevronDown, ChevronUp, ExternalLink, Download, Flag, CheckSquare, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TransactionDetailModal } from './TransactionDetailModal';

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
  const [sortField, setSortField] = useState<'txn_date' | 'balance' | 'debit_amount' | 'credit_amount'>('txn_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredTransactions = transactions.filter(txn => {
    if (!filterType) return true;
    if (filterType === 'credit') return txn.credit_amount !== null && txn.credit_amount > 0;
    if (filterType === 'debit') return txn.debit_amount !== null && txn.debit_amount > 0;
    if (filterType === 'flagged') return txn.is_flagged;
    return true;
  });

  // const sortedTransactions = [...filteredTransactions].sort((a, b) => {
  //   let aVal: number;
  //   let bVal: number;

  //   if (sortField === 'txn_date') {
  //     aVal = new Date(a.txn_date).getTime();
  //     bVal = new Date(b.txn_date).getTime();
  //   } else if (sortField === 'balance') {
  //     aVal = a.balance ?? 0;
  //     bVal = b.balance ?? 0;
  //   } else if (sortField === 'debit_amount') {
  //     aVal = a.debit_amount ?? 0;
  //     bVal = b.debit_amount ?? 0;
  //   } else if (sortField === 'credit_amount') {
  //     aVal = a.credit_amount ?? 0;
  //     bVal = b.credit_amount ?? 0;
  //   } else {
  //     return 0;
  //   }

  //   if (isNaN(aVal)) aVal = 0;
  //   if (isNaN(bVal)) bVal = 0;

  //   const result = aVal - bVal;
  //   return sortDir === 'asc' ? result : -result;
  // });

  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
  let aVal: number;
  let bVal: number;

  if (sortField === 'txn_date') {
    // Ensure we parse dates correctly
    const dateA = new Date(a.txn_date);
    const dateB = new Date(b.txn_date);
    
    // Check for invalid dates
    aVal = isNaN(dateA.getTime()) ? 0 : dateA.getTime();
    bVal = isNaN(dateB.getTime()) ? 0 : dateB.getTime();
  } else if (sortField === 'balance') {
    // Ensure balance is a number
    aVal = typeof a.balance === 'number' ? a.balance : parseFloat(String(a.balance)) || 0;
    bVal = typeof b.balance === 'number' ? b.balance : parseFloat(String(b.balance)) || 0;
  } else if (sortField === 'debit_amount') {
    // Handle null and convert to number
    const debitA = a.debit_amount ?? 0;
    const debitB = b.debit_amount ?? 0;
    aVal = typeof debitA === 'number' ? debitA : parseFloat(String(debitA)) || 0;
    bVal = typeof debitB === 'number' ? debitB : parseFloat(String(debitB)) || 0;
  } else if (sortField === 'credit_amount') {
    // Handle null and convert to number
    const creditA = a.credit_amount ?? 0;
    const creditB = b.credit_amount ?? 0;
    aVal = typeof creditA === 'number' ? creditA : parseFloat(String(creditA)) || 0;
    bVal = typeof creditB === 'number' ? creditB : parseFloat(String(creditB)) || 0;
  } else {
    return 0;
  }

  // Final safety check for NaN
  if (isNaN(aVal)) aVal = 0;
  if (isNaN(bVal)) bVal = 0;

  const result = aVal - bVal;
  return sortDir === 'asc' ? result : -result;
});

  // Debug logging - you can remove this after testing
  console.log('[SORT DEBUG] Field:', sortField, 'Direction:', sortDir);
  console.log('[SORT DEBUG] Sample transaction:', filteredTransactions[0]);
  console.log('[SORT DEBUG] Sorted count:', sortedTransactions.length);

  const handleSort = (field: 'txn_date' | 'balance' | 'debit_amount' | 'credit_amount') => {
    console.log(`[SORT] Clicked: ${field}, Current: ${sortField}, Dir: ${sortDir}`);
    
    if (sortField === field) {
      const newDir = sortDir === 'asc' ? 'desc' : 'asc';
      setSortDir(newDir);
      console.log(`[SORT] Toggling direction to: ${newDir}`);
    } else {
      setSortField(field);
      setSortDir('asc');
      console.log(`[SORT] New field: ${field}, direction: asc`);
    }
  };

  const SortIcon = ({ field }: { field: 'txn_date' | 'balance' | 'debit_amount' | 'credit_amount' }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sortedTransactions.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(sortedTransactions.map(t => t.id)));
  };

  const handleBulkExport = () => {
    const selectedTxns = transactions.filter(t => selectedIds.has(t.id));
    if (selectedTxns.length === 0) return;
    
    const headers = ['Date', 'Description', 'Debit', 'Credit', 'Balance'];
    const csvContent = [
      headers.join(','),
      ...selectedTxns.map(t => [
        t.txn_date, 
        `"${t.description.replace(/"/g, '""')}"`, 
        t.debit_amount || 0, 
        t.credit_amount || 0, 
        t.balance
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `selected_transactions_${new Date().toISOString()}.csv`;
    link.click();
  };

  const getPreviousBalance = (txn: Transaction): number | null => {
    const sortedByDate = [...transactions].sort((a, b) => 
      new Date(a.txn_date).getTime() - new Date(b.txn_date).getTime()
    );
    const currentIndex = sortedByDate.findIndex(t => t.id === txn.id);
    if (currentIndex <= 0) return null;
    return sortedByDate[currentIndex - 1].balance;
  };

  return (
    <div className="glass-card rounded-xl overflow-hidden animate-fade-in flex flex-col h-full">
      <div className="px-6 py-3 bg-primary/5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-4">
          {filterType && (
            <span className="text-sm font-medium">
              Showing {filterType === 'credit' ? 'credit' : filterType === 'debit' ? 'debit' : 'flagged'} transactions 
              ({filteredTransactions.length} of {transactions.length})
              <button onClick={onClearFilter} className="ml-2 text-primary hover:underline">Clear</button>
            </span>
          )}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 animate-fade-in">
              <span className="text-sm font-semibold bg-primary/10 px-2 py-1 rounded text-primary">
                {selectedIds.size} Selected
              </span>
              <button 
                onClick={handleBulkExport}
                className="flex items-center gap-1 text-xs bg-card border border-border px-2 py-1 rounded hover:bg-muted"
              >
                <Download className="w-3 h-3" /> Export
              </button>
              <button className="flex items-center gap-1 text-xs bg-card border border-border px-2 py-1 rounded hover:bg-muted text-warning">
                <Flag className="w-3 h-3" /> Flag
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className="overflow-auto flex-1">
        <table className="w-full">
          <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur-sm">
            <tr className="border-b border-border">
              <th className="px-4 py-4 w-10">
                <button onClick={toggleSelectAll} className="flex items-center justify-center text-muted-foreground hover:text-primary">
                  {selectedIds.size > 0 && selectedIds.size === sortedTransactions.length ? 
                    <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                </button>
              </th>
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
              <th 
                className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground"
                onClick={() => handleSort('debit_amount')}
              >
                <div className="flex items-center justify-end gap-1">
                  Debit
                  <SortIcon field="debit_amount" />
                </div>
              </th>
              <th 
                className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground"
                onClick={() => handleSort('credit_amount')}
              >
                <div className="flex items-center justify-end gap-1">
                  Credit
                  <SortIcon field="credit_amount" />
                </div>
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
                  'data-table-row cursor-pointer',
                  txn.is_flagged && 'flagged',
                  selectedIds.has(txn.id) && 'bg-primary/5'
                )}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('button')) return;
                  setSelectedTransaction(txn);
                }}
              >
                <td className="px-4 py-4">
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleSelection(txn.id); }}
                    className={cn("flex items-center justify-center", selectedIds.has(txn.id) ? "text-primary" : "text-muted-foreground")}
                  >
                    {selectedIds.has(txn.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  </button>
                </td>
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
                  <div className="flex items-center gap-2">
                    <ConfidenceIndicator score={txn.confidence_score} />
                    <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TransactionDetailModal 
        transaction={selectedTransaction}
        previousBalance={selectedTransaction ? getPreviousBalance(selectedTransaction) : null}
        onClose={() => setSelectedTransaction(null)}
      />
    </div>
  );
};