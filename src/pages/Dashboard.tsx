import { useEffect, useState } from "react";
import { Link, useSearchParams } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  FolderOpen, 
  Search, 
  Users, 
  Plus, 
  ArrowRight,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { UsageBanner } from '@/components/billing/UsageBanner';
import { UsageCard } from '@/components/billing/UsageCard';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

interface Stats {
  totalCampaigns: number;
  totalSearches: number;
  totalProspects: number;
}

interface Campaign {
  id: string;
  name: string;
  goal: string;
  created_at: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [stats, setStats] = useState<Stats>({ totalCampaigns: 0, totalSearches: 0, totalProspects: 0 });
  const [recentCampaigns, setRecentCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  // Check for payment success
  useEffect(() => {
    if (searchParams.get('payment') === 'success') {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
      toast.success('Parabéns! Você agora tem acesso completo ao Starter 🚀');
      // Remove query param without reload
      window.history.replaceState({}, '', '/dashboard');
    }
  }, [searchParams]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      // Carregar contagem de campanhas
      const { count: campaignCount } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id);

      // Carregar contagem de buscas (tabela correta: google_maps_searches)
      const { count: searchCount } = await supabase
        .from('google_maps_searches')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id);

      // Carregar total de prospects (tabela correta: google_maps_leads)
      const { count: totalProspects } = await supabase
        .from('google_maps_leads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id);

      setStats({
        totalCampaigns: campaignCount || 0,
        totalSearches: searchCount || 0,
        totalProspects: totalProspects || 0,
      });

      // Carregar campanhas recentes
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id, name, goal, created_at')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentCampaigns(campaigns || []);
    } catch (error) {
      console.error('Erro ao carregar dados do painel:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: 'Total de Campanhas', value: stats.totalCampaigns, icon: FolderOpen, color: 'text-primary' },
    { title: 'Total de Buscas', value: stats.totalSearches, icon: Search, color: 'text-accent' },
    { title: 'Prospects Encontrados', value: stats.totalProspects, icon: Users, color: 'text-purple-500' },
  ];

  return (
    <AppShell title="Painel">
      <UsageBanner />
      <div className="space-y-8 pt-4">
        {/* Seção de Boas-vindas */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Bem-vindo de volta{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name.split(' ')[0]}` : ''}!
            </h2>
            <p className="text-muted-foreground">Veja o que está acontecendo com suas campanhas.</p>
          </div>
          <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Link to="/campaigns/new">
              <Plus className="mr-2 h-4 w-4" />
              Nova Campanha
            </Link>
          </Button>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {statCards.map((stat) => (
            <Card key={stat.title} className="border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {loading ? (
                    <div className="h-9 w-16 animate-pulse rounded bg-secondary" />
                  ) : (
                    stat.value.toLocaleString('pt-BR')
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Usage Card */}
        <UsageCard />

        {/* Campanhas Recentes */}
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-foreground">Campanhas Recentes</CardTitle>
            <Button variant="ghost" asChild className="text-muted-foreground hover:text-foreground">
              <Link to="/campaigns">
                Ver todas
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="h-10 w-10 animate-pulse rounded-lg bg-secondary" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-48 animate-pulse rounded bg-secondary" />
                      <div className="h-3 w-32 animate-pulse rounded bg-secondary/50" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentCampaigns.length === 0 ? (
              <div className="py-8 text-center">
                <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-medium text-foreground">Nenhuma campanha ainda</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Crie sua primeira campanha para começar a descobrir prospects.
                </p>
                <Button asChild className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90">
                  <Link to="/campaigns/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Criar Campanha
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {recentCampaigns.map((campaign) => (
                  <Link
                    key={campaign.id}
                    to={`/campaigns/${campaign.id}`}
                    className="flex items-center gap-4 rounded-lg border border-border p-4 transition-colors hover:bg-secondary/50"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <FolderOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground truncate">{campaign.name}</h4>
                      <p className="text-sm text-muted-foreground truncate">{campaign.goal}</p>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {format(new Date(campaign.created_at), "d 'de' MMM", { locale: ptBR })}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
