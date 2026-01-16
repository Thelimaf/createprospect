import { useUserPlan } from '@/hooks/useUserPlan';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Crown, Search, Calendar, Users, Infinity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function UsageCard() {
  const { 
    isPro, 
    isFree, 
    isLoading, 
    searchesUsed, 
    searchesLimit, 
    searchesRemaining,
    subscription 
  } = useUserPlan();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-10 w-32" />
        </CardContent>
      </Card>
    );
  }

  const usagePercent = (searchesUsed / searchesLimit) * 100;
  const estimatedLeads = searchesUsed * 20;
  const potentialLeads = searchesRemaining * 20;

  // Progress bar color based on usage
  const getProgressColor = () => {
    if (usagePercent >= 80) return 'bg-destructive';
    if (usagePercent >= 50) return 'bg-yellow-500';
    return 'bg-primary';
  };

  if (isFree) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Search className="h-5 w-5 text-muted-foreground" />
            Seu Plano Free
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Buscas utilizadas</span>
              <span className="font-medium">
                {searchesUsed} de {searchesLimit}
              </span>
            </div>
            <div className="relative">
              <Progress value={usagePercent} className="h-2" />
              <div 
                className={cn("absolute top-0 left-0 h-full rounded-full transition-all", getProgressColor())}
                style={{ width: `${Math.min(usagePercent, 100)}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">~{estimatedLeads} clientes encontrados</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Search className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{searchesRemaining} buscas restantes</span>
            </div>
          </div>

          {searchesRemaining <= 1 && (
            <Button asChild className="w-full">
              <Link to="/pricing">
                <Crown className="h-4 w-4 mr-2" />
                Fazer Upgrade - R$ 27,90/mês
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // STARTER plan view
  const renewalDate = subscription?.current_period_end 
    ? format(new Date(subscription.current_period_end), "dd 'de' MMMM", { locale: ptBR })
    : null;

  return (
    <Card className="border-primary/30">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <Crown className="h-5 w-5 text-primary" />
          Plano Starter
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
            Ativo
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Search className="h-4 w-4" />
              Buscas este mês
            </div>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{searchesUsed}</span>
              <span className="text-muted-foreground">/ {searchesLimit}</span>
            </div>
            <div className="relative">
              <Progress value={usagePercent} className="h-2" />
              <div 
                className={cn("absolute top-0 left-0 h-full rounded-full transition-all", getProgressColor())}
                style={{ width: `${Math.min(usagePercent, 100)}%` }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Renova em
            </div>
            <div className="text-2xl font-bold">{renewalDate || '-'}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-primary" />
            <span>~{potentialLeads.toLocaleString('pt-BR')} clientes possíveis</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Infinity className="h-4 w-4 text-primary" />
            <span>Campanhas ilimitadas</span>
          </div>
        </div>

        <Button asChild variant="outline" className="w-full">
          <Link to="/billing">
            Gerenciar Assinatura
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
