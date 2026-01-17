import { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { UploadState } from '@/types/transaction';
import { cn } from '@/lib/utils';

interface UploadZoneProps {
  onUploadComplete: (bank: 'SBI' | 'SIB') => void;
  uploadState: UploadState;
  setUploadState: React.Dispatch<React.SetStateAction<UploadState>>;
}

export const UploadZone = ({ onUploadComplete, uploadState, setUploadState }: UploadZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const simulateProcessing = useCallback(async (file: File) => {
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setUploadState({
        status: 'error',
        progress: 0,
        fileName: file.name,
        bank: null,
        error: 'Only PDF files are accepted. Please upload a .pdf file.',
      });
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadState({
        status: 'error',
        progress: 0,
        fileName: file.name,
        bank: null,
        error: 'File size exceeds 10MB limit. Please upload a smaller file.',
      });
      return;
    }

    // Simulate upload
    setUploadState({
      status: 'uploading',
      progress: 0,
      fileName: file.name,
      bank: null,
      error: null,
    });

    for (let i = 0; i <= 30; i += 10) {
      await new Promise(r => setTimeout(r, 100));
      setUploadState(prev => ({ ...prev, progress: i }));
    }

    // Simulate bank detection
    setUploadState(prev => ({ ...prev, status: 'detecting', progress: 40 }));
    await new Promise(r => setTimeout(r, 800));

    // Randomly select bank for demo (in real app, would parse PDF)
    const detectedBank = Math.random() > 0.5 ? 'SBI' : 'SIB';
    
    setUploadState(prev => ({ ...prev, bank: detectedBank, progress: 50 }));

    // Simulate parsing
    setUploadState(prev => ({ ...prev, status: 'parsing', progress: 60 }));
    await new Promise(r => setTimeout(r, 1000));

    for (let i = 60; i <= 80; i += 5) {
      await new Promise(r => setTimeout(r, 150));
      setUploadState(prev => ({ ...prev, progress: i }));
    }

    // Simulate validation
    setUploadState(prev => ({ ...prev, status: 'validating', progress: 85 }));
    await new Promise(r => setTimeout(r, 600));

    for (let i = 85; i <= 100; i += 5) {
      await new Promise(r => setTimeout(r, 100));
      setUploadState(prev => ({ ...prev, progress: i }));
    }

    // Complete
    setUploadState(prev => ({ ...prev, status: 'complete', progress: 100 }));
    onUploadComplete(detectedBank);
  }, [onUploadComplete, setUploadState]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      simulateProcessing(file);
    }
  }, [simulateProcessing]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      simulateProcessing(file);
    }
  };

  const getStatusMessage = () => {
    switch (uploadState.status) {
      case 'uploading':
        return 'Uploading file...';
      case 'detecting':
        return 'Detecting bank format...';
      case 'parsing':
        return `Parsing ${uploadState.bank} statement...`;
      case 'validating':
        return 'Validating transactions & calculating confidence...';
      case 'complete':
        return 'Processing complete!';
      case 'error':
        return uploadState.error;
      default:
        return null;
    }
  };

  const getStatusIcon = () => {
    if (uploadState.status === 'error') {
      return <AlertCircle className="w-5 h-5 text-destructive" />;
    }
    if (uploadState.status === 'complete') {
      return <CheckCircle className="w-5 h-5 text-success" />;
    }
    if (uploadState.status !== 'idle') {
      return <Loader2 className="w-5 h-5 text-primary animate-spin" />;
    }
    return null;
  };

  if (uploadState.status !== 'idle' && uploadState.status !== 'error') {
    return (
      <div className="glass-card rounded-xl p-8 animate-fade-in">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <span className="text-lg font-medium">{getStatusMessage()}</span>
          </div>
          
          {uploadState.bank && (
            <div className="badge-success">
              Detected: {uploadState.bank === 'SBI' ? 'State Bank of India' : 'South Indian Bank'}
            </div>
          )}

          <div className="w-full max-w-md">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>{uploadState.fileName}</span>
              <span>{uploadState.progress}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${uploadState.progress}%` }}
              />
            </div>
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
        className="hidden"
        onChange={handleFileSelect}
      />
      
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Upload className="w-8 h-8 text-primary" />
        </div>
        
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-1">
            Drop your bank statement here
          </h3>
          <p className="text-muted-foreground">
            or click to browse
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <FileText className="w-4 h-4" />
            <span>PDF only</span>
          </div>
          <div className="text-muted-foreground">•</div>
          <div className="text-muted-foreground">Max 10MB</div>
          <div className="text-muted-foreground">•</div>
          <div className="text-muted-foreground">SBI & SIB supported</div>
        </div>

        {uploadState.status === 'error' && (
          <div className="flex items-center gap-2 text-destructive bg-destructive/10 px-4 py-2 rounded-lg mt-2">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{uploadState.error}</span>
          </div>
        )}
      </div>
    </div>
  );
};
