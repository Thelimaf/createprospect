import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Search, Loader2, MapPin, FolderOpen } from 'lucide-react';
import { SourceToggle, type SourceType } from './SourceToggle';
import { SourceInfoCard } from './SourceInfoCard';
import { SearchFilters, type SearchFiltersData } from './SearchFilters';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCheckLimit } from '@/hooks/useCheckLimit';
import type { Tables } from '@/integrations/supabase/types';

type Campaign = Tables<'campaigns'>;

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
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('none');

  // Load campaigns
  useEffect(() => {
    if (user) {
      loadCampaigns();
    }
  }, [user]);

  const loadCampaigns = async () => {
    const { data } = await supabase
      .from('campaigns')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });
    
    setCampaigns(data || []);
  };

  const handleSearch = async () => {
    if (!filters.term.trim()) {
      toast.error('Digite o tipo de negócio que deseja buscar');
      return;
    }

    if (!filters.city.trim()) {
      toast.error('Digite a cidade para buscar');
      return;
    }

    // Campaign is now required
    if (selectedCampaign === 'none') {
      toast.error('Selecione uma campanha para salvar os leads');
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

      const campaignId = selectedCampaign !== 'none' ? selectedCampaign : null;

      if (source === 'google_maps') {
        // Use existing Google Maps scraper
        const { data, error } = await supabase.functions.invoke('scrape-google-maps', {
          body: { 
            query, 
            limit: filters.quantity,
            user_id: user?.id,
            campaignId,
          },
        });

        if (error) throw error;

        // Increment usage after successful search
        await incrementUsage();

        const leadsFound = data?.leads_saved || 0;
        toast.success(`${leadsFound} leads encontrados e salvos!`);
      } else {
        // Use Firecrawl business search with data extraction
        const { data, error } = await supabase.functions.invoke('firecrawl-business-search', {
          body: { 
            query,
            limit: filters.quantity,
            user_id: user?.id,
            campaignId,
          },
        });

        if (error) throw error;

        // Increment usage after successful search
        await incrementUsage();

        const leadsFound = data?.leads_saved || 0;
        const totalFound = data?.total_found || 0;
        toast.success(`${leadsFound} leads salvos de ${totalFound} resultados encontrados!`);
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

        {/* Campaign Selector - Required */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-foreground">
            <FolderOpen className="h-4 w-4 text-primary" />
            Campanha de destino <span className="text-destructive">*</span>
          </Label>
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger className={`w-full ${selectedCampaign === 'none' ? 'border-destructive/50' : ''}`}>
              <SelectValue placeholder="Selecione uma campanha" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none" disabled>
                Selecione uma campanha
              </SelectItem>
              {campaigns.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {campaigns.length === 0 ? (
            <p className="text-xs text-destructive">
              Você precisa criar uma campanha primeiro para organizar seus leads
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Os leads serão salvos diretamente na campanha selecionada
            </p>
          )}
        </div>

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
