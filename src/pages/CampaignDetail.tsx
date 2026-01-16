import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { CampaignSearchForm } from '@/components/campaign/CampaignSearchForm';
import { CampaignResults } from '@/components/campaign/CampaignResults';
import { GoogleMapsScraper } from '@/components/google-maps/GoogleMapsScraper';
import { GoogleMapsLeadsList } from '@/components/google-maps/GoogleMapsLeadsList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Target, Briefcase, ChevronRight, Eye, Search, MapPin, MessageSquare } from 'lucide-react';
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
  prospects: 'Buscar Prospects',
  'google-maps': 'Buscar no Google Maps',
};

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [tabLoading, setTabLoading] = useState(false);

  useEffect(() => {
    if (user && id) {
      loadCampaign();
    }
  }, [user, id]);

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
    // Simulate tab content loading
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
        <TabsList className="grid w-full grid-cols-3 bg-muted/50">
          <TabsTrigger value="overview" className="flex items-center gap-2 data-[state=active]:bg-background">
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">Visão Geral</span>
          </TabsTrigger>
          <TabsTrigger value="prospects" className="flex items-center gap-2 data-[state=active]:bg-background">
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Buscar Prospects</span>
          </TabsTrigger>
          <TabsTrigger value="google-maps" className="flex items-center gap-2 data-[state=active]:bg-background">
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">Google Maps</span>
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

        {/* Prospects Tab (Exa API) */}
        <TabsContent value="prospects" className="space-y-6">
          {tabLoading ? (
            <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
              <Skeleton className="h-[400px]" />
              <Skeleton className="h-[400px]" />
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
              <CampaignSearchForm campaignId={campaign.id} />
              <CampaignResults campaign={campaign} />
            </div>
          )}
        </TabsContent>

        {/* Google Maps Tab */}
        <TabsContent value="google-maps" className="space-y-6">
          {tabLoading ? (
            <div className="space-y-6">
              <Skeleton className="h-24" />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Skeleton className="h-[400px]" />
                <div className="lg:col-span-2">
                  <Skeleton className="h-[400px]" />
                </div>
              </div>
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

              {/* Scraper + Leads List */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                  <GoogleMapsScraper 
                    campaignId={campaign.id} 
                    campaignName={campaign.name}
                  />
                </div>
                <div className="lg:col-span-2">
                  <GoogleMapsLeadsList 
                    campaignId={campaign.id}
                    campaignName={campaign.name}
                  />
                </div>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
