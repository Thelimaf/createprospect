import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProspectCard } from './ProspectCard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Users, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  goal: string;
  context: string | null;
  tone: string;
}

interface Search {
  id: string;
  query: string;
  status: string;
  result_count: number;
  created_at: string;
}

interface SearchResult {
  id: string;
  search_id: string;
  item_id: string;
  name: string | null;
  url: string | null;
  enrichment_data: any;
  created_at: string;
}

interface CampaignResultsProps {
  campaign: Campaign;
}

export function CampaignResults({ campaign }: CampaignResultsProps) {
  const { user } = useAuth();
  const [searches, setSearches] = useState<Search[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSearchId, setSelectedSearchId] = useState<string | null>(null);

  useEffect(() => {
    loadSearches();

    // Inscrever para atualizações em tempo real
    const searchChannel = supabase
      .channel('campaign-searches')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'searches',
        filter: `campaign_id=eq.${campaign.id}`
      }, () => {
        loadSearches();
      })
      .subscribe();

    const resultsChannel = supabase
      .channel('campaign-results')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'search_results'
      }, (payload) => {
        if (payload.new) {
          setResults(prev => {
            if (prev.some(r => r.id === (payload.new as SearchResult).id)) return prev;
            return [...prev, payload.new as SearchResult];
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(searchChannel);
      supabase.removeChannel(resultsChannel);
    };
  }, [campaign.id]);

  useEffect(() => {
    if (selectedSearchId) {
      loadResults(selectedSearchId);
    }
  }, [selectedSearchId]);

  const loadSearches = async () => {
    try {
      const { data, error } = await supabase
        .from('searches')
        .select('*')
        .eq('campaign_id', campaign.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSearches(data || []);

      // Auto-selecionar primeira busca se nenhuma selecionada
      if (!selectedSearchId && data && data.length > 0) {
        setSelectedSearchId(data[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar buscas:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadResults = async (searchId: string) => {
    try {
      const { data, error } = await supabase
        .from('search_results')
        .select('*')
        .eq('search_id', searchId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setResults(data || []);
    } catch (error) {
      console.error('Erro ao carregar resultados:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      case 'timeout':
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Concluído';
      case 'processing':
        return 'Processando...';
      case 'timeout':
        return 'Tempo esgotado';
      case 'error':
        return 'Erro';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Carregando buscas...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (searches.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="py-12 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium text-foreground">Nenhuma busca ainda</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Use o formulário acima para buscar prospects.
          </p>
        </CardContent>
      </Card>
    );
  }

  const selectedSearch = searches.find(s => s.id === selectedSearchId);
  const filteredResults = results.filter(r => r.search_id === selectedSearchId);

  return (
    <div className="space-y-6">
      {/* Abas de Busca */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Users className="h-5 w-5 text-primary" />
            Resultados da Busca
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {searches.map((search) => (
              <Button
                key={search.id}
                variant={selectedSearchId === search.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedSearchId(search.id)}
                className={selectedSearchId === search.id 
                  ? 'bg-primary text-primary-foreground' 
                  : 'border-border text-foreground hover:bg-secondary'}
              >
                <span className="mr-2">{getStatusIcon(search.status)}</span>
                <span className="max-w-[150px] truncate">{search.query}</span>
                {search.result_count > 0 && (
                  <Badge variant="secondary" className="ml-2 bg-secondary/50 text-secondary-foreground">
                    {search.result_count}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Info da Busca Selecionada */}
      {selectedSearch && (
        <Card className="border-border bg-card">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getStatusIcon(selectedSearch.status)}
                <div>
                  <p className="font-medium text-foreground">{selectedSearch.query}</p>
                  <p className="text-sm text-muted-foreground">
                    {getStatusLabel(selectedSearch.status)}
                    {selectedSearch.status === 'completed' && ` · ${selectedSearch.result_count} prospects encontrados`}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grid de Resultados */}
      {filteredResults.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredResults.map((result) => (
            <ProspectCard key={result.id} result={result} campaign={campaign} />
          ))}
        </div>
      ) : selectedSearch?.status === 'processing' ? (
        <Card className="border-border bg-card">
          <CardContent className="py-12 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <h3 className="mt-4 text-lg font-medium text-foreground">Buscando prospects...</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Isso geralmente leva 30-60 segundos. Os resultados aparecerão automaticamente.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border bg-card">
          <CardContent className="py-12 text-center">
            <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium text-foreground">Nenhum prospect encontrado</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Tente ajustar sua consulta ou critérios de busca.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
