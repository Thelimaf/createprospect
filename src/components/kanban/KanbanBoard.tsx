import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { Search, Filter, Loader2, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { KanbanColumn, KanbanColumnConfig } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { KanbanContextMenu } from './KanbanContextMenu';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
}

interface Campaign {
  id: string;
  name: string;
}

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

const defaultWhatsAppTemplate = `Olá! Vi sua empresa no Google Maps e gostaria de conhecer melhor seus serviços.`;

export function KanbanBoard() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCampaign, setFilterCampaign] = useState<string>('all');
  const [filterCity, setFilterCity] = useState<string>('all');
  const [filterMinRating, setFilterMinRating] = useState<string>('all');
  const [whatsappMessage, setWhatsappMessage] = useState(defaultWhatsAppTemplate);

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Fetch leads
  const fetchLeads = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('google_maps_leads')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast.error('Erro ao carregar leads');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch campaigns
  const fetchCampaigns = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('id, name')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    }
  }, [user]);

  // Setup realtime subscription
  useEffect(() => {
    if (!user) return;

    fetchLeads();
    fetchCampaigns();

    const channel = supabase
      .channel('kanban_leads_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'google_maps_leads',
          filter: `user_id=eq.${user.id}`,
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
  }, [user, fetchLeads, fetchCampaigns]);

  // Hotkeys for moving leads
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedLeadId) return;
      
      const keyToColumn: Record<string, string> = {
        '1': 'new',
        '2': 'contacted',
        '3': 'interested',
        '4': 'not_interested',
        '5': 'closed',
      };

      const targetStatus = keyToColumn[e.key];
      if (targetStatus) {
        const lead = leads.find((l) => l.id === selectedLeadId);
        if (lead && lead.status !== targetStatus) {
          updateLeadStatus(selectedLeadId, targetStatus);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedLeadId, leads]);

  // Update lead status
  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    setUpdating(leadId);

    try {
      const updateData: Record<string, unknown> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      // Update last_contact_date if moving to contacted
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
  const handleWhatsAppClick = async (lead: Lead) => {
    await updateLeadStatus(lead.id, 'contacted');
  };

  // Delete lead
  const handleDeleteLead = async (lead: Lead) => {
    if (!confirm(`Deletar lead "${lead.business_name}"?`)) return;

    try {
      const { error } = await supabase
        .from('google_maps_leads')
        .delete()
        .eq('id', lead.id);

      if (error) throw error;
      toast.success('Lead deletado');
    } catch (error) {
      console.error('Error deleting lead:', error);
      toast.error('Erro ao deletar lead');
    }
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
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = lead.business_name.toLowerCase().includes(query);
        const matchesPhone = lead.phone?.toLowerCase().includes(query);
        if (!matchesName && !matchesPhone) return false;
      }

      // Campaign filter
      if (filterCampaign !== 'all' && lead.campaign_id !== filterCampaign) {
        return false;
      }

      // City filter
      if (filterCity !== 'all' && lead.city !== filterCity) {
        return false;
      }

      // Rating filter
      if (filterMinRating !== 'all') {
        const minRating = parseFloat(filterMinRating);
        if (!lead.rating || lead.rating < minRating) return false;
      }

      return true;
    });
  }, [leads, searchQuery, filterCampaign, filterCity, filterMinRating]);

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
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-4">
        {/* Stats */}
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Gerenciando <Badge variant="secondary">{filteredLeads.length}</Badge> leads
          </span>
          {updating && (
            <div className="flex items-center gap-2 ml-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Atualizando...</span>
            </div>
          )}
        </div>

        {/* Filters */}
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

          <Select value={filterCampaign} onValueChange={setFilterCampaign}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Campanha" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas campanhas</SelectItem>
              {campaigns.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

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

          <Select value={filterMinRating} onValueChange={setFilterMinRating}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Qualquer rating</SelectItem>
              <SelectItem value="3">3+ estrelas</SelectItem>
              <SelectItem value="4">4+ estrelas</SelectItem>
              <SelectItem value="4.5">4.5+ estrelas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Hotkey hint */}
        <div className="text-xs text-muted-foreground">
          💡 Dica: Selecione um card e pressione 1-5 para mover rapidamente entre colunas
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max h-full">
            {COLUMNS.map((column) => (
              <KanbanContextMenu
                key={column.id}
                lead={activeLead || { id: '', business_name: '', phone: null, status: '' }}
                onDelete={handleDeleteLead}
                onMoveToStatus={(lead, status) => updateLeadStatus(lead.id, status)}
              >
                <div>
                  <KanbanColumn
                    config={column}
                    leads={leadsByStatus[column.id] || []}
                    isCollapsed={collapsedColumns.has(column.id)}
                    onToggleCollapse={() => toggleColumnCollapse(column.id)}
                    selectedLeadId={selectedLeadId}
                    onSelectLead={setSelectedLeadId}
                    onWhatsAppClick={handleWhatsAppClick}
                    whatsappMessage={whatsappMessage}
                  />
                </div>
              </KanbanContextMenu>
            ))}
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeLead && <KanbanCard lead={activeLead} isOverlay />}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
