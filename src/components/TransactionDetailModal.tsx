import { Transaction } from '@/types/transaction';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangle, CheckCircle, Calculator, FileText, Shield, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  previousBalance: number | null;
  onClose: () => void;
}

const formatCurrency = (amount: number | null) => {
  if (amount === null) return '-';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

export const TransactionDetailModal = ({ 
  transaction, 
  previousBalance, 
  onClose 
}: TransactionDetailModalProps) => {
  if (!transaction) return null;

  // Calculate expected balance
  const credit = transaction.credit_amount || 0;
  const debit = transaction.debit_amount || 0;
  const expectedBalance = previousBalance !== null 
    ? previousBalance + credit - debit 
    : null;
  const balanceDiff = expectedBalance !== null 
    ? Math.abs(transaction.balance - expectedBalance) 
    : 0;
  const balanceMatches = balanceDiff < 1;

  // Confidence breakdown
  const confidenceFactors = [
    {
      label: 'Base Score',
      value: 1.0,
      applied: true,
      description: 'Starting confidence score',
    },
    {
      label: 'OCR Processing',
      value: -0.15,
      applied: transaction.confidence_score <= 0.85,
      description: 'Deduction for OCR-based extraction',
    },
    {
      label: 'Column Inference',
      value: -0.15,
      applied: transaction.description.includes('UPI') && transaction.confidence_score < 1.0,
      description: 'Deduction for guessing debit/credit from keywords',
    },
    {
      label: 'Balance Mismatch',
      value: -0.30,
      applied: transaction.is_flagged,
      description: 'Deduction for mathematical discrepancy',
    },
  ];

  const isCredit = transaction.credit_amount !== null && transaction.credit_amount > 0;

  return (
    <Dialog open={!!transaction} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {transaction.is_flagged ? (
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
            )}
            <div>
              <span className="text-lg">Transaction Details</span>
              <p className="text-sm font-normal text-muted-foreground">
                {formatDate(transaction.txn_date)}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Transaction Summary */}
          <div className="glass-card rounded-lg p-4">
            <div className="flex items-start gap-4">
              <div className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center shrink-0',
                isCredit ? 'bg-success/10' : 'bg-destructive/10'
              )}>
                {isCredit ? (
                  <TrendingUp className="w-6 h-6 text-success" />
                ) : (
                  <TrendingDown className="w-6 h-6 text-destructive" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground mb-1">
                  {isCredit ? 'Credit' : 'Debit'} Transaction
                </p>
                <p className={cn(
                  'text-2xl font-bold',
                  isCredit ? 'text-success' : 'text-destructive'
                )}>
                  {isCredit ? '+' : '-'}{formatCurrency(isCredit ? transaction.credit_amount : transaction.debit_amount)}
                </p>
                <p className="text-sm text-muted-foreground mt-2 break-words">
                  {transaction.description}
                </p>
              </div>
            </div>
          </div>

          {/* Parsing Details */}
          <div>
            <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4" />
              Parsing Details
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-muted-foreground text-xs mb-1">Bank Source</p>
                <p className="font-medium">{transaction.bank_source === 'SBI' ? 'State Bank of India' : 'South Indian Bank'}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-muted-foreground text-xs mb-1">Session ID</p>
                <p className="font-mono text-xs truncate">{transaction.session_id}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-muted-foreground text-xs mb-1">Transaction ID</p>
                <p className="font-mono text-xs truncate">{transaction.id}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-muted-foreground text-xs mb-1">Date Format</p>
                <p className="font-medium">ISO 8601</p>
              </div>
            </div>
          </div>

          {/* Balance Calculation */}
          <div>
            <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <Calculator className="w-4 h-4" />
              Balance Calculation
            </h4>
            <div className={cn(
              'p-4 rounded-lg border',
              balanceMatches ? 'bg-success/5 border-success/20' : 'bg-destructive/5 border-destructive/20'
            )}>
              <div className="space-y-2 text-sm font-mono">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Previous Balance</span>
                  <span>{previousBalance !== null ? formatCurrency(previousBalance) : 'N/A (first row)'}</span>
                </div>
                {credit > 0 && (
                  <div className="flex justify-between text-success">
                    <span>+ Credit</span>
                    <span>{formatCurrency(credit)}</span>
                  </div>
                )}
                {debit > 0 && (
                  <div className="flex justify-between text-destructive">
                    <span>- Debit</span>
                    <span>{formatCurrency(debit)}</span>
                  </div>
                )}
                <div className="border-t border-border pt-2 mt-2">
                  <div className="flex justify-between font-semibold">
                    <span>Expected Balance</span>
                    <span>{expectedBalance !== null ? formatCurrency(expectedBalance) : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Actual Balance</span>
                    <span>{formatCurrency(transaction.balance)}</span>
                  </div>
                </div>
                {expectedBalance !== null && (
                  <div className={cn(
                    'flex justify-between pt-2 font-semibold',
                    balanceMatches ? 'text-success' : 'text-destructive'
                  )}>
                    <span>Difference</span>
                    <span>{balanceMatches ? '✓ Match' : formatCurrency(balanceDiff)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Confidence Breakdown */}
          <div>
            <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4" />
              Confidence Score Breakdown
            </h4>
            <div className="space-y-2">
              {confidenceFactors.map((factor, idx) => (
                <div 
                  key={idx}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg text-sm',
                    factor.applied ? 'bg-muted/50' : 'bg-muted/20 opacity-50'
                  )}
                >
                  <div>
                    <p className="font-medium">{factor.label}</p>
                    <p className="text-xs text-muted-foreground">{factor.description}</p>
                  </div>
                  <span className={cn(
                    'font-mono font-semibold',
                    factor.value > 0 ? 'text-success' : factor.value < 0 ? 'text-destructive' : ''
                  )}>
                    {factor.applied ? (factor.value > 0 ? '+' : '') + factor.value.toFixed(2) : '-'}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 text-sm">
                <div>
                  <p className="font-semibold">Final Score</p>
                  <p className="text-xs text-muted-foreground">
                    {transaction.confidence_score >= 0.8 ? 'High confidence' : 
                     transaction.confidence_score >= 0.7 ? 'Medium confidence' : 'Low confidence'}
                  </p>
                </div>
                <span className={cn(
                  'font-mono text-lg font-bold',
                  transaction.confidence_score >= 0.8 ? 'text-success' : 
                  transaction.confidence_score >= 0.7 ? 'text-warning' : 'text-destructive'
                )}>
                  {(transaction.confidence_score * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className={cn(
            'flex items-center gap-3 p-4 rounded-lg',
            transaction.is_flagged ? 'bg-destructive/10' : 'bg-success/10'
          )}>
            {transaction.is_flagged ? (
              <>
                <AlertTriangle className="w-5 h-5 text-destructive" />
                <div>
                  <p className="font-semibold text-destructive">Flagged for Review</p>
                  <p className="text-sm text-muted-foreground">
                    This transaction has a low confidence score or balance mismatch. Manual verification recommended.
                  </p>
                </div>
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5 text-success" />
                <div>
                  <p className="font-semibold text-success">Validated Successfully</p>
                  <p className="text-sm text-muted-foreground">
                    All checks passed. Balance calculation matches expected value.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
