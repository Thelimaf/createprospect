import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { CampaignSettingsTab } from '@/components/campaign/CampaignSettingsTab';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCheckLimit } from '@/hooks/useCheckLimit';
import { UpgradeModal, UpgradeModalVariant } from '@/components/billing/UpgradeModal';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import {
  Target,
  Briefcase,
  MessageSquare,
  ChevronRight,
  Eye,
  MapPin,
  Settings,
  Search,
  Loader2,
  Users,
  ArrowRight,
} from 'lucide-react';

interface QuickReply {
  text: string;
  variables: string[];
}

interface Campaign {
  id: string;
  name: string;
  goal: string;
  context: string | null;
  tone: string;
  created_at: string;
  quick_replies: QuickReply[] | null;
}

interface LeadPreview {
  id: string;
  business_name: string;
  phone: string | null;
  status: string;
  city: string | null;
}

const tabLabels: Record<string, string> = {
  overview: 'Visão Geral',
  leads: 'Leads',
  settings: 'Configurações',
};

const toneLabels: Record<string, string> = {
  professional: 'Profissional',
  casual: 'Casual',
  friendly: 'Amigável',
};

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { checkLimit, incrementUsage, isChecking } = useCheckLimit();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Search state
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState([20]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFirstSearch, setIsFirstSearch] = useState(true);

  // Leads preview state
  const [leadsPreview, setLeadsPreview] = useState<LeadPreview[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [leadsLoading, setLeadsLoading] = useState(false);

  // Upgrade modal
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeModalVariant, setUpgradeModalVariant] = useState<UpgradeModalVariant>('limit_reached');

  useEffect(() => {
    if (user && id) {
      loadCampaign();
      loadLeadsPreview();
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

      setCampaign({
        ...data,
        quick_replies: (data.quick_replies as unknown as QuickReply[]) || null,
      });
    } catch (error) {
      console.error('Erro ao carregar campanha:', error);
      toast.error('Falha ao carregar campanha');
    } finally {
      setLoading(false);
    }
  };

  const loadLeadsPreview = async () => {
    setLeadsLoading(true);
    try {
      // Get total count
      const { count } = await supabase
        .from('google_maps_leads')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', id)
        .eq('user_id', user!.id);

      setTotalLeads(count || 0);
      setIsFirstSearch((count || 0) === 0);

      // Get first 10 leads for preview
      const { data } = await supabase
        .from('google_maps_leads')
        .select('id, business_name, phone, status, city')
        .eq('campaign_id', id)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(10);

      setLeadsPreview(data || []);
    } catch (error) {
      console.error('Error loading leads preview:', error);
    } finally {
      setLeadsLoading(false);
    }
  };

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

    setIsSearching(true);

    try {
      const { data, error } = await supabase.functions.invoke('scrape-google-maps', {
        body: {
          query,
          limit: limit[0],
          page: 1,
          campaignId: id,
          mode: 'normal',
        },
      });

      if (error) throw error;

      // Increment usage after successful search
      await incrementUsage();

      const stats = data.stats || { new: data.count, existing: 0, updated: 0 };

      // Confetti for first search
      if (isFirstSearch && stats.new > 0) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      }

      toast.success(`${stats.new} clientes encontrados!`, {
        action: {
          label: 'Ver Todos',
          onClick: () => navigate(`/campaigns/${id}/leads`),
        },
      });

      setQuery('');
      loadLeadsPreview();
    } catch (error: any) {
      console.error('Error scraping:', error);
      toast.error(error.message || 'Erro ao buscar clientes');
    } finally {
      setIsSearching(false);
    }
  };

  const handleQuickRepliesUpdate = (replies: QuickReply[]) => {
    if (campaign) {
      setCampaign({ ...campaign, quick_replies: replies });
    }
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
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-muted/50">
          <TabsTrigger value="overview" className="flex items-center gap-2 data-[state=active]:bg-background">
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">Visão Geral</span>
          </TabsTrigger>
          <TabsTrigger value="leads" className="flex items-center gap-2 data-[state=active]:bg-background">
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">Leads</span>
            {totalLeads > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {totalLeads}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2 data-[state=active]:bg-background">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Configurações</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Campaign Info Card - Horizontal */}
            <Card className="border-border bg-card">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Target className="h-4 w-4 text-primary" />
                      Objetivo
                    </div>
                    <p className="text-foreground font-medium">{campaign.goal}</p>
                  </div>

                  {campaign.context && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Briefcase className="h-4 w-4 text-primary" />
                        Contexto
                      </div>
                      <p className="text-foreground font-medium">{campaign.context}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      Tom
                    </div>
                    <Badge variant="secondary">{toneLabels[campaign.tone] || campaign.tone}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Search Form - Centered */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="border-border bg-card max-w-xl mx-auto">
                <CardHeader className="text-center">
                  <CardTitle className="flex items-center justify-center gap-2 text-foreground">
                    <MapPin className="h-5 w-5 text-primary" />
                    Buscar Leads
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
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
                    disabled={isSearching || isChecking}
                    className="w-full h-12 text-base"
                  >
                    {isSearching ? (
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
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </TabsContent>

        {/* Leads Tab */}
        <TabsContent value="leads" className="space-y-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Stats */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-primary" />
                <span className="text-foreground font-medium">
                  {totalLeads} leads nesta campanha
                </span>
              </div>
              <Button asChild>
                <Link to={`/campaigns/${id}/leads`}>
                  Ver Todos os Leads
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            {/* Leads Preview */}
            {leadsLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : leadsPreview.length === 0 ? (
              <Card className="border-border bg-card">
                <CardContent className="py-12 text-center">
                  <MapPin className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Nenhum lead ainda
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Faça uma busca na aba "Visão Geral" para encontrar leads
                  </p>
                  <Button onClick={() => setActiveTab('overview')}>
                    <Search className="mr-2 h-4 w-4" />
                    Ir para Busca
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {leadsPreview.map((lead) => (
                  <Card key={lead.id} className="border-border bg-card hover:bg-muted/30 transition-colors">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground">{lead.business_name}</p>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            {lead.phone && <span>{lead.phone}</span>}
                            {lead.city && <span>• {lead.city}</span>}
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            lead.status === 'new'
                              ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                              : lead.status === 'contacted'
                              ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                              : lead.status === 'interested'
                              ? 'bg-green-500/20 text-green-400 border-green-500/30'
                              : 'bg-muted text-muted-foreground'
                          }
                        >
                          {lead.status === 'new'
                            ? 'Novo'
                            : lead.status === 'contacted'
                            ? 'Contactado'
                            : lead.status === 'interested'
                            ? 'Interessado'
                            : lead.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {totalLeads > 10 && (
                  <div className="text-center pt-4">
                    <Button variant="outline" asChild>
                      <Link to={`/campaigns/${id}/leads`}>
                        Ver todos os {totalLeads} leads
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <div className="max-w-4xl mx-auto">
            <CampaignSettingsTab
              campaignId={campaign.id}
              quickReplies={campaign.quick_replies}
              onQuickRepliesUpdate={handleQuickRepliesUpdate}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Upgrade Modal */}
      <UpgradeModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
        variant={upgradeModalVariant}
      />
    </AppShell>
  );
}
