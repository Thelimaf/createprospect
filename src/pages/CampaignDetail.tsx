import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { CampaignSearchForm } from '@/components/campaign/CampaignSearchForm';
import { CampaignResults } from '@/components/campaign/CampaignResults';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Target, Briefcase } from 'lucide-react';
import { toast } from 'sonner';

interface Campaign {
  id: string;
  name: string;
  goal: string;
  context: string | null;
  tone: string;
  created_at: string;
}

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);

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
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Sidebar de Informações da Campanha */}
        <div className="space-y-4">
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
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tom</span>
                <Badge variant="secondary" className="bg-secondary text-secondary-foreground">
                  {toneLabels[campaign.tone] || campaign.tone}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Conteúdo Principal */}
        <div className="space-y-6">
          <CampaignSearchForm campaignId={campaign.id} />
          <CampaignResults campaign={campaign} />
        </div>
      </div>
    </AppShell>
  );
}
