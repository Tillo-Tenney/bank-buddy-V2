import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: ReactNode;
  trend?: 'positive' | 'negative' | 'neutral';
  onClick?: () => void;
  className?: string;
}

export const MetricCard = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  onClick,
  className,
}: MetricCardProps) => {
  const trendColors = {
    positive: 'text-success',
    negative: 'text-destructive',
    neutral: 'text-muted-foreground',
  };

  return (
    <div
      className={cn(
        'metric-card border border-border/50',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        {onClick && (
          <span className="text-xs text-primary font-medium">Click to verify →</span>
        )}
      </div>
      
      <h3 className="text-sm font-medium text-muted-foreground mb-1">{title}</h3>
      <p className={cn('text-2xl font-bold', trend && trendColors[trend])}>{value}</p>
      
      {subtitle && (
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      )}
    </div>
  );
};
