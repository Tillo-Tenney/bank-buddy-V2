import { Shield, Clock } from 'lucide-react';

interface PrivacyBadgeProps {
  timeRemaining: number;
}

export const PrivacyBadge = ({ timeRemaining }: PrivacyBadgeProps) => {
  return (
    <div className="flex items-center gap-4">
      <div className="privacy-badge">
        <Shield className="w-4 h-4" />
        <span>No Data Stored</span>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="w-4 h-4" />
        <span>Auto-delete in {timeRemaining} min</span>
      </div>
    </div>
  );
};
