export interface Transaction {
  id: string;
  session_id: string;
  txn_date: string;
  description: string;
  debit_amount: number | null;
  credit_amount: number | null;
  balance: number;
  bank_source: 'SBI' | 'SIB';
  confidence_score: number;
  is_flagged: boolean;
}

export interface AnalyticsSummary {
  totalCredit: number;
  totalDebit: number;
  netCashFlow: number;
  highestDebit: { amount: number; date: string; description: string };
  rowCount: number;
  flaggedCount: number;
}

export interface MonthlySummary {
  month: string;
  totalCredit: number;
  totalDebit: number;
}

export interface QualityReport {
  totalRows: number;
  flaggedRows: number;
  avgConfidence: number;
  balanceMismatches: number;
}

export type UploadStatus = 'idle' | 'uploading' | 'detecting' | 'parsing' | 'validating' | 'complete' | 'error';

export interface UploadState {
  status: UploadStatus;
  progress: number;
  fileName: string | null;
  bank: 'SBI' | 'SIB' | null;
  error: string | null;
}
