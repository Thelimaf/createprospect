import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KanbanColumn, KanbanColumnConfig } from '@/components/kanban/KanbanColumn';
import { KanbanCard } from '@/components/kanban/KanbanCard';
import { LeadsTable } from '@/components/leads/LeadsTable';
import { WhatsAppMessageDialog } from '@/components/leads/WhatsAppMessageDialog';
import { LeadSearchDialog } from '@/components/leads/LeadSearchDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  ChevronRight,
  Search,
  LayoutDashboard,
  LayoutList,
  Users,
  Loader2,
  Plus,
} from 'lucide-react';

interface Lead {
  id: string;
  business_name: string;
  phone: string | null;
  rating: number | null;
  website: string | null;
  google_maps_url: string | null;
  status: string;
  updated_at: string;
  city: string | null;
  campaign_id: string | null;
  email: string | null;
  address: string | null;
  category: string | null;
  last_contact_date: string | null;
}

interface Campaign {
  id: string;
  name: string;
  goal: string;
  context: string | null;
  tone: string;
  quick_replies: QuickReply[] | null;
}

interface QuickReply {
  text: string;
  variables: string[];
}

type ViewMode = 'kanban' | 'list';

const COLUMNS: KanbanColumnConfig[] = [
  {
    id: 'new',
    label: 'Novo',
    color: 'blue',
    bgClass: 'bg-blue-500/5 border-blue-500/20 dark:bg-blue-950/30',
    headerGradient: 'bg-gradient-to-r from-blue-500/20 to-blue-600/10',
  },
  {
    id: 'contacted',
    label: 'Contactado',
    color: 'yellow',
    bgClass: 'bg-yellow-500/5 border-yellow-500/20 dark:bg-yellow-950/30',
    headerGradient: 'bg-gradient-to-r from-yellow-500/20 to-yellow-600/10',
  },
  {
    id: 'interested',
    label: 'Interessado',
    color: 'green',
    bgClass: 'bg-green-500/5 border-green-500/20 dark:bg-green-950/30',
    headerGradient: 'bg-gradient-to-r from-green-500/20 to-green-600/10',
  },
  {
    id: 'not_interested',
    label: 'Não Interessado',
    color: 'red',
    bgClass: 'bg-red-500/5 border-red-500/20 dark:bg-red-950/30',
    headerGradient: 'bg-gradient-to-r from-red-500/20 to-red-600/10',
  },
  {
    id: 'closed',
    label: 'Fechado',
    color: 'purple',
    bgClass: 'bg-purple-500/5 border-purple-500/20 dark:bg-purple-950/30',
    headerGradient: 'bg-gradient-to-r from-purple-500/20 to-purple-600/10',
  },
];

export default function CampaignLeadsPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('campaignLeadsViewMode');
    return (saved as ViewMode) || 'kanban';
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCity, setFilterCity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Dialogs
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const [selectedLeadForWhatsApp, setSelectedLeadForWhatsApp] = useState<Lead | null>(null);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);

  // Save view mode preference
  useEffect(() => {
    localStorage.setItem('campaignLeadsViewMode', viewMode);
  }, [viewMode]);

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Fetch campaign and leads
  const fetchData = useCallback(async () => {
    if (!user || !id) return;

    try {
      // Fetch campaign
      const { data: campaignData, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (campaignError) throw campaignError;
      
      // Parse quick_replies from JSON
      const parsedCampaign = {
        ...campaignData,
        quick_replies: (campaignData.quick_replies as unknown as QuickReply[]) || null,
      };
      setCampaign(parsedCampaign);

      // Fetch leads
      const { data: leadsData, error: leadsError } = await supabase
        .from('google_maps_leads')
        .select('*')
        .eq('campaign_id', id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (leadsError) throw leadsError;
      setLeads(leadsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [user, id]);

  // Setup realtime subscription
  useEffect(() => {
    if (!user || !id) return;

    fetchData();

    const channel = supabase
      .channel('campaign_leads_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'google_maps_leads',
          filter: `campaign_id=eq.${id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setLeads((prev) => [payload.new as Lead, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setLeads((prev) =>
              prev.map((lead) =>
                lead.id === payload.new.id ? (payload.new as Lead) : lead
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setLeads((prev) => prev.filter((lead) => lead.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, id, fetchData]);

  // Update lead status
  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    setUpdating(leadId);

    try {
      const updateData: Record<string, unknown> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === 'contacted') {
        updateData.last_contact_date = new Date().toISOString();
      }

      const { error } = await supabase
        .from('google_maps_leads')
        .update(updateData)
        .eq('id', leadId);

      if (error) throw error;
      toast.success('Status atualizado!');
    } catch (error) {
      console.error('Error updating lead:', error);
      toast.error('Erro ao atualizar status');
    } finally {
      setUpdating(null);
    }
  };

  // Handle WhatsApp click
  const handleWhatsAppClick = (lead: Lead) => {
    setSelectedLeadForWhatsApp(lead);
    setWhatsappDialogOpen(true);
  };

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const leadId = active.id as string;
    const newStatus = over.id as string;

    const lead = leads.find((l) => l.id === leadId);
    if (lead && lead.status !== newStatus && COLUMNS.some((c) => c.id === newStatus)) {
      updateLeadStatus(leadId, newStatus);
    }
  };

  // Toggle column collapse
  const toggleColumnCollapse = (columnId: string) => {
    setCollapsedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(columnId)) {
        next.delete(columnId);
      } else {
        next.add(columnId);
      }
      return next;
    });
  };

  // Get unique cities from leads
  const cities = useMemo(() => {
    const citySet = new Set(leads.map((l) => l.city).filter(Boolean));
    return Array.from(citySet).sort();
  }, [leads]);

  // Filter leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = lead.business_name.toLowerCase().includes(query);
        const matchesPhone = lead.phone?.toLowerCase().includes(query);
        if (!matchesName && !matchesPhone) return false;
      }

      if (filterCity !== 'all' && lead.city !== filterCity) {
        return false;
      }

      if (filterStatus !== 'all' && lead.status !== filterStatus) {
        return false;
      }

      return true;
    });
  }, [leads, searchQuery, filterCity, filterStatus]);

  // Group leads by status
  const leadsByStatus = useMemo(() => {
    const grouped: Record<string, Lead[]> = {};
    COLUMNS.forEach((col) => {
      grouped[col.id] = filteredLeads.filter((lead) => lead.status === col.id);
    });
    return grouped;
  }, [filteredLeads]);

  // Active lead for drag overlay
  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null;

  if (loading) {
    return (
      <AppShell>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="flex gap-4">
            <Skeleton className="h-10 flex-1 max-w-sm" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="flex gap-4 overflow-hidden">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-96 w-80 flex-shrink-0" />
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  if (!campaign) {
    return (
      <AppShell>
        <div className="flex h-[50vh] items-center justify-center">
          <p className="text-muted-foreground">Campanha não encontrada</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={`Leads - ${campaign.name}`}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link to="/campaigns" className="hover:text-foreground transition-colors">
          Campanhas
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link to={`/campaigns/${id}`} className="hover:text-foreground transition-colors">
          {campaign.name}
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">Leads</span>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">Leads da Campanha</h1>
            <Badge variant="secondary" className="text-sm">
              {filteredLeads.length} leads
            </Badge>
          </div>
          {updating && (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Atualizando...</span>
            </div>
          )}
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou telefone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={filterCity} onValueChange={setFilterCity}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Cidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas cidades</SelectItem>
              {cities.map((city) => (
                <SelectItem key={city} value={city!}>
                  {city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Qualquer status</SelectItem>
              {COLUMNS.map((col) => (
                <SelectItem key={col.id} value={col.id}>
                  {col.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* View Toggle */}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
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
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {viewMode === 'kanban' ? (
          <motion.div
            key="kanban"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="overflow-x-auto pb-4">
                <div className="flex gap-4 min-w-max">
                  {COLUMNS.map((column) => (
                    <KanbanColumn
                      key={column.id}
                      config={column}
                      leads={leadsByStatus[column.id] as any || []}
                      isCollapsed={collapsedColumns.has(column.id)}
                      onToggleCollapse={() => toggleColumnCollapse(column.id)}
                      selectedLeadId={selectedLeadId}
                      onSelectLead={setSelectedLeadId}
                      onWhatsAppClick={(lead) => handleWhatsAppClick(lead)}
                      whatsappMessage=""
                    />
                  ))}
                </div>
              </div>

              <DragOverlay>
                {activeLead && <KanbanCard lead={activeLead} isOverlay />}
              </DragOverlay>
            </DndContext>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <LeadsTable
              leads={filteredLeads}
              onStatusChange={updateLeadStatus}
              onWhatsAppClick={handleWhatsAppClick}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {filteredLeads.length === 0 && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <Users className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Nenhum lead encontrado
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {searchQuery || filterCity !== 'all' || filterStatus !== 'all'
              ? 'Tente ajustar os filtros'
              : 'Faça uma busca para encontrar leads'}
          </p>
          <Button onClick={() => setSearchDialogOpen(true)}>
            <Search className="mr-2 h-4 w-4" />
            Buscar Leads
          </Button>
        </motion.div>
      )}

      {/* Floating Action Button */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="fixed bottom-6 right-6"
      >
        <Button
          size="lg"
          className="rounded-full shadow-lg h-14 px-6"
          onClick={() => setSearchDialogOpen(true)}
        >
          <Plus className="mr-2 h-5 w-5" />
          Buscar Mais Leads
        </Button>
      </motion.div>

      {/* WhatsApp Dialog */}
      {selectedLeadForWhatsApp && campaign && (
        <WhatsAppMessageDialog
          open={whatsappDialogOpen}
          onOpenChange={setWhatsappDialogOpen}
          lead={selectedLeadForWhatsApp}
          campaign={campaign}
          onStatusUpdate={(leadId) => updateLeadStatus(leadId, 'contacted')}
        />
      )}

      {/* Search Dialog */}
      <LeadSearchDialog
        open={searchDialogOpen}
        onOpenChange={setSearchDialogOpen}
        campaignId={campaign.id}
        campaignName={campaign.name}
        onSearchComplete={() => {
          setSearchDialogOpen(false);
          fetchData();
        }}
      />
    </AppShell>
  );
}
