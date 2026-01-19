import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FolderOpen, 
  ArrowRight, 
  Building2,
  Phone,
  Globe,
  MapPin
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables } from '@/integrations/supabase/types';

type Lead = Tables<'google_maps_leads'>;

export function MinhaBaseTab() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (user) {
      loadLeads();
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
      // Get count
      const { count } = await supabase
        .from('google_maps_leads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id);

      setTotal(count || 0);

      // Get recent leads
      const { data } = await supabase
        .from('google_maps_leads')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(10);

      setLeads(data || []);
    } catch (error) {
      console.error('Error loading leads:', error);
    } finally {
      setLoading(false);
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
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <FolderOpen className="h-5 w-5 text-primary" />
            Minha Base
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {total} leads salvos
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

        {total > 10 && (
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              Mostrando 10 de {total} leads. Acesse uma campanha para ver todos.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
