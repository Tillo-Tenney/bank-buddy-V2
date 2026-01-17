import { Transaction, MonthlySummary, QualityReport } from '@/types/transaction';

const generateId = () => Math.random().toString(36).substring(2, 15);

export const generateMockTransactions = (bank: 'SBI' | 'SIB', sessionId: string): Transaction[] => {
  const baseTransactions: Omit<Transaction, 'id' | 'session_id' | 'bank_source'>[] = [
    { txn_date: '2024-01-03', description: 'NEFT-HDFC0001234-JOHN DOE-RENT PAYMENT', debit_amount: 25000, credit_amount: null, balance: 175000, confidence_score: 1.0, is_flagged: false },
    { txn_date: '2024-01-05', description: 'UPI-SWIGGY-7894561230@ybl-FOOD ORDER', debit_amount: 456.50, credit_amount: null, balance: 174543.50, confidence_score: 1.0, is_flagged: false },
    { txn_date: '2024-01-07', description: 'SALARY CREDIT-ACME CORP LTD', debit_amount: null, credit_amount: 85000, balance: 259543.50, confidence_score: 1.0, is_flagged: false },
    { txn_date: '2024-01-08', description: 'ATM-WDL-SBI ATM KORAMANGALA', debit_amount: 10000, credit_amount: null, balance: 249543.50, confidence_score: 0.95, is_flagged: false },
    { txn_date: '2024-01-10', description: 'UPI-AMAZON PAY-8945612378@apl-SHOPPING', debit_amount: 3299, credit_amount: null, balance: 246244.50, confidence_score: 1.0, is_flagged: false },
    { txn_date: '2024-01-12', description: 'IMPS-PHONEPE-9876543210-REIMBURSEMENT', debit_amount: null, credit_amount: 2500, balance: 248744.50, confidence_score: 1.0, is_flagged: false },
    { txn_date: '2024-01-15', description: 'ECS-LIC PREMIUM PAYMENT-POLICY 123456', debit_amount: 5000, credit_amount: null, balance: 243744.50, confidence_score: 1.0, is_flagged: false },
    { txn_date: '2024-01-17', description: 'UPI-ZOMATO-5647891230@paytm-DINNER', debit_amount: 890, credit_amount: null, balance: 242854.50, confidence_score: 0.85, is_flagged: false },
    { txn_date: '2024-01-18', description: 'NEFT-ICICI0005678-FREELANCE INCOME', debit_amount: null, credit_amount: 15000, balance: 257854.50, confidence_score: 1.0, is_flagged: false },
    { txn_date: '2024-01-20', description: 'EMI-HDFC CREDIT CARD-AUTO DEBIT', debit_amount: 12500, credit_amount: null, balance: 245354.50, confidence_score: 1.0, is_flagged: false },
    { txn_date: '2024-01-22', description: 'UPI-GPAY-7412589630@okaxis-SPLIT BILL', debit_amount: 1250, credit_amount: null, balance: 244104.50, confidence_score: 0.90, is_flagged: false },
    { txn_date: '2024-01-25', description: 'INTEREST CREDIT-SAVINGS ACCOUNT', debit_amount: null, credit_amount: 1250.75, balance: 245355.25, confidence_score: 1.0, is_flagged: false },
    { txn_date: '2024-01-27', description: 'NACH-ELECTRICITY BILL-BESCOM', debit_amount: 2340, credit_amount: null, balance: 243015.25, confidence_score: 1.0, is_flagged: false },
    { txn_date: '2024-01-28', description: 'UPI-BIGBASKET-9517538462@ybl-GROCERIES', debit_amount: 2890.50, credit_amount: null, balance: 240124.75, confidence_score: 1.0, is_flagged: false },
    { txn_date: '2024-01-30', description: 'NEFT-AXIS0009876-MUTUAL FUND SIP', debit_amount: 10000, credit_amount: null, balance: 230124.75, confidence_score: 0.70, is_flagged: true },
    { txn_date: '2024-02-01', description: 'RENT RECEIVED-UPI-TENANT-3698521470@upi', debit_amount: null, credit_amount: 18000, balance: 248124.75, confidence_score: 1.0, is_flagged: false },
    { txn_date: '2024-02-03', description: 'UPI-UBER-4578963210@paytm-CAB RIDE', debit_amount: 345, credit_amount: null, balance: 247779.75, confidence_score: 1.0, is_flagged: false },
    { txn_date: '2024-02-05', description: 'SALARY CREDIT-ACME CORP LTD', debit_amount: null, credit_amount: 85000, balance: 332779.75, confidence_score: 1.0, is_flagged: false },
    { txn_date: '2024-02-07', description: 'NEFT-HDFC0001234-JOHN DOE-RENT PAYMENT', debit_amount: 25000, credit_amount: null, balance: 307779.75, confidence_score: 1.0, is_flagged: false },
    { txn_date: '2024-02-10', description: 'UPI-NETFLIX-7894561234@apl-SUBSCRIPTION', debit_amount: 649, credit_amount: null, balance: 307130.75, confidence_score: 0.65, is_flagged: true },
    { txn_date: '2024-02-12', description: 'ATM-WDL-SBI ATM INDIRANAGAR', debit_amount: 5000, credit_amount: null, balance: 302130.75, confidence_score: 0.95, is_flagged: false },
    { txn_date: '2024-02-15', description: 'NACH-MOBILE BILL-AIRTEL POSTPAID', debit_amount: 999, credit_amount: null, balance: 301131.75, confidence_score: 1.0, is_flagged: false },
    { txn_date: '2024-02-18', description: 'IMPS-BONUS CREDIT-ACME CORP', debit_amount: null, credit_amount: 25000, balance: 326131.75, confidence_score: 1.0, is_flagged: false },
    { txn_date: '2024-02-20', description: 'UPI-FLIPKART-8523697410@ybl-ELECTRONICS', debit_amount: 45999, credit_amount: null, balance: 280132.75, confidence_score: 1.0, is_flagged: false },
    { txn_date: '2024-02-22', description: 'ECS-LIC PREMIUM PAYMENT-POLICY 123456', debit_amount: 5000, credit_amount: null, balance: 275132.75, confidence_score: 1.0, is_flagged: false },
    { txn_date: '2024-02-25', description: 'INTEREST CREDIT-SAVINGS ACCOUNT', debit_amount: null, credit_amount: 1450.25, balance: 276583, confidence_score: 1.0, is_flagged: false },
    { txn_date: '2024-02-28', description: 'NACH-INTERNET BILL-ACT FIBERNET', debit_amount: 1199, credit_amount: null, balance: 275384, confidence_score: 0.72, is_flagged: true },
  ];

  return baseTransactions.map(txn => ({
    ...txn,
    id: generateId(),
    session_id: sessionId,
    bank_source: bank,
  }));
};

export const calculateMonthlySummary = (transactions: Transaction[]): MonthlySummary[] => {
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
      totalCredit: data.credit,
      totalDebit: data.debit,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
};

export const calculateQualityReport = (transactions: Transaction[]): QualityReport => {
  const flaggedRows = transactions.filter(t => t.is_flagged).length;
  const avgConfidence = transactions.reduce((acc, t) => acc + t.confidence_score, 0) / transactions.length;
  const balanceMismatches = transactions.filter(t => t.confidence_score < 0.8).length;

  return {
    totalRows: transactions.length,
    flaggedRows,
    avgConfidence: Math.round(avgConfidence * 100) / 100,
    balanceMismatches,
  };
};
