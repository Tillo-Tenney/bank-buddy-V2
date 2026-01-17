import { useState } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface DeleteDataButtonProps {
  onDelete: () => void;
}

export const DeleteDataButton = ({ onDelete }: DeleteDataButtonProps) => {
  const [open, setOpen] = useState(false);

  const handleDelete = () => {
    onDelete();
    setOpen(false);
    toast.success('All session data has been deleted', {
      description: 'Your data has been permanently removed.',
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive">
          <Trash2 className="w-4 h-4" />
          Delete My Data Now
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Delete All Session Data
          </DialogTitle>
          <DialogDescription>
            This will permanently delete all uploaded files and parsed transactions from this session. 
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="bg-muted rounded-lg p-4 text-sm">
          <p className="font-medium mb-2">The following will be deleted:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Uploaded PDF file</li>
            <li>All parsed transactions</li>
            <li>Analytics and summaries</li>
            <li>Session metadata</li>
          </ul>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            Delete Everything
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
