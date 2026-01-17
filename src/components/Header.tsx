import { FileText, Shield } from 'lucide-react';
import { PrivacyBadge } from './PrivacyBadge';

interface HeaderProps {
  timeRemaining: number;
  showPrivacy: boolean;
}

export const Header = ({ timeRemaining, showPrivacy }: HeaderProps) => {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold">StatementParser</h1>
            <p className="text-xs text-muted-foreground">Bank Statement Analysis MVP</p>
          </div>
        </div>

        {showPrivacy && <PrivacyBadge timeRemaining={timeRemaining} />}
      </div>
    </header>
  );
};
