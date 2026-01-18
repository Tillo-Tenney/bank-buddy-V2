// import { useState, useEffect } from 'react';
// import { Header } from '@/components/Header';
// import { UploadZone } from '@/components/UploadZone';
// import { TransactionTable } from '@/components/TransactionTable';
// import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
// import { ExportPanel } from '@/components/ExportPanel';
// import { DeleteDataButton } from '@/components/DeleteDataButton';
// // import { MonthlyTrendsChart } from '@/components/MonthlyTrendsChart';
// import { useSession } from '@/hooks/useSession';
// import { generateMockTransactions } from '@/data/mockTransactions';
// import { Transaction, UploadState } from '@/types/transaction';
// import { FileText, AlertTriangle } from 'lucide-react';

// const Index = () => {
//   const { sessionId, getTimeRemaining, clearSession } = useSession();
//   const [transactions, setTransactions] = useState<Transaction[]>([]);
//   const [bank, setBank] = useState<'SBI' | 'SIB' | null>(null);
//   const [filterType, setFilterType] = useState<'credit' | 'debit' | 'flagged' | null>(null);
//   const [timeRemaining, setTimeRemaining] = useState(60);
//   const [uploadState, setUploadState] = useState<UploadState>({
//     status: 'idle',
//     progress: 0,
//     fileName: null,
//     bank: null,
//     error: null,
//   });

//   useEffect(() => {
//     const interval = setInterval(() => {
//       setTimeRemaining(getTimeRemaining());
//     }, 60000);
//     return () => clearInterval(interval);
//   }, [getTimeRemaining]);

//   const handleUploadComplete = (detectedBank: 'SBI' | 'SIB') => {
//     setBank(detectedBank);
//     const mockData = generateMockTransactions(detectedBank, sessionId);
//     setTransactions(mockData);
//   };

//   const handleDeleteData = () => {
//     setTransactions([]);
//     setBank(null);
//     setFilterType(null);
//     setUploadState({
//       status: 'idle',
//       progress: 0,
//       fileName: null,
//       bank: null,
//       error: null,
//     });
//     clearSession();
//   };

//   const hasData = transactions.length > 0;

//   return (
//     <div className="min-h-screen bg-background">
//       <Header timeRemaining={timeRemaining} showPrivacy={hasData} />

//       <main className="container mx-auto px-4 py-8">
//         {!hasData ? (
//           <div className="max-w-2xl mx-auto">
//             {/* Hero Section */}
//             <div className="text-center mb-12 animate-fade-in">
//               <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
//                 <FileText className="w-4 h-4" />
//                 MVP Bank Statement Parser
//               </div>
//               <h1 className="text-4xl font-bold mb-4">
//                 Parse Bank Statements with{' '}
//                 <span className="text-gradient-primary">Confidence</span>
//               </h1>
//               <p className="text-lg text-muted-foreground max-w-xl mx-auto">
//                 Upload your SBI or South Indian Bank PDF statements. 
//                 Get instant parsing, validation, and Excel export.
//               </p>
//             </div>

//             {/* Upload Zone */}
//             <UploadZone 
//               onUploadComplete={handleUploadComplete}
//               uploadState={uploadState}
//               setUploadState={setUploadState}
//             />

//             {/* Features Grid */}
//             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
//               <div className="text-center p-6 rounded-xl bg-card border border-border">
//                 <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
//                   <FileText className="w-6 h-6" />
//                 </div>
//                 <h3 className="font-semibold mb-2">Smart Detection</h3>
//                 <p className="text-sm text-muted-foreground">
//                   Auto-detects SBI and SIB formats with specialized parsing logic
//                 </p>
//               </div>
//               <div className="text-center p-6 rounded-xl bg-card border border-border">
//                 <div className="w-12 h-12 rounded-full bg-success/10 text-success flex items-center justify-center mx-auto mb-4">
//                   <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//                     <path d="M9 12l2 2 4-4" />
//                     <circle cx="12" cy="12" r="10" />
//                   </svg>
//                 </div>
//                 <h3 className="font-semibold mb-2">Balance Validation</h3>
//                 <p className="text-sm text-muted-foreground">
//                   Mathematical verification with confidence scoring per row
//                 </p>
//               </div>
//               <div className="text-center p-6 rounded-xl bg-card border border-border">
//                 <div className="w-12 h-12 rounded-full bg-accent/10 text-accent flex items-center justify-center mx-auto mb-4">
//                   <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//                     <rect x="3" y="3" width="18" height="18" rx="2" />
//                     <path d="M3 9h18M9 21V9" />
//                   </svg>
//                 </div>
//                 <h3 className="font-semibold mb-2">Excel Export</h3>
//                 <p className="text-sm text-muted-foreground">
//                   3-sheet report with raw data, monthly summary, and quality metrics
//                 </p>
//               </div>
//             </div>

//             {/* Trust Indicators */}
//             <div className="flex flex-wrap justify-center gap-6 mt-12 text-sm text-muted-foreground">
//               <div className="flex items-center gap-2">
//                 <AlertTriangle className="w-4 h-4" />
//                 <span>Password-protected PDFs not supported (MVP)</span>
//               </div>
//               <div className="flex items-center gap-2">
//                 <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//                   <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
//                 </svg>
//                 <span>Data auto-deleted every hour</span>
//               </div>
//             </div>
//           </div>
//         ) : (
//           <div className="space-y-8">
//             {/* Bank Indicator */}
//             <div className="flex items-center justify-between animate-fade-in">
//               <div className="flex items-center gap-3">
//                 <div className="badge-success text-sm">
//                   {bank === 'SBI' ? 'State Bank of India' : 'South Indian Bank'} Statement
//                 </div>
//                 <span className="text-sm text-muted-foreground">
//                   {transactions.length} transactions parsed
//                 </span>
//               </div>
//               <DeleteDataButton onDelete={handleDeleteData} />
//             </div>

//             {/* Analytics Dashboard */}
//             <AnalyticsDashboard 
//               transactions={transactions} 
//               onFilterChange={setFilterType}
//             />

//             {/* Monthly Trends Chart */}
//             {/* <MonthlyTrendsChart transactions={transactions} /> */}

//             {/* Transaction Table */}
//             <div>
//               <h2 className="text-lg font-semibold mb-4">Transaction Details</h2>
//               <TransactionTable 
//                 transactions={transactions}
//                 filterType={filterType}
//                 onClearFilter={() => setFilterType(null)}
//               />
//             </div>

//             {/* Export Panel */}
//             <ExportPanel transactions={transactions} bank={bank!} />
//           </div>
//         )}
//       </main>

//       {/* Footer */}
//       <footer className="border-t border-border mt-16">
//         <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
//           <p>StatementParser MVP • Your data is never stored permanently</p>
//           <div className="flex justify-center gap-4 mt-2">
//             <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
//             <a href="#" className="hover:text-foreground transition-colors">Terms & Conditions</a>
//           </div>
//         </div>
//       </footer>
//     </div>
//   );
// };

// export default Index;








import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { UploadZone } from '@/components/UploadZone';
import { TransactionTable } from '@/components/TransactionTable';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import { ExportPanel } from '@/components/ExportPanel';
import { DeleteDataButton } from '@/components/DeleteDataButton';
// import { MonthlyTrendsChart } from '@/components/MonthlyTrendsChart';
import { useSession } from '@/hooks/useSession';
// import { generateMockTransactions } from '@/data/mockTransactions'; // No longer needed
import { Transaction, UploadState } from '@/types/transaction';
import { FileText, AlertTriangle } from 'lucide-react';

const Index = () => {
  const { sessionId, getTimeRemaining, clearSession } = useSession();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bank, setBank] = useState<'SBI' | 'SIB' | null>(null);
  const [filterType, setFilterType] = useState<'credit' | 'debit' | 'flagged' | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [uploadState, setUploadState] = useState<UploadState>({
    status: 'idle',
    progress: 0,
    fileName: null,
    bank: null,
    error: null,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(getTimeRemaining());
    }, 60000);
    return () => clearInterval(interval);
  }, [getTimeRemaining]);

  // CHANGED: Now accepts the full data object from UploadZone
  const handleUploadComplete = (data: any) => {
    setBank(data.bank);

    // Map Backend Data to Frontend Transaction Interface
    // Backend returns: { debit: number, credit: number, confidence: number ... }
    // Frontend expects: { debit_amount: number, credit_amount: number, confidence_score: number ... }
    
const mappedTransactions: Transaction[] = data.transactions.map((t: any) => {

      // FIX: Normalize date from DD/MM/YYYY or DD-MM-YY to ISO YYYY-MM-DD
      // This prevents the frontend from misinterpreting 01/10 as Jan 10th instead of Oct 1st

      const [d, m, y] = t.txn_date.replace(/-/g, '/').split('/');
      const fullYear = y.length === 2 ? `20${y}` : y;
      const isoDate = `${fullYear}-${m}-${d}`;

      return {
        id: t.id.toString(),
        txn_date: isoDate, // Use normalized ISO date
        description: t.description,
        debit_amount: t.debit,
        credit_amount: t.credit, //mapping
        balance: t.balance, //mapping
        confidence_score: t.confidence || 1.0, //mapping & credit
        is_flagged: t.is_flagged,
        bank_source: data.bank,
        session_id: sessionId
      };

    });

    setTransactions(mappedTransactions);
  };

  const handleDeleteData = () => {
    setTransactions([]);
    setBank(null);
    setFilterType(null);
    setUploadState({
      status: 'idle',
      progress: 0,
      fileName: null,
      bank: null,
      error: null,
    });
    clearSession();
  };

  const hasData = transactions.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Header timeRemaining={timeRemaining} showPrivacy={hasData} />

      <main className="container mx-auto px-4 py-8">
        {!hasData ? (
          <div className="max-w-2xl mx-auto">
            {/* Hero Section */}
            <div className="text-center mb-12 animate-fade-in">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <FileText className="w-4 h-4" />
                MVP Bank Statement Parser
              </div>
              <h1 className="text-4xl font-bold mb-4">
                Parse Bank Statements with{' '}
                <span className="text-gradient-primary">Confidence</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Upload your SBI or South Indian Bank PDF statements. 
                Get instant parsing, validation, and Excel export.
              </p>
            </div>

            {/* Upload Zone */}
            <UploadZone 
              onUploadComplete={handleUploadComplete}
              uploadState={uploadState}
              setUploadState={setUploadState}
            />

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
              <div className="text-center p-6 rounded-xl bg-card border border-border">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="font-semibold mb-2">Smart Detection</h3>
                <p className="text-sm text-muted-foreground">
                  Auto-detects SBI and SIB formats with specialized parsing logic
                </p>
              </div>
              <div className="text-center p-6 rounded-xl bg-card border border-border">
                <div className="w-12 h-12 rounded-full bg-success/10 text-success flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 12l2 2 4-4" />
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                </div>
                <h3 className="font-semibold mb-2">Balance Validation</h3>
                <p className="text-sm text-muted-foreground">
                  Mathematical verification with confidence scoring per row
                </p>
              </div>
              <div className="text-center p-6 rounded-xl bg-card border border-border">
                <div className="w-12 h-12 rounded-full bg-accent/10 text-accent flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18M9 21V9" />
                  </svg>
                </div>
                <h3 className="font-semibold mb-2">Excel Export</h3>
                <p className="text-sm text-muted-foreground">
                  3-sheet report with raw data, monthly summary, and quality metrics
                </p>
              </div>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap justify-center gap-6 mt-12 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span>Password-protected PDFs not supported (MVP)</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span>Data auto-deleted every hour</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Bank Indicator */}
            <div className="flex items-center justify-between animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="badge-success text-sm">
                  {bank === 'SBI' ? 'State Bank of India' : 'South Indian Bank'} Statement
                </div>
                <span className="text-sm text-muted-foreground">
                  {transactions.length} transactions parsed
                </span>
              </div>
              <DeleteDataButton onDelete={handleDeleteData} />
            </div>

            {/* Analytics Dashboard */}
            <AnalyticsDashboard 
              transactions={transactions} 
              onFilterChange={setFilterType}
            />

            {/* Monthly Trends Chart */}
            {/* <MonthlyTrendsChart transactions={transactions} /> */}

            {/* Transaction Table */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Transaction Details</h2>

              {/* MODIFIED: Wrapped Table in fixed-height scrollable container */}

              <div className="rounded-xl border border-border bg-card h-[450px] overflow-auto shadow-sm">
                
                <TransactionTable 
                  transactions={transactions}
                  filterType={filterType}
                  onClearFilter={() => setFilterType(null)}
                />

              </div>

            </div>

            {/* Export Panel */}
            <ExportPanel transactions={transactions} bank={bank!} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>StatementParser MVP • Your data is never stored permanently</p>
          <div className="flex justify-center gap-4 mt-2">
            <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms & Conditions</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;