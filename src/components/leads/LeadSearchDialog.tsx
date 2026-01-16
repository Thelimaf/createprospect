import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { useCheckLimit } from '@/hooks/useCheckLimit';
import { UpgradeModal, UpgradeModalVariant } from '@/components/billing/UpgradeModal';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { Search, Loader2, MapPin } from 'lucide-react';

interface LeadSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  campaignName: string;
  onSearchComplete: () => void;
}

export function LeadSearchDialog({
  open,
  onOpenChange,
  campaignId,
  campaignName,
  onSearchComplete,
}: LeadSearchDialogProps) {
  const { checkLimit, incrementUsage, isChecking } = useCheckLimit();
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState([20]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Upgrade modal state
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeModalVariant, setUpgradeModalVariant] = useState<UpgradeModalVariant>('limit_reached');

  const handleSearch = async () => {
    if (!query.trim()) {
      toast.error('Digite uma busca');
      return;
    }

    // Check user limits before searching
    const limitResult = await checkLimit();
    
    if (!limitResult.allowed) {
      setUpgradeModalVariant('limit_reached');
      setUpgradeModalOpen(true);
      return;
    }

    if (limitResult.is_last_search) {
      setUpgradeModalVariant('last_search');
      setUpgradeModalOpen(true);
      return;
    }

    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('scrape-google-maps', {
        body: { 
          query, 
          limit: limit[0], 
          page: 1, 
          campaignId,
          mode: 'normal',
        },
      });

      if (error) throw error;

      // Increment usage after successful search
      await incrementUsage();

      const stats = data.stats || { new: data.count, existing: 0, updated: 0 };
      
      // Check if this is first search for confetti
      const isFirstSearch = stats.new > 0 && stats.existing === 0;
      
      if (isFirstSearch) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      }

      toast.success(
        `${stats.new} clientes encontrados!`,
        {
          action: {
            label: 'Ver Todos',
            onClick: () => onSearchComplete(),
          },
        }
      );

      setQuery('');
      onSearchComplete();
    } catch (error: any) {
      console.error('Error scraping:', error);
      toast.error(error.message || 'Erro ao buscar clientes');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md bg-card border-border backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <MapPin className="h-5 w-5 text-primary" />
              Buscar Leads
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Encontre clientes no Google Maps para "{campaignName}"
            </p>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Search Input */}
            <div className="space-y-2">
              <Label htmlFor="search-query" className="text-foreground">
                O que você procura?
              </Label>
              <Input
                id="search-query"
                placeholder="Encontre clientes no seu bairro"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="h-12 text-base bg-input border-border"
              />
            </div>

            {/* Quantity Slider */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-foreground">Quantidade</Label>
                <Badge variant="secondary" className="px-3">
                  {limit[0]} leads
                </Badge>
              </div>
              <Slider
                value={limit}
                onValueChange={setLimit}
                min={5}
                max={100}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>5</span>
                <span>100</span>
              </div>
            </div>

            {/* Search Button */}
            <Button
              onClick={handleSearch}
              disabled={isLoading || isChecking}
              className="w-full h-12 text-base"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Buscando...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-5 w-5" />
                  Buscar Leads
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upgrade Modal */}
      <UpgradeModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
        variant={upgradeModalVariant}
      />
    </>
  );
}
