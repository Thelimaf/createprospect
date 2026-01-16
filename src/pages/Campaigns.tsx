import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  FolderOpen, 
  Plus, 
  Trash2,
  Clock,
  Search,
  Users
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface Campaign {
  id: string;
  name: string;
  goal: string;
  tone: string;
  created_at: string;
  searchCount?: number;
  prospectCount?: number;
}

export default function Campaigns() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadCampaigns();
    }
  }, [user]);

  const loadCampaigns = async () => {
    try {
      const { data: campaignsData, error } = await supabase
        .from('campaigns')
        .select('id, name, goal, tone, created_at')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Obter contagens de busca e leads para cada campanha
      const campaignsWithStats = await Promise.all(
        (campaignsData || []).map(async (campaign) => {
          // Buscar de google_maps_searches (tabela correta)
          const { data: gmSearches } = await supabase
            .from('google_maps_searches')
            .select('id')
            .eq('campaign_id', campaign.id);
          
          // Contar leads reais da campanha
          const { count: leadsCount } = await supabase
            .from('google_maps_leads')
            .select('id', { count: 'exact', head: true })
            .eq('campaign_id', campaign.id);
          
          return {
            ...campaign,
            searchCount: gmSearches?.length || 0,
            prospectCount: leadsCount || 0,
          };
        })
      );

      setCampaigns(campaignsWithStats);
    } catch (error) {
      console.error('Erro ao carregar campanhas:', error);
      toast.error('Falha ao carregar campanhas');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;

      setCampaigns(campaigns.filter(c => c.id !== deleteId));
      toast.success('Campanha excluída');
    } catch (error) {
      console.error('Erro ao excluir campanha:', error);
      toast.error('Falha ao excluir campanha');
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <AppShell title="Campanhas">
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground">
              Gerencie suas campanhas de descoberta de prospects.
            </p>
          </div>
          <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Link to="/campaigns/new">
              <Plus className="mr-2 h-4 w-4" />
              Nova Campanha
            </Link>
          </Button>
        </div>

        {/* Lista de Campanhas */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-border bg-card">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="h-6 w-32 animate-pulse rounded bg-secondary" />
                    <div className="h-4 w-48 animate-pulse rounded bg-secondary/50" />
                    <div className="flex gap-4">
                      <div className="h-4 w-20 animate-pulse rounded bg-secondary/50" />
                      <div className="h-4 w-20 animate-pulse rounded bg-secondary/50" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <Card className="border-border bg-card">
            <CardContent className="py-16 text-center">
              <FolderOpen className="mx-auto h-16 w-16 text-muted-foreground/50" />
              <h3 className="mt-4 text-xl font-medium text-foreground">Nenhuma campanha ainda</h3>
              <p className="mt-2 text-muted-foreground">
                Crie sua primeira campanha para começar a descobrir prospects.
              </p>
              <Button asChild className="mt-6 bg-primary text-primary-foreground hover:bg-primary/90">
                <Link to="/campaigns/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Campanha
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((campaign) => (
              <Card 
                key={campaign.id} 
                className="group border-border bg-card transition-all hover:border-primary/50 hover:shadow-glow"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <Link to={`/campaigns/${campaign.id}`} className="flex-1 min-w-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-4">
                        <FolderOpen className="h-5 w-5 text-primary" />
                      </div>
                      <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                        {campaign.name}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                        {campaign.goal}
                      </p>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                      onClick={(e) => {
                        e.preventDefault();
                        setDeleteId(campaign.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Search className="h-4 w-4" />
                      <span>{campaign.searchCount} buscas</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{campaign.prospectCount} prospects</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {format(new Date(campaign.created_at), "d 'de' MMM, yyyy", { locale: ptBR })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Diálogo de Confirmação de Exclusão */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Excluir Campanha</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Isso excluirá permanentemente esta campanha e todas as suas buscas. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-foreground hover:bg-secondary">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
