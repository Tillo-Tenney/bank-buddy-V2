import { useState, useCallback, useEffect, useRef } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Loader2, Lock, X, Eye, EyeOff } from 'lucide-react';
import { UploadState } from '@/types/transaction';
import { cn } from '@/lib/utils';

interface BackendResponse {
  bank: 'SBI' | 'SIB';
  transactions: any[];
  analytics: any;
  fileName?: string;
}

interface UploadZoneProps {
  onUploadComplete: (data: BackendResponse) => void;
  uploadState: UploadState;
  setUploadState: React.Dispatch<React.SetStateAction<UploadState>>;
}

interface FileQueueItem {
  file: File;
  status: 'pending' | 'processing' | 'needs-password' | 'success' | 'error';
  password?: string;
  error?: string;
  data?: BackendResponse;
}

export const UploadZone = ({ onUploadComplete, uploadState, setUploadState }: UploadZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [fileQueue, setFileQueue] = useState<FileQueueItem[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(-1);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const isProcessingRef = useRef(false);

  useEffect(() => {
    const isQueueNew = fileQueue.length > 0 && 
                       currentFileIndex === 0 && 
                       fileQueue.every(f => f.status === 'pending') &&
                       !isProcessingRef.current;
    
    if (isQueueNew) {
      console.log('[EFFECT] Starting queue processing');
      isProcessingRef.current = true;
      processQueue(0);
    }
  }, [fileQueue.length]);

  useEffect(() => {
    if (fileQueue.length === 0 && currentFileIndex !== -1) {
      setCurrentFileIndex(-1);
      setPasswordInput('');
      setShowPassword(false);
    }
  }, [fileQueue.length, currentFileIndex]);

  // Helper to check queue status and finalize upload if conditions are met
  const checkAndFinalize = useCallback((queue: FileQueueItem[]) => {
    const hasErrors = queue.some(item => item.status === 'error');
    const hasPending = queue.some(item => 
      item.status === 'pending' || 
      item.status === 'processing' || 
      item.status === 'needs-password'
    );
    
    const successfulResults = queue
      .filter(item => item.status === 'success' && item.data)
      .map(item => item.data!);

    // Only complete if: No Errors AND No Pending items AND At least one success
    if (!hasErrors && !hasPending && successfulResults.length > 0) {
      const combinedData: BackendResponse = {
        bank: successfulResults[0].bank,
        transactions: successfulResults.flatMap(r => r.transactions),
        analytics: {
          totalCredit: successfulResults.reduce((sum, r) => sum + r.analytics.totalCredit, 0),
          totalDebit: successfulResults.reduce((sum, r) => sum + r.analytics.totalDebit, 0),
          netCashFlow: successfulResults.reduce((sum, r) => sum + r.analytics.netCashFlow, 0),
          flaggedCount: successfulResults.reduce((sum, r) => sum + r.analytics.flaggedCount, 0)
        },
        fileName: successfulResults.map(r => r.fileName).join(', ')
      };
      
      console.log(`[QUEUE] All checks passed. Combining data: ${combinedData.transactions.length} total transactions`);
      onUploadComplete(combinedData);
    } else {
      console.log(`[QUEUE] Cannot finalize yet. Errors: ${hasErrors}, Pending: ${hasPending}, Successes: ${successfulResults.length}`);
    }
  }, [onUploadComplete]);

  const processFile = useCallback(async (file: File, filePassword?: string): Promise<{status: 'success' | 'needs-password' | 'error', data?: BackendResponse, error?: string}> => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      const errorMsg = 'Only PDF files are accepted.';
      setTimeout(() => {
        setUploadState({
          status: 'error',
          progress: 0,
          fileName: file.name,
          bank: null,
          error: errorMsg,
        });
      }, 0);
      return { status: 'error', error: errorMsg };
    }

    if (file.size > 10 * 1024 * 1024) {
      const errorMsg = 'This file exceeds the 10MB limit. Please upload a smaller PDF.';
      setTimeout(() => {
        setUploadState({
          status: 'error',
          progress: 0,
          fileName: file.name,
          bank: null,
          error: errorMsg,
        });
      }, 0);
      return { status: 'error', error: errorMsg };
    }

    setTimeout(() => {
      setUploadState({
        status: 'uploading',
        progress: 10,
        fileName: file.name,
        bank: null,
        error: null,
      });
    }, 0);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('password', filePassword || '');

    try {
      setTimeout(() => {
        setUploadState(prev => ({ ...prev, progress: 30 }));
      }, 0);

      const response = await fetch('http://127.0.0.1:8000/parse', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 422 && 
            (data.detail?.code === 'PASSWORD_REQUIRED' || data.detail?.message?.toLowerCase().includes('password'))) {
          return { status: 'needs-password' };
        }
        throw new Error('Currently this file is not supported. Only SBI and South Indian Bank statements are supported.');
      }

      setTimeout(() => {
        setUploadState(prev => ({ ...prev, status: 'parsing', progress: 70 }));
      }, 0);

      const enrichedData: BackendResponse = { ...data, fileName: file.name };

      setTimeout(() => {
        setUploadState(prev => ({ 
          ...prev, 
          status: 'complete', 
          progress: 100, 
          bank: data.bank 
        }));
      }, 0);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return { status: 'success', data: enrichedData };

    } catch (error: any) {
      console.error("Upload error:", error);
      const errorMsg = error.message || 'Server connection failed';
      setTimeout(() => {
        setUploadState(prev => ({
          ...prev,
          status: 'error',
          progress: 0,
          error: errorMsg,
        }));
      }, 0);
      return { status: 'error', error: errorMsg };
    }
  }, [setUploadState]);

  const processQueue = useCallback(async (startIndex: number = 0) => {
    setFileQueue(currentQueue => {
      console.log(`[QUEUE] Starting from index ${startIndex}, total files: ${currentQueue.length}`);
      
      const processFiles = async () => {
        let updatedQueue = [...currentQueue];
        
        for (let i = startIndex; i < updatedQueue.length; i++) {
          const item = updatedQueue[i];
          
          if (item.status === 'success') {
            console.log(`[QUEUE] Skipping file ${i} (already processed)`);
            continue;
          }
          
          console.log(`[QUEUE] Processing file ${i}: ${item.file.name}`);
          
          setCurrentFileIndex(i);
          updatedQueue[i] = { ...updatedQueue[i], status: 'processing' };
          setFileQueue([...updatedQueue]);

          const result = await processFile(item.file, item.password);
          
          console.log(`[QUEUE] File ${i} result: ${result.status}`);

          if (result.status === 'needs-password') {
            updatedQueue[i] = { ...updatedQueue[i], status: 'needs-password' };
            setFileQueue([...updatedQueue]);
            console.log(`[QUEUE] Paused at file ${i} - needs password`);
            return;
          } else if (result.status === 'success' && result.data) {
            updatedQueue[i] = { ...updatedQueue[i], status: 'success', data: result.data };
            setFileQueue([...updatedQueue]);
          } else {
            updatedQueue[i] = { 
              ...updatedQueue[i], 
              status: 'error', 
              error: result.error || 'Failed to process' 
            };
            setFileQueue([...updatedQueue]);
          }
        }

        console.log(`[QUEUE] All files processed, checking if ready to finalize`);
        
        // Attempt to finalize (will only proceed if NO errors exist)
        checkAndFinalize(updatedQueue);
        
        isProcessingRef.current = false;
        setCurrentFileIndex(-1);
        setUploadState({ status: 'idle', progress: 0, fileName: '', bank: null, error: null });
      };
      
      processFiles();
      
      return currentQueue;
    });
  }, [processFile, setUploadState, checkAndFinalize]);

  const handleFiles = useCallback((files: FileList) => {
    const newFiles: FileQueueItem[] = Array.from(files).map(file => ({
      file,
      status: 'pending'
    }));
    
    setFileQueue(newFiles);
    setCurrentFileIndex(0);
  }, []);

  const handlePasswordSubmit = useCallback(() => {
    if (currentFileIndex >= 0 && passwordInput) {
      setFileQueue(prev => {
        const updated = prev.map((f, idx) => 
          idx === currentFileIndex ? { ...f, password: passwordInput, status: 'pending' } : f
        );
        return updated;
      });
      
      setPasswordInput('');
      
      // Resume processing after state update
      setTimeout(() => processQueue(currentFileIndex), 0);
    }
  }, [currentFileIndex, passwordInput, processQueue]);

  const handleSkipFile = useCallback(() => {
    if (currentFileIndex >= 0) {
      setFileQueue(prev => {
        const updated = prev.map((f, idx) => 
          idx === currentFileIndex ? { ...f, status: 'error', error: 'Skipped by user' } : f
        );
        return updated;
      });
      
      // Continue with next file after state update
      setTimeout(() => processQueue(currentFileIndex + 1), 0);
    }
  }, [currentFileIndex, processQueue]);

  const removeFile = useCallback((index: number) => {
    setFileQueue(prev => {
      const newQueue = prev.filter((_, idx) => idx !== index);
      
      // Attempt to finalize (in case the error was the only thing stopping it)
      setTimeout(() => checkAndFinalize(newQueue), 0);
      
      return newQueue;
    });
  }, [checkAndFinalize]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  if (fileQueue.length > 0) {
    const currentFile = fileQueue[currentFileIndex];
    const needsPassword = currentFile?.status === 'needs-password';
    const hasErrors = fileQueue.some(item => item.status === 'error');

    return (
      <div className="space-y-4 animate-fade-in">
        {currentFileIndex >= 0 && currentFile && (
          <div className="glass-card rounded-xl p-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {currentFile.status === 'processing' && (
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  )}
                  {currentFile.status === 'needs-password' && (
                    <Lock className="w-5 h-5 text-warning" />
                  )}
                  {currentFile.status === 'success' && (
                    <CheckCircle className="w-5 h-5 text-success" />
                  )}
                  {currentFile.status === 'error' && (
                    <AlertCircle className="w-5 h-5 text-destructive" />
                  )}
                  
                  <div>
                    <p className="font-medium">{currentFile.file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      File {currentFileIndex + 1} of {fileQueue.length}
                    </p>
                  </div>
                </div>
              </div>

              {needsPassword && (
                <div className="space-y-3 animate-fade-in">
                  <p className="text-sm text-muted-foreground">
                    This file is password protected. Enter the password to continue:
                  </p>
                  <div className="flex gap-2 items-center group">
                    <div className="relative flex-1">
                      <input 
                        type={showPassword ? "text" : "password"}
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="PDF Password"
                        className="w-full px-3 py-2 pr-10 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                        autoFocus
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword(prev => !prev)}
                        disabled={!passwordInput}
                        className={cn(
                          "absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md",
                          "text-muted-foreground",
                          "opacity-0 group-hover:opacity-100 hover:text-foreground",
                          "transition-all duration-200",
                          !passwordInput && "opacity-0 cursor-not-allowed"
                        )}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>

                      <div
                        className={cn(
                          "absolute right-2 -top-8 px-2 py-1 rounded text-xs bg-black text-white",
                          "opacity-0 scale-95 transition-all duration-200",
                          "group-hover:opacity-100 group-hover:scale-100"
                        )}
                      >
                        {showPassword ? "Hide password" : "Show password"}
                      </div>
                    </div>


                    <button 
                      onClick={handlePasswordSubmit}
                      disabled={!passwordInput}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Unlock
                    </button>
                    <button 
                      onClick={handleSkipFile}
                      className="px-4 py-2 bg-muted text-muted-foreground rounded-md text-sm font-medium hover:bg-muted/80"
                    >
                      Skip
                    </button>
                  </div>
                </div>
              )}

              {currentFile.status === 'processing' && (
                <div className="w-full">
                  <div className="flex justify-between text-sm text-muted-foreground mb-2">
                    <span>Processing...</span>
                    <span>{uploadState.progress}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${uploadState.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="glass-card rounded-xl p-6">
          <h3 className="font-semibold mb-4">File Queue ({fileQueue.length})</h3>
          
          {hasErrors && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-sm text-destructive animate-fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Please remove files with errors to proceed with the valid statements.</span>
            </div>
          )}

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {fileQueue.map((item, index) => (
              <div 
                key={index}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border",
                  index === currentFileIndex ? "border-primary bg-primary/5" : "border-border"
                )}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {item.status === 'pending' && (
                    <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                  )}
                  {item.status === 'processing' && (
                    <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
                  )}
                  {item.status === 'needs-password' && (
                    <Lock className="w-4 h-4 text-warning flex-shrink-0" />
                  )}
                  {item.status === 'success' && (
                    <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                  )}
                  {item.status === 'error' && (
                    <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                  )}
                  
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm truncate font-medium">{item.file.name}</span>
                    {item.status === 'error' && item.error && (
                      <span className="text-xs text-destructive truncate" title={item.error}>
                        {item.error}
                      </span>
                    )}
                  </div>
                </div>

                {(item.status === 'pending' || item.status === 'error' || item.status === 'success') && index !== currentFileIndex && (
                  <button
                    onClick={() => removeFile(index)}
                    className="p-1 hover:bg-muted rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn('upload-zone p-12 cursor-pointer animate-fade-in', isDragging && 'active')}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => document.getElementById('file-input')?.click()}
    >
      <input
        id="file-input"
        type="file"
        accept=".pdf"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />
      
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Upload className="w-8 h-8 text-primary" />
        </div>
        
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-1">Drop bank statements here</h3>
          <p className="text-muted-foreground">or click to browse</p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <FileText className="w-4 h-4" />
            <span>PDF only</span>
          </div>
          <div className="text-muted-foreground">•</div>
          <div className="text-muted-foreground">Max 10MB</div>
          <div className="text-muted-foreground">•</div>
          <div className="text-muted-foreground">Multiple files allowed</div>
        </div>
      </div>
    </div>
  );
};









// import { useState, useCallback, useEffect, useRef } from 'react';
// import { Upload, FileText, AlertCircle, CheckCircle, Loader2, Lock, X, Eye, EyeOff } from 'lucide-react';
// import { UploadState } from '@/types/transaction';
// import { cn } from '@/lib/utils';

// interface BackendResponse {
//   bank: 'SBI' | 'SIB';
//   transactions: any[];
//   analytics: any;
//   fileName?: string;
// }

// interface UploadZoneProps {
//   onUploadComplete: (data: BackendResponse) => void;
//   uploadState: UploadState;
//   setUploadState: React.Dispatch<React.SetStateAction<UploadState>>;
// }

// interface FileQueueItem {
//   file: File;
//   status: 'pending' | 'processing' | 'needs-password' | 'success' | 'error';
//   password?: string;
//   error?: string;
//   data?: BackendResponse;
// }

// export const UploadZone = ({ onUploadComplete, uploadState, setUploadState }: UploadZoneProps) => {
//   const [isDragging, setIsDragging] = useState(false);
//   const [fileQueue, setFileQueue] = useState<FileQueueItem[]>([]);
//   const [currentFileIndex, setCurrentFileIndex] = useState(-1);
//   const [passwordInput, setPasswordInput] = useState('');
//   const [showPassword, setShowPassword] = useState(false);

//   const isProcessingRef = useRef(false);

//   useEffect(() => {
//     const isQueueNew = fileQueue.length > 0 && 
//                        currentFileIndex === 0 && 
//                        fileQueue.every(f => f.status === 'pending') &&
//                        !isProcessingRef.current;
    
//     if (isQueueNew) {
//       console.log('[EFFECT] Starting queue processing');
//       isProcessingRef.current = true;
//       processQueue(0);
//     }
//   }, [fileQueue.length]);

//   useEffect(() => {
//     if (fileQueue.length === 0 && currentFileIndex !== -1) {
//       setCurrentFileIndex(-1);
//       setPasswordInput('');
//       setShowPassword(false);
//     }
//   }, [fileQueue.length, currentFileIndex]);

//   // Helper to check queue status and finalize upload if conditions are met
//   const checkAndFinalize = useCallback((queue: FileQueueItem[]) => {
//     const hasErrors = queue.some(item => item.status === 'error');
//     // We also check for 'pending', 'processing', or 'needs-password' to ensure we don't submit prematurely
//     const hasPending = queue.some(item => 
//       item.status === 'pending' || 
//       item.status === 'processing' || 
//       item.status === 'needs-password'
//     );
    
//     const successfulResults = queue
//       .filter(item => item.status === 'success' && item.data)
//       .map(item => item.data!);

//     // Only complete if: No Errors AND No Pending items AND At least one success
//     if (!hasErrors && !hasPending && successfulResults.length > 0) {
//       const combinedData: BackendResponse = {
//         bank: successfulResults[0].bank,
//         transactions: successfulResults.flatMap(r => r.transactions),
//         analytics: {
//           totalCredit: successfulResults.reduce((sum, r) => sum + r.analytics.totalCredit, 0),
//           totalDebit: successfulResults.reduce((sum, r) => sum + r.analytics.totalDebit, 0),
//           netCashFlow: successfulResults.reduce((sum, r) => sum + r.analytics.netCashFlow, 0),
//           flaggedCount: successfulResults.reduce((sum, r) => sum + r.analytics.flaggedCount, 0)
//         },
//         fileName: successfulResults.map(r => r.fileName).join(', ')
//       };
      
//       console.log(`[QUEUE] All checks passed. Combining data: ${combinedData.transactions.length} total transactions`);
//       onUploadComplete(combinedData);
//     } else {
//       console.log(`[QUEUE] Cannot finalize yet. Errors: ${hasErrors}, Pending: ${hasPending}, Successes: ${successfulResults.length}`);
//     }
//   }, [onUploadComplete]);

//   const processFile = useCallback(async (file: File, filePassword?: string): Promise<{status: 'success' | 'needs-password' | 'error', data?: BackendResponse, error?: string}> => {
//     if (!file.name.toLowerCase().endsWith('.pdf')) {
//       const errorMsg = 'Only PDF files are accepted.';
//       setTimeout(() => {
//         setUploadState({
//           status: 'error',
//           progress: 0,
//           fileName: file.name,
//           bank: null,
//           error: errorMsg,
//         });
//       }, 0);
//       return { status: 'error', error: errorMsg };
//     }

//     if (file.size > 10 * 1024 * 1024) {
//       const errorMsg = 'This file exceeds the 10MB limit. Please upload a smaller PDF.';
//       setTimeout(() => {
//         setUploadState({
//           status: 'error',
//           progress: 0,
//           fileName: file.name,
//           bank: null,
//           error: errorMsg,
//         });
//       }, 0);
//       return { status: 'error', error: errorMsg };
//     }

//     setTimeout(() => {
//       setUploadState({
//         status: 'uploading',
//         progress: 10,
//         fileName: file.name,
//         bank: null,
//         error: null,
//       });
//     }, 0);

//     const formData = new FormData();
//     formData.append('file', file);
//     formData.append('password', filePassword || '');

//     try {
//       setTimeout(() => {
//         setUploadState(prev => ({ ...prev, progress: 30 }));
//       }, 0);

//       const response = await fetch('http://127.0.0.1:8000/parse', {
//         method: 'POST',
//         body: formData,
//       });

//       const data = await response.json();

//       if (!response.ok) {
//         if (response.status === 422 && 
//             (data.detail?.code === 'PASSWORD_REQUIRED' || data.detail?.message?.toLowerCase().includes('password'))) {
//           return { status: 'needs-password' };
//         }
//         throw new Error('Currently this file is not supported. Only SBI and South Indian Bank statements are supported.');
//       }

//       setTimeout(() => {
//         setUploadState(prev => ({ ...prev, status: 'parsing', progress: 70 }));
//       }, 0);

//       const enrichedData: BackendResponse = { ...data, fileName: file.name };

//       setTimeout(() => {
//         setUploadState(prev => ({ 
//           ...prev, 
//           status: 'complete', 
//           progress: 100, 
//           bank: data.bank 
//         }));
//       }, 0);
      
//       await new Promise(resolve => setTimeout(resolve, 500));
      
//       return { status: 'success', data: enrichedData };

//     } catch (error: any) {
//       console.error("Upload error:", error);
//       const errorMsg = error.message || 'Server connection failed';
//       setTimeout(() => {
//         setUploadState(prev => ({
//           ...prev,
//           status: 'error',
//           progress: 0,
//           error: errorMsg,
//         }));
//       }, 0);
//       return { status: 'error', error: errorMsg };
//     }
//   }, [setUploadState]);

//   const processQueue = useCallback(async (startIndex: number = 0) => {
//     setFileQueue(currentQueue => {
//       console.log(`[QUEUE] Starting from index ${startIndex}, total files: ${currentQueue.length}`);
      
//       const processFiles = async () => {
//         let updatedQueue = [...currentQueue];
        
//         for (let i = startIndex; i < updatedQueue.length; i++) {
//           const item = updatedQueue[i];
          
//           if (item.status === 'success') {
//             console.log(`[QUEUE] Skipping file ${i} (already processed)`);
//             continue;
//           }
          
//           console.log(`[QUEUE] Processing file ${i}: ${item.file.name}`);
          
//           setCurrentFileIndex(i);
//           updatedQueue[i] = { ...updatedQueue[i], status: 'processing' };
//           setFileQueue([...updatedQueue]);

//           const result = await processFile(item.file, item.password);
          
//           console.log(`[QUEUE] File ${i} result: ${result.status}`);

//           if (result.status === 'needs-password') {
//             updatedQueue[i] = { ...updatedQueue[i], status: 'needs-password' };
//             setFileQueue([...updatedQueue]);
//             console.log(`[QUEUE] Paused at file ${i} - needs password`);
//             return;
//           } else if (result.status === 'success' && result.data) {
//             updatedQueue[i] = { ...updatedQueue[i], status: 'success', data: result.data };
//             setFileQueue([...updatedQueue]);
//           } else {
//             updatedQueue[i] = { 
//               ...updatedQueue[i], 
//               status: 'error', 
//               error: result.error || 'Failed to process' 
//             };
//             setFileQueue([...updatedQueue]);
//           }
//         }

//         console.log(`[QUEUE] All files processed, checking if ready to finalize`);
        
//         // Attempt to finalize (will only proceed if NO errors exist)
//         checkAndFinalize(updatedQueue);
        
//         isProcessingRef.current = false;
//         setCurrentFileIndex(-1);
//         setUploadState({ status: 'idle', progress: 0, fileName: '', bank: null, error: null });
//       };
      
//       processFiles();
      
//       return currentQueue;
//     });
//   }, [processFile, setUploadState, checkAndFinalize]);

//   const handleFiles = useCallback((files: FileList) => {
//     const newFiles: FileQueueItem[] = Array.from(files).map(file => ({
//       file,
//       status: 'pending'
//     }));
    
//     setFileQueue(newFiles);
//     setCurrentFileIndex(0);
//   }, []);

//   const handlePasswordSubmit = useCallback(() => {
//     if (currentFileIndex >= 0 && passwordInput) {
//       setFileQueue(prev => {
//         const updated = prev.map((f, idx) => 
//           idx === currentFileIndex ? { ...f, password: passwordInput, status: 'pending' } : f
//         );
//         return updated;
//       });
      
//       setPasswordInput('');
      
//       // Resume processing after state update
//       setTimeout(() => processQueue(currentFileIndex), 0);
//     }
//   }, [currentFileIndex, passwordInput, processQueue]);

//   const handleSkipFile = useCallback(() => {
//     if (currentFileIndex >= 0) {
//       setFileQueue(prev => {
//         const updated = prev.map((f, idx) => 
//           idx === currentFileIndex ? { ...f, status: 'error', error: 'Skipped by user' } : f
//         );
        
//         // When skipping, we re-evaluate the queue. 
//         // We use setTimeout to allow state to settle, though passing 'updated' directly to check would be cleaner 
//         // if we weren't continuing the queue immediately.
//         // However, standard flow implies we continue to next file.
//         return updated;
//       });
      
//       // Continue with next file after state update
//       setTimeout(() => processQueue(currentFileIndex + 1), 0);
//     }
//   }, [currentFileIndex, processQueue]);

//   const removeFile = useCallback((index: number) => {
//     setFileQueue(prev => {
//       const newQueue = prev.filter((_, idx) => idx !== index);
      
//       // Attempt to finalize. 
//       // If the removed file was the only error preventing submission, this will now trigger success.
//       setTimeout(() => checkAndFinalize(newQueue), 0);
      
//       return newQueue;
//     });
//   }, [checkAndFinalize]);

//   const handleDrop = useCallback((e: React.DragEvent) => {
//     e.preventDefault();
//     setIsDragging(false);
//     if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
//       handleFiles(e.dataTransfer.files);
//     }
//   }, [handleFiles]);

//   const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
//     if (e.target.files && e.target.files.length > 0) {
//       handleFiles(e.target.files);
//     }
//   };

//   if (fileQueue.length > 0) {
//     const currentFile = fileQueue[currentFileIndex];
//     const needsPassword = currentFile?.status === 'needs-password';

//     return (
//       <div className="space-y-4 animate-fade-in">
//         {currentFileIndex >= 0 && currentFile && (
//           <div className="glass-card rounded-xl p-6">
//             <div className="flex flex-col gap-4">
//               <div className="flex items-center justify-between">
//                 <div className="flex items-center gap-3">
//                   {currentFile.status === 'processing' && (
//                     <Loader2 className="w-5 h-5 text-primary animate-spin" />
//                   )}
//                   {currentFile.status === 'needs-password' && (
//                     <Lock className="w-5 h-5 text-warning" />
//                   )}
//                   {currentFile.status === 'success' && (
//                     <CheckCircle className="w-5 h-5 text-success" />
//                   )}
//                   {currentFile.status === 'error' && (
//                     <AlertCircle className="w-5 h-5 text-destructive" />
//                   )}
                  
//                   <div>
//                     <p className="font-medium">{currentFile.file.name}</p>
//                     <p className="text-sm text-muted-foreground">
//                       File {currentFileIndex + 1} of {fileQueue.length}
//                     </p>
//                   </div>
//                 </div>
//               </div>

//               {needsPassword && (
//                 <div className="space-y-3 animate-fade-in">
//                   <p className="text-sm text-muted-foreground">
//                     This file is password protected. Enter the password to continue:
//                   </p>
//                   <div className="flex gap-2 items-center group">
//                     <div className="relative flex-1">
//                       <input 
//                         type={showPassword ? "text" : "password"}
//                         value={passwordInput}
//                         onChange={(e) => setPasswordInput(e.target.value)}
//                         placeholder="PDF Password"
//                         className="w-full px-3 py-2 pr-10 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
//                         onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
//                         autoFocus
//                       />

//                       <button
//                         type="button"
//                         onClick={() => setShowPassword(prev => !prev)}
//                         disabled={!passwordInput}
//                         className={cn(
//                           "absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md",
//                           "text-muted-foreground",
//                           "opacity-0 group-hover:opacity-100 hover:text-foreground",
//                           "transition-all duration-200",
//                           !passwordInput && "opacity-0 cursor-not-allowed"
//                         )}
//                         aria-label={showPassword ? "Hide password" : "Show password"}
//                       >
//                         {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
//                       </button>

//                       <div
//                         className={cn(
//                           "absolute right-2 -top-8 px-2 py-1 rounded text-xs bg-black text-white",
//                           "opacity-0 scale-95 transition-all duration-200",
//                           "group-hover:opacity-100 group-hover:scale-100"
//                         )}
//                       >
//                         {showPassword ? "Hide password" : "Show password"}
//                       </div>
//                     </div>


//                     <button 
//                       onClick={handlePasswordSubmit}
//                       disabled={!passwordInput}
//                       className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
//                     >
//                       Unlock
//                     </button>
//                     <button 
//                       onClick={handleSkipFile}
//                       className="px-4 py-2 bg-muted text-muted-foreground rounded-md text-sm font-medium hover:bg-muted/80"
//                     >
//                       Skip
//                     </button>
//                   </div>
//                 </div>
//               )}

//               {currentFile.status === 'processing' && (
//                 <div className="w-full">
//                   <div className="flex justify-between text-sm text-muted-foreground mb-2">
//                     <span>Processing...</span>
//                     <span>{uploadState.progress}%</span>
//                   </div>
//                   <div className="h-2 bg-muted rounded-full overflow-hidden">
//                     <div 
//                       className="h-full bg-primary rounded-full transition-all duration-300"
//                       style={{ width: `${uploadState.progress}%` }}
//                     />
//                   </div>
//                 </div>
//               )}
//             </div>
//           </div>
//         )}

//         <div className="glass-card rounded-xl p-6">
//           <h3 className="font-semibold mb-4">File Queue ({fileQueue.length})</h3>
//           <div className="space-y-2 max-h-64 overflow-y-auto">
//             {fileQueue.map((item, index) => (
//               <div 
//                 key={index}
//                 className={cn(
//                   "flex items-center justify-between p-3 rounded-lg border",
//                   index === currentFileIndex ? "border-primary bg-primary/5" : "border-border"
//                 )}
//               >
//                 <div className="flex items-center gap-3 flex-1 min-w-0">
//                   {item.status === 'pending' && (
//                     <div className="w-2 h-2 rounded-full bg-muted-foreground" />
//                   )}
//                   {item.status === 'processing' && (
//                     <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
//                   )}
//                   {item.status === 'needs-password' && (
//                     <Lock className="w-4 h-4 text-warning flex-shrink-0" />
//                   )}
//                   {item.status === 'success' && (
//                     <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
//                   )}
//                   {item.status === 'error' && (
//                     <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
//                   )}
                  
//                   <div className="flex flex-col min-w-0">
//                     <span className="text-sm truncate font-medium">{item.file.name}</span>
//                     {item.status === 'error' && item.error && (
//                       <span className="text-xs text-destructive truncate" title={item.error}>
//                         {item.error}
//                       </span>
//                     )}
//                   </div>
//                 </div>

//                 {/* UPDATED: Allow removing items if they are NOT the actively processing file. 
//                     This enables clearing errors or successful files to reset the queue. */}
//                 {(item.status === 'pending' || item.status === 'error' || item.status === 'success') && index !== currentFileIndex && (
//                   <button
//                     onClick={() => removeFile(index)}
//                     className="p-1 hover:bg-muted rounded"
//                   >
//                     <X className="w-4 h-4" />
//                   </button>
//                 )}
//               </div>
//             ))}
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div
//       className={cn('upload-zone p-12 cursor-pointer animate-fade-in', isDragging && 'active')}
//       onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
//       onDragLeave={() => setIsDragging(false)}
//       onDrop={handleDrop}
//       onClick={() => document.getElementById('file-input')?.click()}
//     >
//       <input
//         id="file-input"
//         type="file"
//         accept=".pdf"
//         multiple
//         className="hidden"
//         onChange={handleFileSelect}
//       />
      
//       <div className="flex flex-col items-center gap-4">
//         <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
//           <Upload className="w-8 h-8 text-primary" />
//         </div>
        
//         <div className="text-center">
//           <h3 className="text-lg font-semibold mb-1">Drop bank statements here</h3>
//           <p className="text-muted-foreground">or click to browse</p>
//         </div>

//         <div className="flex flex-wrap justify-center gap-3 text-sm">
//           <div className="flex items-center gap-1.5 text-muted-foreground">
//             <FileText className="w-4 h-4" />
//             <span>PDF only</span>
//           </div>
//           <div className="text-muted-foreground">•</div>
//           <div className="text-muted-foreground">Max 10MB</div>
//           <div className="text-muted-foreground">•</div>
//           <div className="text-muted-foreground">Multiple files allowed</div>
//         </div>
//       </div>
//     </div>
//   );
// };









// import { useState, useCallback, useEffect, useRef } from 'react';
// import { Upload, FileText, AlertCircle, CheckCircle, Loader2, Lock, X, Eye, EyeOff } from 'lucide-react';
// import { UploadState } from '@/types/transaction';
// import { cn } from '@/lib/utils';

// interface BackendResponse {
//   bank: 'SBI' | 'SIB';
//   transactions: any[];
//   analytics: any;
//   fileName?: string;
// }

// interface UploadZoneProps {
//   onUploadComplete: (data: BackendResponse) => void;
//   uploadState: UploadState;
//   setUploadState: React.Dispatch<React.SetStateAction<UploadState>>;
// }

// interface FileQueueItem {
//   file: File;
//   status: 'pending' | 'processing' | 'needs-password' | 'success' | 'error';
//   password?: string;
//   error?: string;
//   data?: BackendResponse;
// }

// export const UploadZone = ({ onUploadComplete, uploadState, setUploadState }: UploadZoneProps) => {
//   const [isDragging, setIsDragging] = useState(false);
//   const [fileQueue, setFileQueue] = useState<FileQueueItem[]>([]);
//   const [currentFileIndex, setCurrentFileIndex] = useState(-1);
//   const [passwordInput, setPasswordInput] = useState('');
//   const [showPassword, setShowPassword] = useState(false);

//   const isProcessingRef = useRef(false);

//   useEffect(() => {
//     const isQueueNew = fileQueue.length > 0 && 
//                        currentFileIndex === 0 && 
//                        fileQueue.every(f => f.status === 'pending') &&
//                        !isProcessingRef.current;
    
//     if (isQueueNew) {
//       console.log('[EFFECT] Starting queue processing');
//       isProcessingRef.current = true;
//       processQueue(0);
//     }
//   }, [fileQueue.length]);

//   useEffect(() => {
//     if (fileQueue.length === 0 && currentFileIndex !== -1) {
//       setCurrentFileIndex(-1);
//       setPasswordInput('');
//       setShowPassword(false);
//     }
//   }, [fileQueue.length, currentFileIndex]);


//   const processFile = useCallback(async (file: File, filePassword?: string): Promise<{status: 'success' | 'needs-password' | 'error', data?: BackendResponse, error?: string}> => {
//     if (!file.name.toLowerCase().endsWith('.pdf')) {
//       const errorMsg = 'Only PDF files are accepted.';
//       setTimeout(() => {
//         setUploadState({
//           status: 'error',
//           progress: 0,
//           fileName: file.name,
//           bank: null,
//           error: errorMsg,
//         });
//       }, 0);
//       return { status: 'error', error: errorMsg };
//     }

//     if (file.size > 10 * 1024 * 1024) {
//       const errorMsg = 'This file exceeds the 10MB limit. Please upload a smaller PDF.';
//       setTimeout(() => {
//         setUploadState({
//           status: 'error',
//           progress: 0,
//           fileName: file.name,
//           bank: null,
//           error: errorMsg,
//         });
//       }, 0);
//       return { status: 'error', error: errorMsg };
//     }

//     setTimeout(() => {
//       setUploadState({
//         status: 'uploading',
//         progress: 10,
//         fileName: file.name,
//         bank: null,
//         error: null,
//       });
//     }, 0);

//     const formData = new FormData();
//     formData.append('file', file);
//     formData.append('password', filePassword || '');

//     try {
//       setTimeout(() => {
//         setUploadState(prev => ({ ...prev, progress: 30 }));
//       }, 0);

//       // const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

//       //   if (!API_BASE_URL) {
//       //     throw new Error("VITE_API_BASE_URL is not configured");
//       //   }

//       // const response = await fetch(`${API_BASE_URL}/parse`, {
//       //     method: 'POST',
//       //     body: formData,
//       //   });

//       const response = await fetch('http://127.0.0.1:8000/parse', {
//         method: 'POST',
//         body: formData,
//       });

//       const data = await response.json();

//       if (!response.ok) {
//         if (response.status === 422 && 
//             (data.detail?.code === 'PASSWORD_REQUIRED' || data.detail?.message?.toLowerCase().includes('password'))) {
//           return { status: 'needs-password' };
//         }
//         throw new Error('Currently this file is not supported. Only SBI and South Indian Bank statements are supported.');
//       }

//       setTimeout(() => {
//         setUploadState(prev => ({ ...prev, status: 'parsing', progress: 70 }));
//       }, 0);

//       const enrichedData: BackendResponse = { ...data, fileName: file.name };

//       setTimeout(() => {
//         setUploadState(prev => ({ 
//           ...prev, 
//           status: 'complete', 
//           progress: 100, 
//           bank: data.bank 
//         }));
//       }, 0);
      
//       await new Promise(resolve => setTimeout(resolve, 500));
      
//       return { status: 'success', data: enrichedData };

//     } catch (error: any) {
//       console.error("Upload error:", error);
//       const errorMsg = error.message || 'Server connection failed';
//       setTimeout(() => {
//         setUploadState(prev => ({
//           ...prev,
//           status: 'error',
//           progress: 0,
//           error: errorMsg,
//         }));
//       }, 0);
//       return { status: 'error', error: errorMsg };
//     }
//   }, [setUploadState]);

//   const processQueue = useCallback(async (startIndex: number = 0) => {
//     setFileQueue(currentQueue => {
//       console.log(`[QUEUE] Starting from index ${startIndex}, total files: ${currentQueue.length}`);
      
//       const processFiles = async () => {
//         let updatedQueue = [...currentQueue];
        
//         for (let i = startIndex; i < updatedQueue.length; i++) {
//           const item = updatedQueue[i];
          
//           if (item.status === 'success') {
//             console.log(`[QUEUE] Skipping file ${i} (already processed)`);
//             continue;
//           }
          
//           console.log(`[QUEUE] Processing file ${i}: ${item.file.name}`);
          
//           setCurrentFileIndex(i);
//           updatedQueue[i] = { ...updatedQueue[i], status: 'processing' };
//           setFileQueue([...updatedQueue]);

//           const result = await processFile(item.file, item.password);
          
//           console.log(`[QUEUE] File ${i} result: ${result.status}`);

//           if (result.status === 'needs-password') {
//             updatedQueue[i] = { ...updatedQueue[i], status: 'needs-password' };
//             setFileQueue([...updatedQueue]);
//             console.log(`[QUEUE] Paused at file ${i} - needs password`);
//             return;
//           } else if (result.status === 'success' && result.data) {
//             updatedQueue[i] = { ...updatedQueue[i], status: 'success', data: result.data };
//             setFileQueue([...updatedQueue]);
//           } else {
//             updatedQueue[i] = { 
//               ...updatedQueue[i], 
//               status: 'error', 
//               error: result.error || 'Failed to process' 
//             };
//             setFileQueue([...updatedQueue]);
//           }
//         }

//         console.log(`[QUEUE] All files processed, collecting results`);
        
//         const successfulResults = updatedQueue
//           .filter(item => item.status === 'success' && item.data)
//           .map(item => item.data!);
        
//         console.log(`[QUEUE] Found ${successfulResults.length} successful files`);
        
//         if (successfulResults.length > 0) {
//           const combinedData: BackendResponse = {
//             bank: successfulResults[0].bank,
//             transactions: successfulResults.flatMap(r => r.transactions),
//             analytics: {
//               totalCredit: successfulResults.reduce((sum, r) => sum + r.analytics.totalCredit, 0),
//               totalDebit: successfulResults.reduce((sum, r) => sum + r.analytics.totalDebit, 0),
//               netCashFlow: successfulResults.reduce((sum, r) => sum + r.analytics.netCashFlow, 0),
//               flaggedCount: successfulResults.reduce((sum, r) => sum + r.analytics.flaggedCount, 0)
//             },
//             fileName: successfulResults.map(r => r.fileName).join(', ')
//           };
          
//           console.log(`[QUEUE] Combined data: ${combinedData.transactions.length} total transactions`);
//           onUploadComplete(combinedData);
//         }
        
//         isProcessingRef.current = false;
//         setCurrentFileIndex(-1);
//         setUploadState({ status: 'idle', progress: 0, fileName: '', bank: null, error: null });
//       };
      
//       processFiles();
      
//       return currentQueue;
//     });
//   }, [processFile, setUploadState, onUploadComplete]);

//   const handleFiles = useCallback((files: FileList) => {
//     const newFiles: FileQueueItem[] = Array.from(files).map(file => ({
//       file,
//       status: 'pending'
//     }));
    
//     setFileQueue(newFiles);
//     setCurrentFileIndex(0);
//   }, []);

//   const handlePasswordSubmit = useCallback(() => {
//     if (currentFileIndex >= 0 && passwordInput) {
//       setFileQueue(prev => {
//         const updated = prev.map((f, idx) => 
//           idx === currentFileIndex ? { ...f, password: passwordInput, status: 'pending' } : f
//         );
//         return updated;
//       });
      
//       setPasswordInput('');
      
//       // Resume processing after state update
//       setTimeout(() => processQueue(currentFileIndex), 0);
//     }
//   }, [currentFileIndex, passwordInput, processQueue]);

//   const handleSkipFile = useCallback(() => {
//     if (currentFileIndex >= 0) {
//       setFileQueue(prev => {
//         const updated = prev.map((f, idx) => 
//           idx === currentFileIndex ? { ...f, status: 'error', error: 'Skipped by user' } : f
//         );
//         return updated;
//       });
      
//       // Continue with next file after state update
//       setTimeout(() => processQueue(currentFileIndex + 1), 0);
//     }
//   }, [currentFileIndex, processQueue]);

//   const removeFile = useCallback((index: number) => {
//     setFileQueue(prev => prev.filter((_, idx) => idx !== index));
//   }, []);

//   const handleDrop = useCallback((e: React.DragEvent) => {
//     e.preventDefault();
//     setIsDragging(false);
//     if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
//       handleFiles(e.dataTransfer.files);
//     }
//   }, [handleFiles]);

//   const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
//     if (e.target.files && e.target.files.length > 0) {
//       handleFiles(e.target.files);
//     }
//   };

//   if (fileQueue.length > 0) {
//     const currentFile = fileQueue[currentFileIndex];
//     const needsPassword = currentFile?.status === 'needs-password';

//     return (
//       <div className="space-y-4 animate-fade-in">
//         {currentFileIndex >= 0 && currentFile && (
//           <div className="glass-card rounded-xl p-6">
//             <div className="flex flex-col gap-4">
//               <div className="flex items-center justify-between">
//                 <div className="flex items-center gap-3">
//                   {currentFile.status === 'processing' && (
//                     <Loader2 className="w-5 h-5 text-primary animate-spin" />
//                   )}
//                   {currentFile.status === 'needs-password' && (
//                     <Lock className="w-5 h-5 text-warning" />
//                   )}
//                   {currentFile.status === 'success' && (
//                     <CheckCircle className="w-5 h-5 text-success" />
//                   )}
//                   {currentFile.status === 'error' && (
//                     <AlertCircle className="w-5 h-5 text-destructive" />
//                   )}
                  
//                   <div>
//                     <p className="font-medium">{currentFile.file.name}</p>
//                     <p className="text-sm text-muted-foreground">
//                       File {currentFileIndex + 1} of {fileQueue.length}
//                     </p>
//                   </div>
//                 </div>
//               </div>

//               {needsPassword && (
//                 <div className="space-y-3 animate-fade-in">
//                   <p className="text-sm text-muted-foreground">
//                     This file is password protected. Enter the password to continue:
//                   </p>
//                   <div className="flex gap-2 items-center group">
//                     <div className="relative flex-1">
//                       <input 
//                         type={showPassword ? "text" : "password"}
//                         value={passwordInput}
//                         onChange={(e) => setPasswordInput(e.target.value)}
//                         placeholder="PDF Password"
//                         className="w-full px-3 py-2 pr-10 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
//                         onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
//                         autoFocus
//                       />

//                       <button
//                         type="button"
//                         onClick={() => setShowPassword(prev => !prev)}
//                         disabled={!passwordInput}
//                         className={cn(
//                           "absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md",
//                           "text-muted-foreground",
//                           "opacity-0 group-hover:opacity-100 hover:text-foreground",
//                           "transition-all duration-200",
//                           !passwordInput && "opacity-0 cursor-not-allowed"
//                         )}
//                         aria-label={showPassword ? "Hide password" : "Show password"}
//                       >
//                         {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
//                       </button>

//                       <div
//                         className={cn(
//                           "absolute right-2 -top-8 px-2 py-1 rounded text-xs bg-black text-white",
//                           "opacity-0 scale-95 transition-all duration-200",
//                           "group-hover:opacity-100 group-hover:scale-100"
//                         )}
//                       >
//                         {showPassword ? "Hide password" : "Show password"}
//                       </div>
//                     </div>


//                     <button 
//                       onClick={handlePasswordSubmit}
//                       disabled={!passwordInput}
//                       className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
//                     >
//                       Unlock
//                     </button>
//                     <button 
//                       onClick={handleSkipFile}
//                       className="px-4 py-2 bg-muted text-muted-foreground rounded-md text-sm font-medium hover:bg-muted/80"
//                     >
//                       Skip
//                     </button>
//                   </div>
//                 </div>
//               )}

//               {currentFile.status === 'processing' && (
//                 <div className="w-full">
//                   <div className="flex justify-between text-sm text-muted-foreground mb-2">
//                     <span>Processing...</span>
//                     <span>{uploadState.progress}%</span>
//                   </div>
//                   <div className="h-2 bg-muted rounded-full overflow-hidden">
//                     <div 
//                       className="h-full bg-primary rounded-full transition-all duration-300"
//                       style={{ width: `${uploadState.progress}%` }}
//                     />
//                   </div>
//                 </div>
//               )}
//             </div>
//           </div>
//         )}

//         <div className="glass-card rounded-xl p-6">
//           <h3 className="font-semibold mb-4">File Queue ({fileQueue.length})</h3>
//           <div className="space-y-2 max-h-64 overflow-y-auto">
//             {fileQueue.map((item, index) => (
//               <div 
//                 key={index}
//                 className={cn(
//                   "flex items-center justify-between p-3 rounded-lg border",
//                   index === currentFileIndex ? "border-primary bg-primary/5" : "border-border"
//                 )}
//               >
//                 <div className="flex items-center gap-3 flex-1 min-w-0">
//                   {item.status === 'pending' && (
//                     <div className="w-2 h-2 rounded-full bg-muted-foreground" />
//                   )}
//                   {item.status === 'processing' && (
//                     <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
//                   )}
//                   {item.status === 'needs-password' && (
//                     <Lock className="w-4 h-4 text-warning flex-shrink-0" />
//                   )}
//                   {item.status === 'success' && (
//                     <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
//                   )}
//                   {item.status === 'error' && (
//                     <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
//                   )}
                  
//                   <div className="flex flex-col min-w-0">
//                     <span className="text-sm truncate font-medium">{item.file.name}</span>
//                     {item.status === 'error' && item.error && (
//                       <span className="text-xs text-destructive truncate" title={item.error}>
//                         {item.error}
//                       </span>
//                     )}
//                   </div>
//                 </div>

//                 {/* UPDATED: Allow removing items if they are NOT the actively processing file. 
//                     This enables clearing errors or successful files to reset the queue. */}
//                 {(item.status === 'pending' || item.status === 'error' || item.status === 'success') && index !== currentFileIndex && (
//                   <button
//                     onClick={() => removeFile(index)}
//                     className="p-1 hover:bg-muted rounded"
//                   >
//                     <X className="w-4 h-4" />
//                   </button>
//                 )}
//               </div>
//             ))}
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div
//       className={cn('upload-zone p-12 cursor-pointer animate-fade-in', isDragging && 'active')}
//       onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
//       onDragLeave={() => setIsDragging(false)}
//       onDrop={handleDrop}
//       onClick={() => document.getElementById('file-input')?.click()}
//     >
//       <input
//         id="file-input"
//         type="file"
//         accept=".pdf"
//         multiple
//         className="hidden"
//         onChange={handleFileSelect}
//       />
      
//       <div className="flex flex-col items-center gap-4">
//         <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
//           <Upload className="w-8 h-8 text-primary" />
//         </div>
        
//         <div className="text-center">
//           <h3 className="text-lg font-semibold mb-1">Drop bank statements here</h3>
//           <p className="text-muted-foreground">or click to browse</p>
//         </div>

//         <div className="flex flex-wrap justify-center gap-3 text-sm">
//           <div className="flex items-center gap-1.5 text-muted-foreground">
//             <FileText className="w-4 h-4" />
//             <span>PDF only</span>
//           </div>
//           <div className="text-muted-foreground">•</div>
//           <div className="text-muted-foreground">Max 10MB</div>
//           <div className="text-muted-foreground">•</div>
//           <div className="text-muted-foreground">Multiple files allowed</div>
//         </div>
//       </div>
//     </div>
//   );
// };