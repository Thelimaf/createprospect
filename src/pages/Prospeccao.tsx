import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { ProspeccaoTabs } from '@/components/prospeccao/ProspeccaoTabs';
import { UsageBanner } from '@/components/billing/UsageBanner';
import { History } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function Prospeccao() {
  const { user } = useAuth();
  const [baseCount, setBaseCount] = useState(0);
  const [searchCount, setSearchCount] = useState(0);

  useEffect(() => {
    if (user) {
      loadCounts();
    }
  }, [user]);

  // Realtime subscription for base count
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('prospeccao-leads')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'google_maps_leads',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadCounts = async () => {
    const [leadsResult, searchesResult] = await Promise.all([
      supabase
        .from('google_maps_leads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id),
      supabase
        .from('google_maps_searches')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id),
    ]);

    setBaseCount(leadsResult.count || 0);
    setSearchCount(searchesResult.count || 0);
  };

  return (
    <AppShell title="Prospecção B2B">
      <UsageBanner />
      <div className="space-y-6 pt-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Prospecção B2B</h1>
            <p className="text-muted-foreground">
              Encontre e qualifique novos prospects para sua base
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/searches">
              <History className="h-4 w-4 mr-2" />
              Histórico ({searchCount})
            </Link>
          </Button>
        </div>

        {/* Main Tabs */}
        <ProspeccaoTabs baseCount={baseCount} />
      </div>
    </AppShell>
  );
}
