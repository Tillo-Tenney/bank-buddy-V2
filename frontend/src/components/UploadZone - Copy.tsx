import { useState, useCallback, useEffect } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Loader2, Lock, X } from 'lucide-react';
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
}

export const UploadZone = ({ onUploadComplete, uploadState, setUploadState }: UploadZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [fileQueue, setFileQueue] = useState<FileQueueItem[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(-1);
  const [passwordInput, setPasswordInput] = useState('');

  useEffect(() => {
  if (fileQueue.length > 0 && currentFileIndex === 0) {
    console.log('[EFFECT] Starting queue processing');
    processQueue(fileQueue, 0);
  }
}, [fileQueue.length]);

  // const processFile = useCallback(async (file: File, filePassword?: string): Promise<'success' | 'needs-password' | 'error'> => {
  const processFile = useCallback(async (file: File, filePassword?: string): Promise<{status: 'success' | 'needs-password' | 'error', data?: BackendResponse}> => {
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setUploadState({
        status: 'error',
        progress: 0,
        fileName: file.name,
        bank: null,
        error: 'Only PDF files are accepted.',
      });
      return { status: 'error' };
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadState({
        status: 'error',
        progress: 0,
        fileName: file.name,
        bank: null,
        error: 'File size exceeds 10MB limit.',
      });
      return { status: 'error' };
    }

    setUploadState({
      status: 'uploading',
      progress: 10,
      fileName: file.name,
      bank: null,
      error: null,
    });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('password', filePassword || '');

    try {
      setUploadState(prev => ({ ...prev, progress: 30 }));

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
        throw new Error(data.detail?.message || 'Failed to parse statement');
      }

      setUploadState(prev => ({ ...prev, status: 'parsing', progress: 70 }));

      const enrichedData: BackendResponse = { ...data, fileName: file.name };

      setUploadState(prev => ({ 
        ...prev, 
        status: 'complete', 
        progress: 100, 
        bank: data.bank 
      }));
      
      //onUploadComplete(enrichedData);
      
      // Small delay to show success state
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return { status: 'success', data: enrichedData };

    } catch (error: any) {
      console.error("Upload error:", error);
      setUploadState(prev => ({
        ...prev,
        status: 'error',
        progress: 0,
        error: error.message || 'Server connection failed',
      }));
      return { status: 'error' };
    }
  }, [onUploadComplete, setUploadState]);

  const processQueue = useCallback(async (queue: FileQueueItem[], startIndex: number = 0) => {
  console.log(`[QUEUE] Starting from index ${startIndex}, total files: ${queue.length}`);
  
  const successfulResults: BackendResponse[] = [];
  
  for (let i = startIndex; i < queue.length; i++) {
    const item = queue[i];
    
    if (item.status === 'success') {
      console.log(`[QUEUE] Skipping file ${i} (already processed)`);
      continue;
    }
    
    console.log(`[QUEUE] Processing file ${i}: ${item.file.name}`);
    
    setCurrentFileIndex(i);
    setFileQueue(prev => prev.map((f, idx) => 
      idx === i ? { ...f, status: 'processing' } : f
    ));

    const result = await processFile(item.file, item.password);
    
    console.log(`[QUEUE] File ${i} result: ${result.status}`);

    if (result.status === 'needs-password') {
      setFileQueue(prev => prev.map((f, idx) => 
        idx === i ? { ...f, status: 'needs-password' } : f
      ));
      console.log(`[QUEUE] Paused at file ${i} - needs password`);
      
      // Send all successful results so far
      successfulResults.forEach(data => onUploadComplete(data));
      
      return; // Pause here
    } else if (result.status === 'success' && result.data) {
      setFileQueue(prev => prev.map((f, idx) => 
        idx === i ? { ...f, status: 'success' } : f
      ));
      successfulResults.push(result.data); // Collect the result
    } else {
      setFileQueue(prev => prev.map((f, idx) => 
        idx === i ? { ...f, status: 'error', error: 'Failed to process' } : f
      ));
    }
  }

  console.log(`[QUEUE] All files processed, sending ${successfulResults.length} results`);
  
  // Send all successful results
  successfulResults.forEach(data => onUploadComplete(data));
  
  setCurrentFileIndex(-1);
  setUploadState({ status: 'idle', progress: 0, fileName: '', bank: null, error: null });
}, [processFile, setUploadState, onUploadComplete]);

  const handleFiles = useCallback((files: FileList) => {
  const newFiles: FileQueueItem[] = Array.from(files).map(file => ({
    file,
    status: 'pending'
  }));
  
  setFileQueue(newFiles);
  setCurrentFileIndex(0);
}, []);

  const handlePasswordSubmit = useCallback(async () => {
  if (currentFileIndex >= 0 && passwordInput) {
    const updated = fileQueue.map((f, idx) => 
      idx === currentFileIndex ? { ...f, password: passwordInput, status: 'pending' } : f
    );
    
    setFileQueue(updated);
    setPasswordInput('');
    
    // Resume processing immediately
    await processQueue(updated, currentFileIndex);
  }
}, [currentFileIndex, passwordInput, fileQueue, processQueue]);

  const handleSkipFile = useCallback(async () => {
  if (currentFileIndex >= 0) {
    const updated = fileQueue.map((f, idx) => 
      idx === currentFileIndex ? { ...f, status: 'error', error: 'Skipped by user' } : f
    );
    
    setFileQueue(updated);
    
    // Continue with next file immediately
    await processQueue(updated, currentFileIndex + 1);
  }
}, [currentFileIndex, fileQueue, processQueue]);

  const removeFile = useCallback((index: number) => {
    setFileQueue(prev => prev.filter((_, idx) => idx !== index));
  }, []);

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

  // Show queue view if files are being processed
  if (fileQueue.length > 0) {
    const currentFile = fileQueue[currentFileIndex];
    const needsPassword = currentFile?.status === 'needs-password';

    return (
      <div className="space-y-4 animate-fade-in">
        {/* Current File Processing Status */}
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

              {/* Password Input */}
              {needsPassword && (
                <div className="space-y-3 animate-fade-in">
                  <p className="text-sm text-muted-foreground">
                    This file is password protected. Enter the password to continue:
                  </p>
                  <div className="flex gap-2">
                    <input 
                      type="password" 
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="PDF Password"
                      className="flex-1 px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                      autoFocus
                    />
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

              {/* Progress Bar */}
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

        {/* File Queue List */}
        <div className="glass-card rounded-xl p-6">
          <h3 className="font-semibold mb-4">File Queue ({fileQueue.length})</h3>
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
                  
                  <span className="text-sm truncate">{item.file.name}</span>
                </div>

                {item.status === 'pending' && index !== currentFileIndex && (
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

  // Initial upload zone
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