import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Lock, Check, Crown, ArrowRight, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export type UpgradeModalVariant = 'last_search' | 'limit_reached' | 'feature_locked';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant: UpgradeModalVariant;
  featureName?: string;
  featureDescription?: string;
  onContinueLastSearch?: () => void;
}

export function UpgradeModal({
  open,
  onOpenChange,
  variant,
  featureName,
  featureDescription,
  onContinueLastSearch,
}: UpgradeModalProps) {
  const starterBenefits = [
    '100 buscas por mês',
    '~2.000 clientes/mês',
    'Campanhas ilimitadas',
    'Export direto pra CSV',
    'WhatsApp com 1 clique',
    'Templates de mensagem',
    'Analytics de conversão',
  ];

  // Last search warning
  if (variant === 'last_search') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-yellow-500" />
              </div>
            </div>
            <DialogTitle className="text-center text-xl">
              ⚠️ Esta é sua última busca grátis!
            </DialogTitle>
            <DialogDescription className="text-center">
              Você usou 2 de 3 buscas do plano Free. Após esta busca, você precisará fazer upgrade para continuar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-4">
            <Button
              onClick={() => {
                onOpenChange(false);
                onContinueLastSearch?.();
              }}
              variant="outline"
              className="w-full"
            >
              Entendi, Fazer Última Busca
            </Button>
            <Button asChild className="w-full">
              <Link to="/checkout" onClick={() => onOpenChange(false)}>
                <Crown className="h-4 w-4 mr-2" />
                Fazer Upgrade Agora - R$ 27,90/mês
              </Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Limit reached - no close option
  if (variant === 'limit_reached') {
    return (
      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent className="max-w-md [&>button]:hidden">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="h-20 w-20 rounded-full bg-destructive/20 flex items-center justify-center">
                <Lock className="h-10 w-10 text-destructive" />
              </div>
            </div>
            <DialogTitle className="text-center text-xl">
              Você atingiu o limite do plano Free
            </DialogTitle>
            <DialogDescription className="text-center">
              Você já encontrou aproximadamente 60 empresas grátis. Para continuar prospectando, faça upgrade para o plano Starter.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-muted/50 rounded-lg p-4 my-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Crown className="h-4 w-4 text-primary" />
              Benefícios do Starter
            </h4>
            <ul className="space-y-2">
              {starterBenefits.map((benefit) => (
                <li key={benefit} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>

          <div className="text-center mb-4">
            <div className="text-3xl font-bold text-primary">R$ 27,90</div>
            <div className="text-sm text-muted-foreground">/mês para até 2 mil clientes</div>
          </div>

          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground mb-4">
            <div className="flex items-center gap-1">
              <div className="h-6 w-6 rounded bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-400">
                PIX
              </div>
            </div>
            <span>Pagamento Seguro</span>
          </div>

          <Button asChild size="lg" className="w-full">
            <Link to="/checkout">
              Assinar Agora
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  // Feature locked
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
              <Lock className="h-8 w-8 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">
            {featureName || 'Feature'} disponível no Starter
          </DialogTitle>
          <DialogDescription className="text-center">
            {featureDescription || 'Esta funcionalidade está disponível apenas no plano Starter.'}
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted/50 rounded-lg p-4 my-4">
          <ul className="space-y-2">
            {starterBenefits.slice(0, 4).map((benefit) => (
              <li key={benefit} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>

        <Button asChild className="w-full">
          <Link to="/pricing" onClick={() => onOpenChange(false)}>
            <Crown className="h-4 w-4 mr-2" />
            Conhecer Plano Starter
          </Link>
        </Button>
      </DialogContent>
    </Dialog>
  );
}
