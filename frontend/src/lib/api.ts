import { Transaction } from '@/types/transaction';

export interface ParseResponse {
  bank: 'SBI' | 'SIB';
  transactions: Transaction[];
  analytics: {
    totalCredit: number;
    totalDebit: number;
    netCashFlow: number;
    flaggedCount: number;
  };
}

export async function parseBankStatement(
  file: File
): Promise<ParseResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('http://127.0.0.1:8000/parse', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to parse statement');
  }

  return response.json();
}
