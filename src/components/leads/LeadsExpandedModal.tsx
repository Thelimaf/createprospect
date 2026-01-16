import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { KanbanColumn, KanbanColumnConfig } from '@/components/kanban/KanbanColumn';
import { KanbanCard } from '@/components/kanban/KanbanCard';
import { LeadsTable } from '@/components/leads/LeadsTable';
import {
  ArrowLeft,
  X,
  Search,
  LayoutDashboard,
  LayoutList,
  Download,
  Users,
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
  quick_replies: { text: string; variables: string[] }[] | null;
}

interface LeadsExpandedModalProps {
  open: boolean;
  onClose: () => void;
  campaign: Campaign;
  leads: Lead[];
  onStatusChange: (leadId: string, newStatus: string) => void;
  onWhatsAppClick: (lead: Lead) => void;
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

type ViewMode = 'kanban' | 'list';

export function LeadsExpandedModal({
  open,
  onClose,
  campaign,
  leads,
  onStatusChange,
  onWhatsAppClick,
}: LeadsExpandedModalProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCity, setFilterCity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  // Get unique cities
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
      if (filterCity !== 'all' && lead.city !== filterCity) return false;
      if (filterStatus !== 'all' && lead.status !== filterStatus) return false;
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

  // Stats
  const stats = useMemo(() => ({
    total: leads.length,
    interested: leads.filter((l) => l.status === 'interested').length,
    contacted: leads.filter((l) => l.status === 'contacted').length,
    new: leads.filter((l) => l.status === 'new').length,
  }), [leads]);

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null;

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
      onStatusChange(leadId, newStatus);
    }
  };

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

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-[100vw] w-full h-[100vh] p-0 gap-0 rounded-none">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-background shrink-0">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onClose}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div className="h-6 w-px bg-border" />
            <h2 className="text-lg font-semibold">
              Leads - {campaign.name}
            </h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Stats Bar */}
        <div className="px-6 py-3 bg-muted/30 border-b flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{stats.total}</span> leads
            </span>
          </div>
          <div className="h-4 w-px bg-border" />
          <span className="text-sm text-muted-foreground">
            <span className="font-medium text-green-500">{stats.interested}</span> Interessados
          </span>
          <span className="text-sm text-muted-foreground">
            <span className="font-medium text-yellow-500">{stats.contacted}</span> Contactados
          </span>
          <span className="text-sm text-muted-foreground">
            <span className="font-medium text-blue-500">{stats.new}</span> Novos
          </span>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-3 flex flex-wrap items-center gap-3 border-b bg-background shrink-0">
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

          <Button variant="outline" size="sm" className="ml-auto">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
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
                  <div className="flex gap-4 min-w-max pb-4">
                    {COLUMNS.map((column) => (
                      <KanbanColumn
                        key={column.id}
                        config={column}
                        leads={leadsByStatus[column.id] as any || []}
                        isCollapsed={collapsedColumns.has(column.id)}
                        onToggleCollapse={() => toggleColumnCollapse(column.id)}
                        selectedLeadId={selectedLeadId}
                        onSelectLead={setSelectedLeadId}
                        onWhatsAppClick={(lead: any) => onWhatsAppClick(lead)}
                        whatsappMessage=""
                      />
                    ))}
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
                  onStatusChange={onStatusChange}
                  onWhatsAppClick={onWhatsAppClick}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty State */}
          {filteredLeads.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Nenhum lead encontrado
              </h3>
              <p className="text-sm text-muted-foreground">
                Tente ajustar os filtros
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
