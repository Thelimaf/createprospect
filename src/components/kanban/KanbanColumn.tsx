import { useDroppable } from '@dnd-kit/core';
import { ChevronDown, ChevronRight, Inbox } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { KanbanCard } from './KanbanCard';
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
}

export interface KanbanColumnConfig {
  id: string;
  label: string;
  color: string;
  bgClass: string;
  headerGradient: string;
}

interface KanbanColumnProps {
  config: KanbanColumnConfig;
  leads: Lead[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  selectedLeadId?: string | null;
  onSelectLead?: (leadId: string) => void;
  onWhatsAppClick?: (lead: Lead) => void;
  onLeadClick?: (lead: Lead) => void;
  whatsappMessage?: string;
}

export function KanbanColumn({
  config,
  leads,
  isCollapsed,
  onToggleCollapse,
  selectedLeadId,
  onSelectLead,
  onWhatsAppClick,
  onLeadClick,
  whatsappMessage,
}: KanbanColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: config.id,
    data: { status: config.id },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col rounded-xl border transition-all duration-200',
        config.bgClass,
        isOver && 'ring-2 ring-accent ring-offset-2 ring-offset-background border-accent',
        isCollapsed ? 'w-16' : 'w-80 min-w-80 flex-shrink-0'
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'p-3 rounded-t-xl flex items-center gap-2',
          config.headerGradient
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={onToggleCollapse}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
        
        {!isCollapsed && (
          <span className="font-semibold text-sm flex-1 truncate">{config.label}</span>
        )}
        
        <Badge
          variant="secondary"
          className={cn(
            'rounded-full min-w-6 h-6 flex items-center justify-center text-xs font-bold',
            `bg-${config.color}-500/20 text-${config.color}-600 dark:text-${config.color}-400`
          )}
          style={{
            backgroundColor: `hsl(var(--${config.color === 'blue' ? 'primary' : config.color === 'green' ? 'accent' : 'muted'}) / 0.2)`,
          }}
        >
          {leads.length}
        </Badge>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <ScrollArea className="flex-1 p-2">
          <div className="space-y-2 min-h-[200px]">
            {leads.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <Inbox className="h-10 w-10 mb-2 opacity-50" />
                <p className="text-sm text-center">Arraste leads aqui</p>
              </div>
            ) : (
              leads.map((lead) => (
                <KanbanCard
                  key={lead.id}
                  lead={lead}
                  isSelected={selectedLeadId === lead.id}
                  onClick={() => onLeadClick?.(lead)}
                  onWhatsAppClick={() => onWhatsAppClick?.(lead)}
                  whatsappMessage={whatsappMessage}
                />
              ))
            )}
          </div>
        </ScrollArea>
      )}

      {/* Collapsed content - just show count */}
      {isCollapsed && (
        <div className="flex-1 flex items-center justify-center p-2">
          <span
            className="text-lg font-bold writing-mode-vertical"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          >
            {config.label}
          </span>
        </div>
      )}
    </div>
  );
}
