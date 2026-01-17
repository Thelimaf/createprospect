import { Link } from 'react-router-dom';
import { Lock, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface UpgradeLockProps {
  feature: 'whatsapp' | 'email' | 'phone' | 'address' | 'city' | 'category';
  showButton?: boolean;
  inline?: boolean;
}

const FEATURE_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  email: 'buscar emails',
  phone: 'ver telefones',
  address: 'ver endereços',
  city: 'ver cidades',
  category: 'ver categorias',
};

export function UpgradeLock({ feature, showButton = false, inline = false }: UpgradeLockProps) {
  const content = (
    <div className={inline ? 'inline-flex items-center gap-1' : 'flex flex-col items-center gap-2 p-2'}>
      <div className="flex items-center gap-1 text-muted-foreground">
        <Lock className="h-3 w-3" />
        <span className="text-xs">Upgrade para {FEATURE_LABELS[feature]}</span>
      </div>
      {showButton && (
        <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
          <Link to="/pricing">
            <Crown className="h-3 w-3 mr-1" />
            Ver Planos
          </Link>
        </Button>
      )}
    </div>
  );

  if (inline) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 text-muted-foreground cursor-help">
            <Lock className="h-3 w-3" />
            <span className="text-xs blur-sm select-none">*****</span>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-yellow-500" />
            <span>Disponível no plano Starter</span>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}
