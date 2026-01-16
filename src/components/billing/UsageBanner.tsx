import { useUserPlan } from '@/hooks/useUserPlan';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Info, AlertTriangle, Lock, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

export function UsageBanner() {
  const { isFree, searchesUsed, searchesLimit, isLoading } = useUserPlan();
  const [dismissed, setDismissed] = useState(false);

  if (isLoading || !isFree) {
    return null;
  }

  // Don't show if no searches used
  if (searchesUsed === 0) {
    return null;
  }

  // Determine banner variant based on usage
  const usagePercent = (searchesUsed / searchesLimit) * 100;
  const isLastSearch = searchesUsed === searchesLimit - 1;
  const isLimitReached = searchesUsed >= searchesLimit;

  // If at limit, show critical banner (cannot dismiss)
  if (isLimitReached) {
    return (
      <div className="sticky top-0 z-50">
        <Alert className="rounded-none border-x-0 border-t-0 bg-destructive/10 border-destructive/30 text-destructive">
          <Lock className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between w-full">
            <span className="font-medium">
              Limite atingido! Faça upgrade para continuar buscando.
            </span>
            <Button asChild size="sm" variant="destructive">
              <Link to="/pricing">Fazer Upgrade</Link>
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // If only 1 search left, show warning (cannot dismiss)
  if (isLastSearch) {
    return (
      <div className="sticky top-0 z-50">
        <Alert className="rounded-none border-x-0 border-t-0 bg-yellow-500/10 border-yellow-500/30 text-yellow-400">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between w-full">
            <span className="font-medium">
              ⚠️ Atenção! Resta apenas 1 busca grátis.
            </span>
            <Button asChild size="sm" variant="outline" className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10">
              <Link to="/pricing">Fazer Upgrade</Link>
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // First search used, show info banner (can dismiss)
  if (dismissed) {
    return null;
  }

  return (
    <div className="sticky top-0 z-50">
      <Alert className="rounded-none border-x-0 border-t-0 bg-blue-500/10 border-blue-500/30 text-blue-400">
        <Info className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between w-full">
          <span>
            Você usou {searchesUsed} de {searchesLimit} buscas grátis.
          </span>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="ghost" className="text-blue-400 hover:text-blue-300">
              <Link to="/pricing">Ver Planos</Link>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-blue-400 hover:text-blue-300"
              onClick={() => setDismissed(true)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
