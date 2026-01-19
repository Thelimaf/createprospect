import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Loader2, MapPin } from 'lucide-react';
import { SourceToggle, type SourceType } from './SourceToggle';
import { SourceInfoCard } from './SourceInfoCard';
import { SearchFilters, type SearchFiltersData } from './SearchFilters';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCheckLimit } from '@/hooks/useCheckLimit';

export function ProspectarTab() {
  const { user } = useAuth();
  const { checkLimit, incrementUsage } = useCheckLimit();
  const [source, setSource] = useState<SourceType>('google_maps');
  const [filters, setFilters] = useState<SearchFiltersData>({
    term: '',
    segment: 'all',
    state: 'all',
    city: '',
    quantity: 20,
  });
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!filters.term.trim()) {
      toast.error('Digite o tipo de negócio que deseja buscar');
      return;
    }

    if (!filters.city.trim()) {
      toast.error('Digite a cidade para buscar');
      return;
    }

    // Check user limits
    const limitResult = await checkLimit();
    if (!limitResult.allowed) {
      toast.error(limitResult.message || 'Limite de buscas atingido');
      return;
    }

    setLoading(true);

    try {
      // Build query based on filters
      let query = filters.term;
      if (filters.segment !== 'all') {
        query += ` ${filters.segment}`;
      }
      query += ` em ${filters.city}`;
      if (filters.state !== 'all') {
        query += `, ${filters.state}`;
      }

      if (source === 'google_maps') {
        // Use existing Google Maps scraper
        const { data, error } = await supabase.functions.invoke('scrape-google-maps', {
          body: { 
            query, 
            limit: filters.quantity,
            user_id: user?.id,
          },
        });

        if (error) throw error;

        // Increment usage after successful search
        await incrementUsage();

        const leadsFound = data?.leads_saved || 0;
        toast.success(`${leadsFound} leads encontrados e salvos!`);
      } else {
        // Use Firecrawl for web search
        const { data, error } = await supabase.functions.invoke('firecrawl-search', {
          body: { 
            query: `${query} contato telefone email site`,
            options: {
              limit: filters.quantity,
              lang: 'pt-BR',
              country: 'BR',
            },
          },
        });

        if (error) throw error;

        // Increment usage after successful search
        await incrementUsage();

        const resultsCount = data?.data?.length || 0;
        toast.success(`${resultsCount} resultados encontrados na web!`);
      }
    } catch (error: any) {
      console.error('Search error:', error);
      toast.error(error.message || 'Erro ao buscar empresas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Search className="h-5 w-5 text-primary" />
          Buscar Empresas
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure os filtros e selecione a fonte de busca
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Source Toggle */}
        <SourceToggle value={source} onChange={setSource} />

        {/* Source Info Card */}
        <SourceInfoCard source={source} />

        {/* Filters */}
        <SearchFilters filters={filters} onChange={setFilters} />

        {/* Manual selection note */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
          <Checkbox id="manual" disabled checked />
          <div className="space-y-1">
            <label htmlFor="manual" className="text-sm font-medium text-foreground cursor-pointer">
              Salvar automaticamente na base
            </label>
            <p className="text-xs text-muted-foreground">
              Os leads encontrados serão salvos automaticamente na sua base para gerenciamento
            </p>
          </div>
        </div>

        {/* Search Button */}
        <Button 
          onClick={handleSearch} 
          disabled={loading}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Buscando...
            </>
          ) : (
            <>
              <MapPin className="h-4 w-4 mr-2" />
              Buscar Empresas
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
