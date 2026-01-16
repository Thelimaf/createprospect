import { useUserPlan } from '@/hooks/useUserPlan';
import { cn } from '@/lib/utils';
import { Crown, Sparkles } from 'lucide-react';

interface PlanBadgeProps {
  className?: string;
  showIcon?: boolean;
}

export function PlanBadge({ className, showIcon = true }: PlanBadgeProps) {
  const { isPro, isLoading } = useUserPlan();

  if (isLoading) {
    return (
      <div className={cn(
        "h-6 w-16 rounded-full bg-muted animate-pulse",
        className
      )} />
    );
  }

  if (isPro) {
    return (
      <div className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium",
        "bg-primary/20 text-primary border border-primary/30",
        "shadow-[0_0_10px_rgba(var(--primary),0.3)]",
        className
      )}>
        {showIcon && <Crown className="h-3 w-3" />}
        STARTER
      </div>
    );
  }

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium",
      "bg-muted text-muted-foreground",
      className
    )}>
      {showIcon && <Sparkles className="h-3 w-3" />}
      FREE
    </div>
  );
}
