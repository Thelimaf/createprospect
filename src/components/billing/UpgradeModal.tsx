import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Lock, Check, Crown, ArrowRight, Search, Users, BarChart3, FileSpreadsheet, MessageCircle, FileText, TrendingUp, Sparkles } from 'lucide-react';
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
    { icon: Search, text: '100 buscas por mês', highlight: true },
    { icon: Users, text: '~2.000 clientes/mês', highlight: true },
    { icon: BarChart3, text: 'Campanhas ilimitadas' },
    { icon: FileSpreadsheet, text: 'Export direto pra CSV' },
    { icon: MessageCircle, text: 'WhatsApp com 1 clique' },
    { icon: FileText, text: 'Templates de mensagem' },
    { icon: TrendingUp, text: 'Analytics de conversão' },
  ];

  const simpleBenefits = [
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

  // Limit reached - premium design with benefits
  if (variant === 'limit_reached') {
    return (
      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent className="max-w-lg [&>button]:hidden overflow-hidden p-0 border-purple-500/20">
          {/* Header with gradient background */}
          <div className="relative bg-gradient-to-br from-purple-950 via-purple-900/80 to-background px-6 pt-8 pb-6">
            {/* Decorative glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-purple-500/30 rounded-full blur-3xl" />
            
            {/* Lock icon with glow */}
            <div className="relative flex items-center justify-center mb-5">
              <div className="absolute h-24 w-24 rounded-full bg-purple-500/20 animate-pulse" />
              <div className="relative h-20 w-20 rounded-full bg-gradient-to-br from-purple-500/30 to-purple-600/20 flex items-center justify-center border border-purple-500/30">
                <Lock className="h-9 w-9 text-purple-400" />
              </div>
            </div>
            
            <DialogHeader className="relative">
              <DialogTitle className="text-center text-2xl font-bold text-white">
                Você usou todas as buscas grátis
              </DialogTitle>
              <DialogDescription className="text-center text-purple-200/80 text-base mt-2">
                Você já encontrou <span className="text-purple-300 font-medium">~60 empresas</span> de graça!
                <br />
                Continue prospectando com o plano Starter.
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Benefits section */}
          <div className="px-6 py-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-6 w-6 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Sparkles className="h-3.5 w-3.5 text-purple-400" />
              </div>
              <h4 className="font-semibold text-foreground">Plano Starter</h4>
            </div>
            
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              {starterBenefits.map(({ icon: Icon, text, highlight }) => (
                <div 
                  key={text} 
                  className={cn(
                    "flex items-center gap-2.5 text-sm",
                    highlight && "text-foreground font-medium"
                  )}
                >
                  <div className={cn(
                    "h-7 w-7 rounded-lg flex items-center justify-center shrink-0",
                    highlight 
                      ? "bg-purple-500/20 text-purple-400" 
                      : "bg-muted text-muted-foreground"
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className={cn(!highlight && "text-muted-foreground")}>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing section */}
          <div className="px-6 pb-6 space-y-4">
            {/* Price card */}
            <div className="bg-gradient-to-r from-purple-500/10 to-purple-600/5 rounded-xl p-4 border border-purple-500/20">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-3xl font-bold text-purple-400">R$ 27,90</span>
                <span className="text-muted-foreground">/mês</span>
              </div>
              <p className="text-center text-sm text-muted-foreground mt-1">
                Menos de <span className="text-purple-400 font-medium">R$ 0,02</span> por cliente encontrado
              </p>
            </div>

            {/* CTA Button */}
            <Button 
              asChild 
              size="lg" 
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 shadow-lg shadow-purple-500/25"
            >
              <Link to="/checkout">
                <Crown className="h-5 w-5 mr-2" />
                Assinar Agora com PIX
                <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
            </Button>

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-6 pt-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Check className="h-3.5 w-3.5 text-green-500" />
                Cancele quando quiser
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Check className="h-3.5 w-3.5 text-green-500" />
                Sem compromisso
              </div>
            </div>
          </div>
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
            {simpleBenefits.slice(0, 4).map((benefit) => (
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
