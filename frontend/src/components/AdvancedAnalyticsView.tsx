import { useState, useMemo, useEffect } from 'react';
import { Transaction } from '@/types/transaction';
import { ArrowLeft, TrendingUp, TrendingDown, Calculator, CheckCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MetricCard } from './MetricCard';

interface AdvancedAnalyticsViewProps {
  transactions: Transaction[];
  onBack: () => void;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const AdvancedAnalyticsView = ({ transactions, onBack }: AdvancedAnalyticsViewProps) => {
  const [selectedCredit, setSelectedCredit] = useState<Transaction | null>(null);
  const [targetAmount, setTargetAmount] = useState<string>('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    matchedDebits: Transaction[];
    totalMatched: number;
    difference: number;
    accuracy: number;
  } | null>(null);

  // Filter only valid credit transactions for the selection list
  const creditTransactions = useMemo(() => {
    return transactions
      .filter(t => t.credit_amount !== null && t.credit_amount > 0)
      .sort((a, b) => new Date(b.txn_date).getTime() - new Date(a.txn_date).getTime());
  }, [transactions]);

  // Subset Sum Approximation Algorithm with Confidence Optimization
  const findOptimalDebits = async (target: number, availableDebits: Transaction[]) => {
    // Artificial delay to allow UI to show loading state
    await new Promise(resolve => setTimeout(resolve, 100));

    // Convert to integers (paise) to avoid floating point math issues
    const targetCent = Math.round(target * 100);
    const items = availableDebits
      .map(t => ({ ...t, amountCent: Math.round((t.debit_amount || 0) * 100) }))
      .filter(t => t.amountCent <= targetCent) // Optimization: ignore items larger than target
      .sort((a, b) => b.amountCent - a.amountCent); // Optimization: sort descending

    let bestSum = 0;
    let bestSubset: typeof items = [];
    let bestAvgConfidence = 0;
    
    const maxIterations = 20000; // Safety break to prevent browser freeze
    let iterations = 0;

    // Helper to calculate average confidence of a subset
    const getAvgConfidence = (subset: typeof items) => {
      if (subset.length === 0) return 0;
      return subset.reduce((sum, item) => sum + item.confidence_score, 0) / subset.length;
    };

    // Recursive solver with pruning
    const search = (index: number, currentSum: number, currentSubset: typeof items) => {
      iterations++;
      
      // Update best result logic
      // Priority 1: Closer Sum (Higher currentSum <= targetCent)
      // Priority 2: Higher Confidence (If sums are equal, pick better confidence)
      if (currentSum <= targetCent) {
        let isBetter = false;
        
        if (currentSum > bestSum) {
          isBetter = true;
        } else if (currentSum === bestSum) {
          // Tie-breaker: Check confidence
          const currentAvgConf = getAvgConfidence(currentSubset);
          if (currentAvgConf > bestAvgConfidence) {
            isBetter = true;
          }
        }

        if (isBetter) {
          bestSum = currentSum;
          bestSubset = [...currentSubset];
          bestAvgConfidence = getAvgConfidence(currentSubset);
        }
      }

      // Base cases
      if (currentSum === targetCent) return true; // Perfect match found
      if (index >= items.length || iterations > maxIterations) return false;

      // Pruning: If adding this item exceeds target, skip it
      if (currentSum + items[index].amountCent <= targetCent) {
        search(index + 1, currentSum + items[index].amountCent, [...currentSubset, items[index]]);
      }

      // Try excluding this item
      search(index + 1, currentSum, currentSubset);

      return false;
    };

    search(0, 0, []);

    return {
      matchedDebits: bestSubset,
      totalMatched: bestSum / 100
    };
  };

  const runAnalysis = (creditTxn: Transaction, targetVal: number) => {
    setIsCalculating(true);
      
    // 1. Filter debits that happened ON or AFTER the selected credit
    const selectedDate = new Date(creditTxn.txn_date);
    selectedDate.setHours(0, 0, 0, 0);

    const possibleDebits = transactions.filter(t => {
      const tDate = new Date(t.txn_date);
      tDate.setHours(0, 0, 0, 0);
      
      // Condition: Happened after (or same day) AND Less than (or equal) to TARGET amount
      const isAfter = tDate >= selectedDate;
      const isLessOrEqual = (t.debit_amount || 0) <= targetVal;
      
      return t.debit_amount !== null && t.debit_amount > 0 && isAfter && isLessOrEqual;
    });

    // 2. Run the math logic
    findOptimalDebits(targetVal, possibleDebits).then(result => {
      // Sort the result based on date field for better understanding
      const sortedMatches = [...result.matchedDebits].sort((a, b) => 
        new Date(a.txn_date).getTime() - new Date(b.txn_date).getTime()
      );

      setAnalysisResult({
        matchedDebits: sortedMatches,
        totalMatched: result.totalMatched,
        difference: targetVal - result.totalMatched,
        accuracy: targetVal > 0 ? (result.totalMatched / targetVal) * 100 : 0
      });
      setIsCalculating(false);
    });
  };

  // Trigger default analysis when a credit is selected
  useEffect(() => {
    if (selectedCredit && selectedCredit.credit_amount) {
      setTargetAmount(selectedCredit.credit_amount.toString());
      runAnalysis(selectedCredit, selectedCredit.credit_amount);
    }
  }, [selectedCredit]);

  const handleRecalculate = () => {
    if (selectedCredit && targetAmount) {
      const val = parseFloat(targetAmount);
      if (!isNaN(val) && val > 0) {
        runAnalysis(selectedCredit, val);
      }
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            Credit Utilization Analyzer
          </h2>
          <p className="text-sm text-muted-foreground">Select a credit record to identify corresponding debit transactions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Credit Selector */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">1. Select Credit Record</h3>
          <div className="glass-card rounded-xl overflow-hidden border border-border/50 max-h-[600px] flex flex-col">
            <div className="overflow-y-auto p-2 space-y-2">
              {creditTransactions.map(txn => (
                <div
                  key={txn.id}
                  onClick={() => setSelectedCredit(txn)}
                  className={cn(
                    "p-3 rounded-lg cursor-pointer border transition-all hover:bg-muted/50",
                    selectedCredit?.id === txn.id 
                      ? "bg-primary/10 border-primary shadow-sm" 
                      : "bg-card border-border/50"
                  )}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-mono text-xs text-muted-foreground">{formatDate(txn.txn_date)}</span>
                    <span className="font-bold text-success">{formatCurrency(txn.credit_amount!)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2" title={txn.description}>
                    {txn.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Analysis Results */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">2. Analysis Result</h3>
          </div>
          
          {!selectedCredit ? (
            <div className="glass-card rounded-xl p-12 flex flex-col items-center justify-center text-center h-[400px] border-dashed">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <TrendingUp className="w-8 h-8 text-muted-foreground" />
              </div>
              <h4 className="text-lg font-medium">No Credit Selected</h4>
              <p className="text-muted-foreground max-w-sm mt-2">
                Choose a credit transaction from the left panel to analyze which future debits might have consumed that amount.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Configuration Panel */}
              <div className="glass-card rounded-xl p-4 border border-border/50 bg-card/50">
                <div className="flex items-end gap-4">
                  <div className="flex-1 space-y-1.5">
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Expected Debit Total
                    </label>
                    <input
                      type="number"
                      value={targetAmount}
                      onChange={(e) => setTargetAmount(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Enter amount to match"
                    />
                    <p className="text-[0.8rem] text-muted-foreground">
                      Defaults to selected credit amount. Adjust to find partial matches.
                    </p>
                  </div>
                  <Button 
                    onClick={handleRecalculate} 
                    disabled={isCalculating || !targetAmount}
                    className="mb-0.5 gap-2"
                  >
                    {isCalculating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Recalculate
                  </Button>
                </div>
              </div>

              {isCalculating ? (
                <div className="glass-card rounded-xl p-12 flex flex-col items-center justify-center text-center h-[300px]">
                  <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                  <h4 className="text-lg font-medium">Analyzing Transactions...</h4>
                  <p className="text-muted-foreground">Finding optimal debit combination...</p>
                </div>
              ) : analysisResult ? (
                <div className="space-y-6 animate-slide-up">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <MetricCard
                      title="Target Amount"
                      value={formatCurrency(parseFloat(targetAmount) || 0)}
                      icon={<TrendingUp className="w-5 h-5" />}
                      trend="neutral"
                      subtitle="Expected Utilization"
                    />
                    <MetricCard
                      title="Matched Debits Total"
                      value={formatCurrency(analysisResult.totalMatched)}
                      icon={<TrendingDown className="w-5 h-5" />}
                      trend={analysisResult.difference === 0 ? "positive" : "neutral"}
                      subtitle={`${analysisResult.matchedDebits.length} transactions found`}
                    />
                    <MetricCard
                      title="Remaining / Unmatched"
                      value={formatCurrency(analysisResult.difference)}
                      icon={<AlertCircle className="w-5 h-5" />}
                      trend={analysisResult.difference === 0 ? "positive" : "negative"}
                      subtitle={`Match Accuracy: ${analysisResult.accuracy.toFixed(2)}%`}
                    />
                  </div>

                  {/* Matched Transactions Table */}
                  <div className="glass-card rounded-xl overflow-hidden">
                    <div className="p-4 bg-muted/30 border-b border-border flex justify-between items-center">
                      <h4 className="font-semibold flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-success" />
                        Probable Debit Transactions
                      </h4>
                      <span className="text-xs text-muted-foreground">
                        Sorted by date | High confidence preferred
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/20">
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
                            <th className="px-4 py-3 text-center font-medium text-muted-foreground">Confidence</th>
                            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Debit Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {analysisResult.matchedDebits.map(txn => (
                            <tr key={txn.id} className="hover:bg-muted/30">
                              <td className="px-4 py-3 font-mono text-xs">{formatDate(txn.txn_date)}</td>
                              <td className="px-4 py-3 max-w-[250px] truncate" title={txn.description}>{txn.description}</td>
                              <td className="px-4 py-3 text-center">
                                <span className={cn(
                                  "text-xs px-2 py-0.5 rounded-full font-mono",
                                  txn.confidence_score >= 0.9 ? "bg-success/10 text-success" :
                                  txn.confidence_score >= 0.7 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"
                                )}>
                                  {(txn.confidence_score * 100).toFixed(0)}%
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-destructive">
                                {formatCurrency(txn.debit_amount!)}
                              </td>
                            </tr>
                          ))}
                          {analysisResult.matchedDebits.length === 0 && (
                            <tr>
                              <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                                No debit transactions found that fit within this amount after the selected date.
                              </td>
                            </tr>
                          )}
                        </tbody>
                        <tfoot className="bg-muted/20 font-medium">
                          <tr>
                            <td colSpan={3} className="px-4 py-3 text-right">Total Matched:</td>
                            <td className="px-4 py-3 text-right text-destructive">{formatCurrency(analysisResult.totalMatched)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};









// import { useState, useMemo, useEffect } from 'react';
// import { Transaction } from '@/types/transaction';
// import { ArrowLeft, TrendingUp, TrendingDown, Calculator, CheckCircle, AlertCircle, Loader2, Shield } from 'lucide-react';
// import { Button } from '@/components/ui/button';
// import { cn } from '@/lib/utils';
// import { MetricCard } from './MetricCard';

// interface AdvancedAnalyticsViewProps {
//   transactions: Transaction[];
//   onBack: () => void;
// }

// const formatCurrency = (amount: number) => {
//   return new Intl.NumberFormat('en-IN', {
//     style: 'currency',
//     currency: 'INR',
//     minimumFractionDigits: 2,
//   }).format(amount);
// };

// const formatDate = (dateStr: string) => {
//   return new Date(dateStr).toLocaleDateString('en-IN', {
//     day: '2-digit',
//     month: 'short',
//     year: 'numeric',
//   });
// };

// export const AdvancedAnalyticsView = ({ transactions, onBack }: AdvancedAnalyticsViewProps) => {
//   const [selectedCredit, setSelectedCredit] = useState<Transaction | null>(null);
//   const [isCalculating, setIsCalculating] = useState(false);
//   const [analysisResult, setAnalysisResult] = useState<{
//     matchedDebits: Transaction[];
//     totalMatched: number;
//     difference: number;
//     accuracy: number;
//   } | null>(null);

//   // Filter only valid credit transactions for the selection list
//   const creditTransactions = useMemo(() => {
//     return transactions
//       .filter(t => t.credit_amount !== null && t.credit_amount > 0)
//       .sort((a, b) => new Date(b.txn_date).getTime() - new Date(a.txn_date).getTime());
//   }, [transactions]);

//   // Subset Sum Approximation Algorithm with Confidence Optimization
//   const findOptimalDebits = async (target: number, availableDebits: Transaction[]) => {
//     // Artificial delay to allow UI to show loading state
//     await new Promise(resolve => setTimeout(resolve, 100));

//     // Convert to integers (paise) to avoid floating point math issues
//     const targetCent = Math.round(target * 100);
//     const items = availableDebits
//       .map(t => ({ ...t, amountCent: Math.round((t.debit_amount || 0) * 100) }))
//       .filter(t => t.amountCent <= targetCent) // Optimization: ignore items larger than target
//       .sort((a, b) => b.amountCent - a.amountCent); // Optimization: sort descending

//     let bestSum = 0;
//     let bestSubset: typeof items = [];
//     let bestAvgConfidence = 0;
    
//     const maxIterations = 20000; // Safety break to prevent browser freeze
//     let iterations = 0;

//     // Helper to calculate average confidence of a subset
//     const getAvgConfidence = (subset: typeof items) => {
//       if (subset.length === 0) return 0;
//       return subset.reduce((sum, item) => sum + item.confidence_score, 0) / subset.length;
//     };

//     // Recursive solver with pruning
//     const search = (index: number, currentSum: number, currentSubset: typeof items) => {
//       iterations++;
      
//       // Update best result logic
//       // Priority 1: Closer Sum (Higher currentSum <= targetCent)
//       // Priority 2: Higher Confidence (If sums are equal, pick better confidence)
//       if (currentSum <= targetCent) {
//         let isBetter = false;
        
//         if (currentSum > bestSum) {
//           isBetter = true;
//         } else if (currentSum === bestSum) {
//           // Tie-breaker: Check confidence
//           const currentAvgConf = getAvgConfidence(currentSubset);
//           if (currentAvgConf > bestAvgConfidence) {
//             isBetter = true;
//           }
//         }

//         if (isBetter) {
//           bestSum = currentSum;
//           bestSubset = [...currentSubset];
//           bestAvgConfidence = getAvgConfidence(currentSubset);
//         }
//       }

//       // Base cases
//       if (currentSum === targetCent) return true; // Perfect match found (Confidence tie-breaker logic above handles exact matches found later if they are better)
//       if (index >= items.length || iterations > maxIterations) return false;

//       // Pruning: If adding this item exceeds target, skip it
//       if (currentSum + items[index].amountCent <= targetCent) {
//         // Optimization: Pass currentAvgConfidence down if needed, but calculating on update is safer
//         search(index + 1, currentSum + items[index].amountCent, [...currentSubset, items[index]]);
//       }

//       // Try excluding this item
//       // Optimization: Only skip if we haven't found a very close match yet
//       search(index + 1, currentSum, currentSubset);

//       return false;
//     };

//     search(0, 0, []);

//     return {
//       matchedDebits: bestSubset,
//       totalMatched: bestSum / 100
//     };
//   };

//   useEffect(() => {
//     if (selectedCredit) {
//       setIsCalculating(true);
      
//       // 1. Filter debits that happened ON or AFTER the selected credit
//       const selectedDate = new Date(selectedCredit.txn_date);
//       // Reset time part to ensure we compare dates correctly (optional, but safer for "happened after")
//       selectedDate.setHours(0, 0, 0, 0);

//       const possibleDebits = transactions.filter(t => {
//         const tDate = new Date(t.txn_date);
//         tDate.setHours(0, 0, 0, 0);
        
//         // Condition: Happened after (or same day) AND Less than (or equal) to credit amount
//         const isAfter = tDate >= selectedDate;
//         const isLessOrEqual = (t.debit_amount || 0) <= selectedCredit.credit_amount!;
        
//         return t.debit_amount !== null && t.debit_amount > 0 && isAfter && isLessOrEqual;
//       });

//       // 2. Run the math logic
//       findOptimalDebits(selectedCredit.credit_amount!, possibleDebits).then(result => {
//         // Sort the result based on date field for better understanding
//         const sortedMatches = [...result.matchedDebits].sort((a, b) => 
//           new Date(a.txn_date).getTime() - new Date(b.txn_date).getTime()
//         );

//         setAnalysisResult({
//           matchedDebits: sortedMatches,
//           totalMatched: result.totalMatched,
//           difference: selectedCredit.credit_amount! - result.totalMatched,
//           accuracy: (result.totalMatched / selectedCredit.credit_amount!) * 100
//         });
//         setIsCalculating(false);
//       });
//     }
//   }, [selectedCredit, transactions]);

//   return (
//     <div className="animate-fade-in space-y-6">
//       {/* Header */}
//       <div className="flex items-center gap-4">
//         <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
//           <ArrowLeft className="w-4 h-4" />
//           Back to Dashboard
//         </Button>
//         <div>
//           <h2 className="text-xl font-semibold flex items-center gap-2">
//             <Calculator className="w-5 h-5 text-primary" />
//             Credit Utilization Analyzer
//           </h2>
//           <p className="text-sm text-muted-foreground">Select a credit record to identify corresponding debit transactions</p>
//         </div>
//       </div>

//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//         {/* Left Column: Credit Selector */}
//         <div className="lg:col-span-1 space-y-4">
//           <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">1. Select Credit Record</h3>
//           <div className="glass-card rounded-xl overflow-hidden border border-border/50 max-h-[600px] flex flex-col">
//             <div className="overflow-y-auto p-2 space-y-2">
//               {creditTransactions.map(txn => (
//                 <div
//                   key={txn.id}
//                   onClick={() => setSelectedCredit(txn)}
//                   className={cn(
//                     "p-3 rounded-lg cursor-pointer border transition-all hover:bg-muted/50",
//                     selectedCredit?.id === txn.id 
//                       ? "bg-primary/10 border-primary shadow-sm" 
//                       : "bg-card border-border/50"
//                   )}
//                 >
//                   <div className="flex justify-between items-start mb-1">
//                     <span className="font-mono text-xs text-muted-foreground">{formatDate(txn.txn_date)}</span>
//                     <span className="font-bold text-success">{formatCurrency(txn.credit_amount!)}</span>
//                   </div>
//                   <p className="text-xs text-muted-foreground line-clamp-2" title={txn.description}>
//                     {txn.description}
//                   </p>
//                 </div>
//               ))}
//             </div>
//           </div>
//         </div>

//         {/* Right Column: Analysis Results */}
//         <div className="lg:col-span-2 space-y-4">
//           <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">2. Analysis Result</h3>
          
//           {!selectedCredit ? (
//             <div className="glass-card rounded-xl p-12 flex flex-col items-center justify-center text-center h-[400px] border-dashed">
//               <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
//                 <TrendingUp className="w-8 h-8 text-muted-foreground" />
//               </div>
//               <h4 className="text-lg font-medium">No Credit Selected</h4>
//               <p className="text-muted-foreground max-w-sm mt-2">
//                 Choose a credit transaction from the left panel to analyze which future debits might have consumed that amount.
//               </p>
//             </div>
//           ) : isCalculating ? (
//             <div className="glass-card rounded-xl p-12 flex flex-col items-center justify-center text-center h-[400px]">
//               <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
//               <h4 className="text-lg font-medium">Analyzing Transactions...</h4>
//               <p className="text-muted-foreground">Finding optimal debit combination for {formatCurrency(selectedCredit.credit_amount!)}</p>
//             </div>
//           ) : analysisResult ? (
//             <div className="space-y-6 animate-slide-up">
//               {/* Summary Cards */}
//               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//                 <MetricCard
//                   title="Selected Credit"
//                   value={formatCurrency(selectedCredit.credit_amount!)}
//                   icon={<TrendingUp className="w-5 h-5" />}
//                   trend="positive"
//                   subtitle={formatDate(selectedCredit.txn_date)}
//                 />
//                 <MetricCard
//                   title="Matched Debits Total"
//                   value={formatCurrency(analysisResult.totalMatched)}
//                   icon={<TrendingDown className="w-5 h-5" />}
//                   trend="negative"
//                   subtitle={`${analysisResult.matchedDebits.length} transactions found`}
//                 />
//                 <MetricCard
//                   title="Unutilized / Remaining"
//                   value={formatCurrency(analysisResult.difference)}
//                   icon={<AlertCircle className="w-5 h-5" />}
//                   trend="neutral"
//                   subtitle={`Accuracy: ${analysisResult.accuracy.toFixed(2)}%`}
//                 />
//               </div>

//               {/* Matched Transactions Table */}
//               <div className="glass-card rounded-xl overflow-hidden">
//                 <div className="p-4 bg-muted/30 border-b border-border flex justify-between items-center">
//                   <h4 className="font-semibold flex items-center gap-2">
//                     <CheckCircle className="w-4 h-4 text-success" />
//                     Probable Debit Transactions
//                   </h4>
//                   <span className="text-xs text-muted-foreground">
//                     Sorted by date | High confidence preferred
//                   </span>
//                 </div>
//                 <div className="overflow-x-auto">
//                   <table className="w-full text-sm">
//                     <thead>
//                       <tr className="border-b border-border bg-muted/20">
//                         <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
//                         <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
//                         <th className="px-4 py-3 text-center font-medium text-muted-foreground">Confidence</th>
//                         <th className="px-4 py-3 text-right font-medium text-muted-foreground">Debit Amount</th>
//                       </tr>
//                     </thead>
//                     <tbody className="divide-y divide-border">
//                       {analysisResult.matchedDebits.map(txn => (
//                         <tr key={txn.id} className="hover:bg-muted/30">
//                           <td className="px-4 py-3 font-mono text-xs">{formatDate(txn.txn_date)}</td>
//                           <td className="px-4 py-3 max-w-[250px] truncate" title={txn.description}>{txn.description}</td>
//                           <td className="px-4 py-3 text-center">
//                             <span className={cn(
//                               "text-xs px-2 py-0.5 rounded-full font-mono",
//                               txn.confidence_score >= 0.9 ? "bg-success/10 text-success" :
//                               txn.confidence_score >= 0.7 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"
//                             )}>
//                               {(txn.confidence_score * 100).toFixed(0)}%
//                             </span>
//                           </td>
//                           <td className="px-4 py-3 text-right font-mono text-destructive">
//                             {formatCurrency(txn.debit_amount!)}
//                           </td>
//                         </tr>
//                       ))}
//                       {analysisResult.matchedDebits.length === 0 && (
//                         <tr>
//                           <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
//                             No debit transactions found that fit within this credit amount after the selected date.
//                           </td>
//                         </tr>
//                       )}
//                     </tbody>
//                     <tfoot className="bg-muted/20 font-medium">
//                       <tr>
//                         <td colSpan={3} className="px-4 py-3 text-right">Total Matched:</td>
//                         <td className="px-4 py-3 text-right text-destructive">{formatCurrency(analysisResult.totalMatched)}</td>
//                       </tr>
//                     </tfoot>
//                   </table>
//                 </div>
//               </div>
//             </div>
//           ) : null}
//         </div>
//       </div>
//     </div>
//   );
// };









// import { useState, useMemo, useEffect } from 'react';
// import { Transaction } from '@/types/transaction';
// import { ArrowLeft, TrendingUp, TrendingDown, Calculator, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
// import { Button } from '@/components/ui/button';
// import { cn } from '@/lib/utils';
// import { MetricCard } from './MetricCard';

// interface AdvancedAnalyticsViewProps {
//   transactions: Transaction[];
//   onBack: () => void;
// }

// const formatCurrency = (amount: number) => {
//   return new Intl.NumberFormat('en-IN', {
//     style: 'currency',
//     currency: 'INR',
//     minimumFractionDigits: 2,
//   }).format(amount);
// };

// const formatDate = (dateStr: string) => {
//   return new Date(dateStr).toLocaleDateString('en-IN', {
//     day: '2-digit',
//     month: 'short',
//     year: 'numeric',
//   });
// };

// export const AdvancedAnalyticsView = ({ transactions, onBack }: AdvancedAnalyticsViewProps) => {
//   const [selectedCredit, setSelectedCredit] = useState<Transaction | null>(null);
//   const [isCalculating, setIsCalculating] = useState(false);
//   const [analysisResult, setAnalysisResult] = useState<{
//     matchedDebits: Transaction[];
//     totalMatched: number;
//     difference: number;
//     accuracy: number;
//   } | null>(null);

//   // Filter only valid credit transactions for the selection list
//   const creditTransactions = useMemo(() => {
//     return transactions
//       .filter(t => t.credit_amount !== null && t.credit_amount > 0)
//       .sort((a, b) => new Date(b.txn_date).getTime() - new Date(a.txn_date).getTime());
//   }, [transactions]);

//   // Subset Sum Approximation Algorithm
//   const findOptimalDebits = async (target: number, availableDebits: Transaction[]) => {
//     // Artificial delay to allow UI to show loading state
//     await new Promise(resolve => setTimeout(resolve, 100));

//     // Convert to integers (paise) to avoid floating point math issues
//     const targetCent = Math.round(target * 100);
//     const items = availableDebits
//       .map(t => ({ ...t, amountCent: Math.round((t.debit_amount || 0) * 100) }))
//       .filter(t => t.amountCent <= targetCent) // Optimization: ignore items larger than target
//       .sort((a, b) => b.amountCent - a.amountCent); // Optimization: sort descending

//     let bestSum = 0;
//     let bestSubset: typeof items = [];
//     const maxIterations = 20000; // Safety break to prevent browser freeze
//     let iterations = 0;

//     // Recursive solver with pruning
//     const search = (index: number, currentSum: number, currentSubset: typeof items) => {
//       iterations++;
      
//       // Update best result if we found a closer sum
//       if (currentSum > bestSum && currentSum <= targetCent) {
//         bestSum = currentSum;
//         bestSubset = [...currentSubset];
//       }

//       // Base cases
//       if (currentSum === targetCent) return true; // Perfect match found
//       if (index >= items.length || iterations > maxIterations) return false;

//       // Pruning: If adding this item exceeds target, skip it
//       if (currentSum + items[index].amountCent <= targetCent) {
//         if (search(index + 1, currentSum + items[index].amountCent, [...currentSubset, items[index]])) {
//           return true;
//         }
//       }

//       // Try excluding this item
//       // Optimization: Only skip if we haven't found a very close match yet
//       if (search(index + 1, currentSum, currentSubset)) {
//         return true;
//       }

//       return false;
//     };

//     search(0, 0, []);

//     return {
//       matchedDebits: bestSubset,
//       totalMatched: bestSum / 100
//     };
//   };

//   useEffect(() => {
//     if (selectedCredit) {
//       setIsCalculating(true);
      
//       // 1. Filter debits that happened AFTER the selected credit
//       const selectedDate = new Date(selectedCredit.txn_date);
//       const possibleDebits = transactions.filter(t => {
//         const tDate = new Date(t.txn_date);
//         // Strictly debit transactions AND occurred on or after the credit date
//         return t.debit_amount !== null && t.debit_amount > 0 && tDate >= selectedDate;
//       });

//       // 2. Run the math logic
//       findOptimalDebits(selectedCredit.credit_amount!, possibleDebits).then(result => {
//         setAnalysisResult({
//           matchedDebits: result.matchedDebits,
//           totalMatched: result.totalMatched,
//           difference: selectedCredit.credit_amount! - result.totalMatched,
//           accuracy: (result.totalMatched / selectedCredit.credit_amount!) * 100
//         });
//         setIsCalculating(false);
//       });
//     }
//   }, [selectedCredit, transactions]);

//   return (
//     <div className="animate-fade-in space-y-6">
//       {/* Header */}
//       <div className="flex items-center gap-4">
//         <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
//           <ArrowLeft className="w-4 h-4" />
//           Back to Dashboard
//         </Button>
//         <div>
//           <h2 className="text-xl font-semibold flex items-center gap-2">
//             <Calculator className="w-5 h-5 text-primary" />
//             Credit Utilization Analyzer
//           </h2>
//           <p className="text-sm text-muted-foreground">Select a credit record to identify corresponding debit transactions</p>
//         </div>
//       </div>

//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//         {/* Left Column: Credit Selector */}
//         <div className="lg:col-span-1 space-y-4">
//           <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">1. Select Credit Record</h3>
//           <div className="glass-card rounded-xl overflow-hidden border border-border/50 max-h-[600px] flex flex-col">
//             <div className="overflow-y-auto p-2 space-y-2">
//               {creditTransactions.map(txn => (
//                 <div
//                   key={txn.id}
//                   onClick={() => setSelectedCredit(txn)}
//                   className={cn(
//                     "p-3 rounded-lg cursor-pointer border transition-all hover:bg-muted/50",
//                     selectedCredit?.id === txn.id 
//                       ? "bg-primary/10 border-primary shadow-sm" 
//                       : "bg-card border-border/50"
//                   )}
//                 >
//                   <div className="flex justify-between items-start mb-1">
//                     <span className="font-mono text-xs text-muted-foreground">{formatDate(txn.txn_date)}</span>
//                     <span className="font-bold text-success">{formatCurrency(txn.credit_amount!)}</span>
//                   </div>
//                   <p className="text-xs text-muted-foreground line-clamp-2" title={txn.description}>
//                     {txn.description}
//                   </p>
//                 </div>
//               ))}
//             </div>
//           </div>
//         </div>

//         {/* Right Column: Analysis Results */}
//         <div className="lg:col-span-2 space-y-4">
//           <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">2. Analysis Result</h3>
          
//           {!selectedCredit ? (
//             <div className="glass-card rounded-xl p-12 flex flex-col items-center justify-center text-center h-[400px] border-dashed">
//               <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
//                 <TrendingUp className="w-8 h-8 text-muted-foreground" />
//               </div>
//               <h4 className="text-lg font-medium">No Credit Selected</h4>
//               <p className="text-muted-foreground max-w-sm mt-2">
//                 Choose a credit transaction from the left panel to analyze which future debits might have consumed that amount.
//               </p>
//             </div>
//           ) : isCalculating ? (
//             <div className="glass-card rounded-xl p-12 flex flex-col items-center justify-center text-center h-[400px]">
//               <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
//               <h4 className="text-lg font-medium">Analyzing Transactions...</h4>
//               <p className="text-muted-foreground">Finding optimal debit combination for {formatCurrency(selectedCredit.credit_amount!)}</p>
//             </div>
//           ) : analysisResult ? (
//             <div className="space-y-6 animate-slide-up">
//               {/* Summary Cards */}
//               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//                 <MetricCard
//                   title="Selected Credit"
//                   value={formatCurrency(selectedCredit.credit_amount!)}
//                   icon={<TrendingUp className="w-5 h-5" />}
//                   trend="positive"
//                   subtitle={formatDate(selectedCredit.txn_date)}
//                 />
//                 <MetricCard
//                   title="Matched Debits Total"
//                   value={formatCurrency(analysisResult.totalMatched)}
//                   icon={<TrendingDown className="w-5 h-5" />}
//                   trend="negative"
//                   subtitle={`${analysisResult.matchedDebits.length} transactions found`}
//                 />
//                 <MetricCard
//                   title="Unutilized / Remaining"
//                   value={formatCurrency(analysisResult.difference)}
//                   icon={<AlertCircle className="w-5 h-5" />}
//                   trend="neutral"
//                   subtitle={`Accuracy: ${analysisResult.accuracy.toFixed(2)}%`}
//                 />
//               </div>

//               {/* Matched Transactions Table */}
//               <div className="glass-card rounded-xl overflow-hidden">
//                 <div className="p-4 bg-muted/30 border-b border-border flex justify-between items-center">
//                   <h4 className="font-semibold flex items-center gap-2">
//                     <CheckCircle className="w-4 h-4 text-success" />
//                     Probable Debit Transactions
//                   </h4>
//                   <span className="text-xs text-muted-foreground">
//                     Based on nearest sum approximation
//                   </span>
//                 </div>
//                 <div className="overflow-x-auto">
//                   <table className="w-full text-sm">
//                     <thead>
//                       <tr className="border-b border-border bg-muted/20">
//                         <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
//                         <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
//                         <th className="px-4 py-3 text-right font-medium text-muted-foreground">Debit Amount</th>
//                       </tr>
//                     </thead>
//                     <tbody className="divide-y divide-border">
//                       {analysisResult.matchedDebits.map(txn => (
//                         <tr key={txn.id} className="hover:bg-muted/30">
//                           <td className="px-4 py-3 font-mono text-xs">{formatDate(txn.txn_date)}</td>
//                           <td className="px-4 py-3 max-w-[300px] truncate" title={txn.description}>{txn.description}</td>
//                           <td className="px-4 py-3 text-right font-mono text-destructive">
//                             {formatCurrency(txn.debit_amount!)}
//                           </td>
//                         </tr>
//                       ))}
//                       {analysisResult.matchedDebits.length === 0 && (
//                         <tr>
//                           <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
//                             No debit transactions found that fit within this credit amount.
//                           </td>
//                         </tr>
//                       )}
//                     </tbody>
//                     <tfoot className="bg-muted/20 font-medium">
//                       <tr>
//                         <td colSpan={2} className="px-4 py-3 text-right">Total Matched:</td>
//                         <td className="px-4 py-3 text-right text-destructive">{formatCurrency(analysisResult.totalMatched)}</td>
//                       </tr>
//                     </tfoot>
//                   </table>
//                 </div>
//               </div>
//             </div>
//           ) : null}
//         </div>
//       </div>
//     </div>
//   );
// };