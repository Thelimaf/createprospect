import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  description?: string;
  iconColor?: string;
  valueColor?: string;
}

export function MetricCard({
  title,
  value,
  icon: Icon,
  trend,
  trendDirection = 'neutral',
  description,
  iconColor = 'text-muted-foreground',
  valueColor,
}: MetricCardProps) {
  return (
    <Card className="bg-card/50 border-border/50 backdrop-blur-sm hover:bg-card/70 transition-colors">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              <span className={cn("text-2xl font-bold tracking-tight", valueColor)}>
                {value}
              </span>
              {trend && (
                <span
                  className={cn(
                    "text-xs font-medium px-1.5 py-0.5 rounded",
                    trendDirection === 'up' && "text-emerald-500 bg-emerald-500/10",
                    trendDirection === 'down' && "text-red-500 bg-red-500/10",
                    trendDirection === 'neutral' && "text-muted-foreground bg-muted"
                  )}
                >
                  {trend}
                </span>
              )}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div className={cn("p-2.5 rounded-lg bg-muted/50", iconColor)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
