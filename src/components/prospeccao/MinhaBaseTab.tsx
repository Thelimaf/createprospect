import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  FolderOpen, 
  ArrowRight, 
  Building2,
  Phone,
  Globe,
  MapPin,
  AlertTriangle,
  MoveRight,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Lead = Tables<'google_maps_leads'>;
type Campaign = Tables<'campaigns'>;

export function MinhaBaseTab() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [orphanLeads, setOrphanLeads] = useState<Lead[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [moving, setMoving] = useState(false);
  const [total, setTotal] = useState(0);
  const [orphanCount, setOrphanCount] = useState(0);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      loadLeads();
      loadCampaigns();
    }
  }, [user]);

  // Realtime subscription for auto-refresh
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('minha-base-leads-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'google_maps_leads',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadLeads();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadLeads = async () => {
    try {
      // Get total count
      const { count } = await supabase
        .from('google_maps_leads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id);

      setTotal(count || 0);

      // Get orphan count
      const { count: orphans } = await supabase
        .from('google_maps_leads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .is('campaign_id', null);

      setOrphanCount(orphans || 0);

      // Get recent leads with campaign
      const { data } = await supabase
        .from('google_maps_leads')
        .select('*')
        .eq('user_id', user!.id)
        .not('campaign_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10);

      setLeads(data || []);

      // Get orphan leads
      const { data: orphanData } = await supabase
        .from('google_maps_leads')
        .select('*')
        .eq('user_id', user!.id)
        .is('campaign_id', null)
        .order('created_at', { ascending: false })
        .limit(50);

      setOrphanLeads(orphanData || []);
    } catch (error) {
      console.error('Error loading leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCampaigns = async () => {
    const { data } = await supabase
      .from('campaigns')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });
    
    setCampaigns(data || []);
  };

  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeads(prev => 
      prev.includes(leadId) 
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  const selectAllOrphans = () => {
    if (selectedLeads.length === orphanLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(orphanLeads.map(l => l.id));
    }
  };

  const moveSelectedToCampaign = async () => {
    if (!selectedCampaign || selectedLeads.length === 0) {
      toast.error('Selecione uma campanha e pelo menos um lead');
      return;
    }

    setMoving(true);
    try {
      const { error } = await supabase
        .from('google_maps_leads')
        .update({ campaign_id: selectedCampaign })
        .in('id', selectedLeads);

      if (error) throw error;

      toast.success(`${selectedLeads.length} leads movidos com sucesso!`);
      setSelectedLeads([]);
      loadLeads();
    } catch (error) {
      console.error('Error moving leads:', error);
      toast.error('Erro ao mover leads');
    } finally {
      setMoving(false);
    }
  };

  const moveAllOrphansToCampaign = async () => {
    if (!selectedCampaign) {
      toast.error('Selecione uma campanha destino');
      return;
    }

    setMoving(true);
    try {
      const { error } = await supabase
        .from('google_maps_leads')
        .update({ campaign_id: selectedCampaign })
        .is('campaign_id', null)
        .eq('user_id', user!.id);

      if (error) throw error;

      toast.success(`${orphanCount} leads movidos com sucesso!`);
      setSelectedLeads([]);
      loadLeads();
    } catch (error) {
      console.error('Error moving leads:', error);
      toast.error('Erro ao mover leads');
    } finally {
      setMoving(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="p-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (leads.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="py-12 text-center">
          <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium text-foreground">Nenhum lead na base</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Use a aba "Prospectar" para buscar novos leads
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alerta de Leads Órfãos */}
      {orphanCount > 0 && (
        <Card className="border-amber-500/50 bg-amber-500/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
              {orphanCount} leads sem campanha
            </CardTitle>
            <p className="text-sm text-amber-600 dark:text-amber-500 mt-1">
              Esses leads precisam ser vinculados a uma campanha para organização
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {campaigns.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-3">
                  Você precisa criar uma campanha primeiro
                </p>
                <Button asChild>
                  <Link to="/campaigns/new">Criar Campanha</Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                    <SelectTrigger className="flex-1 bg-background">
                      <SelectValue placeholder="Selecione a campanha destino" />
                    </SelectTrigger>
                    <SelectContent>
                      {campaigns.map((campaign) => (
                        <SelectItem key={campaign.id} value={campaign.id}>
                          {campaign.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={moveAllOrphansToCampaign}
                    disabled={!selectedCampaign || moving}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    {moving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <MoveRight className="h-4 w-4 mr-2" />
                    )}
                    Mover todos ({orphanCount})
                  </Button>
                </div>

                {/* Lista de leads órfãos para seleção individual */}
                <div className="border-t border-amber-500/30 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        checked={selectedLeads.length === orphanLeads.length && orphanLeads.length > 0}
                        onCheckedChange={selectAllOrphans}
                      />
                      <span className="text-sm text-muted-foreground">
                        {selectedLeads.length > 0 
                          ? `${selectedLeads.length} selecionados`
                          : 'Selecionar todos'}
                      </span>
                    </div>
                    {selectedLeads.length > 0 && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={moveSelectedToCampaign}
                        disabled={!selectedCampaign || moving}
                      >
                        {moving ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <MoveRight className="h-4 w-4 mr-2" />
                        )}
                        Mover selecionados
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {orphanLeads.map((lead) => (
                      <div 
                        key={lead.id} 
                        className="flex items-center gap-3 p-3 rounded-lg bg-background/50 hover:bg-background transition-colors"
                      >
                        <Checkbox 
                          checked={selectedLeads.includes(lead.id)}
                          onCheckedChange={() => toggleLeadSelection(lead.id)}
                        />
                        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{lead.business_name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {lead.category} {lead.city && `• ${lead.city}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {orphanCount > 50 && (
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      Mostrando 50 de {orphanCount} leads órfãos
                    </p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Resumo da Base */}
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <FolderOpen className="h-5 w-5 text-primary" />
              Minha Base
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {total} leads salvos • {total - orphanCount} em campanhas
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/campaigns">
              Ver Campanhas
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {leads.length === 0 && orphanCount === 0 ? (
            <div className="py-8 text-center">
              <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium text-foreground">Nenhum lead na base</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Use a aba "Prospectar" para buscar novos leads
              </p>
            </div>
          ) : leads.length === 0 ? (
            <div className="py-4 text-center">
              <p className="text-sm text-muted-foreground">
                Todos os leads estão sem campanha. Organize-os acima!
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {leads.map((lead) => (
                  <div 
                    key={lead.id} 
                    className="flex items-start gap-4 p-4 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground truncate">{lead.business_name}</h4>
                      <div className="flex flex-wrap items-center gap-3 mt-1">
                        {lead.category && (
                          <span className="text-xs text-muted-foreground">{lead.category}</span>
                        )}
                        {lead.city && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {lead.city}{lead.state ? `, ${lead.state}` : ''}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {lead.phone && (
                          <Badge variant="secondary" className="text-xs">
                            <Phone className="h-3 w-3 mr-1" />
                            Telefone
                          </Badge>
                        )}
                        {lead.website && (
                          <Badge variant="secondary" className="text-xs">
                            <Globe className="h-3 w-3 mr-1" />
                            Website
                          </Badge>
                        )}
                        {lead.cnpj && (
                          <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                            CNPJ
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {(total - orphanCount) > 10 && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    Mostrando 10 de {total - orphanCount} leads em campanhas.
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
