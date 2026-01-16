import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { GoogleMapsScraper } from '@/components/google-maps/GoogleMapsScraper';
import { GoogleMapsLeadsList } from '@/components/google-maps/GoogleMapsLeadsList';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Target, Briefcase, ChevronRight, Eye, MapPin, MessageSquare, LayoutList, LayoutDashboard } from 'lucide-react';
import { toast } from 'sonner';

interface Campaign {
  id: string;
  name: string;
  goal: string;
  context: string | null;
  tone: string;
  created_at: string;
}

const tabLabels: Record<string, string> = {
  overview: 'Visão Geral',
  leads: 'Leads',
};

type LeadsViewMode = 'kanban' | 'list';

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [tabLoading, setTabLoading] = useState(false);
  const [leadsViewMode, setLeadsViewMode] = useState<LeadsViewMode>(() => {
    const saved = localStorage.getItem('campaignLeadsViewMode');
    return (saved as LeadsViewMode) || 'kanban';
  });
  const [whatsappTemplate, setWhatsappTemplate] = useState('');

  useEffect(() => {
    if (user && id) {
      loadCampaign();
    }
  }, [user, id]);

  // Save view mode preference
  useEffect(() => {
    localStorage.setItem('campaignLeadsViewMode', leadsViewMode);
  }, [leadsViewMode]);

  const loadCampaign = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .eq('user_id', user!.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          toast.error('Campanha não encontrada');
          navigate('/campaigns');
          return;
        }
        throw error;
      }

      setCampaign(data);
    } catch (error) {
      console.error('Erro ao carregar campanha:', error);
      toast.error('Falha ao carregar campanha');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (value: string) => {
    setTabLoading(true);
    setActiveTab(value);
    setTimeout(() => setTabLoading(false), 200);
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex h-[50vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  if (!campaign) {
    return null;
  }

  const toneLabels: Record<string, string> = {
    professional: 'Profissional',
    casual: 'Casual',
    friendly: 'Amigável',
  };

  return (
    <AppShell title={campaign.name}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link to="/campaigns" className="hover:text-foreground transition-colors">
          Campanhas
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">{campaign.name}</span>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">{tabLabels[activeTab]}</span>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full space-y-6">
        <TabsList className="grid w-full grid-cols-2 bg-muted/50">
          <TabsTrigger value="overview" className="flex items-center gap-2 data-[state=active]:bg-background">
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">Visão Geral</span>
          </TabsTrigger>
          <TabsTrigger value="leads" className="flex items-center gap-2 data-[state=active]:bg-background">
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">Leads</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {tabLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Target className="h-5 w-5 text-primary" />
                    Objetivo da Campanha
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{campaign.goal}</p>
                </CardContent>
              </Card>

              {campaign.context && (
                <Card className="border-border bg-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-foreground">
                      <Briefcase className="h-5 w-5 text-primary" />
                      Contexto
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{campaign.context}</p>
                  </CardContent>
                </Card>
              )}

              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    Tom de Comunicação
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant="secondary" className="bg-secondary text-secondary-foreground">
                    {toneLabels[campaign.tone] || campaign.tone}
                  </Badge>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Leads Tab */}
        <TabsContent value="leads" className="space-y-6">
          {tabLoading ? (
            <div className="space-y-6">
              <Skeleton className="h-24" />
              <Skeleton className="h-[500px]" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Informative Card */}
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-foreground">
                        Encontre leads locais no Google Maps que correspondem ao objetivo da sua campanha:
                      </p>
                      <p className="text-sm font-medium text-primary mt-1">
                        "{campaign.goal}"
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Scraper Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                  <GoogleMapsScraper 
                    campaignId={campaign.id} 
                    campaignName={campaign.name}
                    campaign={campaign}
                    whatsappTemplate={whatsappTemplate}
                    onWhatsappTemplateChange={setWhatsappTemplate}
                  />
                </div>
                
                {/* Leads View with Toggle */}
                <div className="lg:col-span-2 space-y-4">
                  {/* View Toggle */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-foreground">
                      Leads da Campanha
                    </h3>
                    <Tabs value={leadsViewMode} onValueChange={(v) => setLeadsViewMode(v as LeadsViewMode)}>
                      <TabsList className="grid w-auto grid-cols-2">
                        <TabsTrigger value="kanban" className="flex items-center gap-2 px-3">
                          <LayoutDashboard className="h-4 w-4" />
                          <span className="hidden sm:inline">Kanban</span>
                        </TabsTrigger>
                        <TabsTrigger value="list" className="flex items-center gap-2 px-3">
                          <LayoutList className="h-4 w-4" />
                          <span className="hidden sm:inline">Lista</span>
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>

                  {/* Leads Content */}
                  <div className="min-h-[500px]">
                    {leadsViewMode === 'kanban' ? (
                      <KanbanBoard 
                        campaignId={campaign.id}
                        campaignName={campaign.name}
                        whatsappTemplate={whatsappTemplate}
                      />
                    ) : (
                      <GoogleMapsLeadsList 
                        campaignId={campaign.id}
                        campaignName={campaign.name}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}