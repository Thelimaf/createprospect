import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Phone, Star, MapPin, Globe, MessageCircle, GripVertical, Lock, Crown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ExternalLinkButton } from '@/components/shared/ExternalLinkButton';
import { buildWhatsAppUrl, ensureHttps } from '@/lib/external-links';
import { cn } from '@/lib/utils';
import { useUserPlan } from '@/hooks/useUserPlan';

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

interface KanbanCardProps {
  lead: Lead;
  isOverlay?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  onWhatsAppClick?: () => void;
  whatsappMessage?: string;
}

export function KanbanCard({
  lead,
  isOverlay = false,
  isSelected = false,
  onClick,
  onWhatsAppClick,
  whatsappMessage = '',
}: KanbanCardProps) {
  const { isFree, canSendWhatsApp, isLeadUnlocked } = useUserPlan();
  const showFullData = isLeadUnlocked(lead.id);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: { lead },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  // Calculate days in current status
  const daysInStatus = Math.floor(
    (Date.now() - new Date(lead.updated_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  const needsFollowUp = lead.status === 'contacted' && daysInStatus > 7;

  // Render stars for rating
  const renderStars = (rating: number | null) => {
    if (!rating) return null;
    const stars = [];
    const fullStars = Math.floor(rating);
    for (let i = 0; i < 5; i++) {
      stars.push(
        <Star
          key={i}
          className={cn(
            'h-3 w-3',
            i < fullStars ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'
          )}
        />
      );
    }
    return stars;
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={cn(
        'p-3 cursor-grab active:cursor-grabbing transition-all duration-200',
        'hover:shadow-lg hover:border-accent/50',
        'bg-card border-border',
        isDragging && 'opacity-50 scale-105 shadow-xl z-50',
        isOverlay && 'shadow-2xl scale-105 rotate-2 border-primary',
        isSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
      )}
      {...attributes}
      {...listeners}
    >
      {/* Header with grip and badges */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0" />
          <h4 
            className="font-semibold text-sm line-clamp-2 leading-tight" 
            title={lead.business_name}
          >
            {lead.business_name}
          </h4>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isFree && showFullData && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-500/10 text-green-500 border-green-500/30">
              Grátis
            </Badge>
          )}
          {needsFollowUp && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-orange-500/10 text-orange-500 border-orange-500/30">
              Follow-up
            </Badge>
          )}
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {daysInStatus}d
          </Badge>
        </div>
      </div>

      {/* Phone */}
      {lead.phone && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
          <Phone className="h-3 w-3" />
          {showFullData ? (
            <span className="truncate">{lead.phone}</span>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-1 cursor-help">
                  <Lock className="h-3 w-3" />
                  <span className="blur-sm select-none">*****</span>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-yellow-500" />
                  <span>Disponível no Starter</span>
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      )}

      {/* Rating */}
      {lead.rating && (
        <div className="flex items-center gap-1 mb-3">
          {renderStars(lead.rating)}
          <span className="text-xs text-muted-foreground ml-1">({lead.rating})</span>
        </div>
      )}

      {/* City */}
      {lead.city && (
        <div className="text-xs text-muted-foreground mb-3 truncate">
          📍 {showFullData ? lead.city : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-1 cursor-help">
                  <Lock className="h-3 w-3" />
                  <span className="blur-sm select-none">*****</span>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-yellow-500" />
                  <span>Disponível no Starter</span>
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div 
        className="flex items-center gap-1"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {lead.phone && (
          (canSendWhatsApp || showFullData) ? (
            <ExternalLinkButton
              url={buildWhatsAppUrl(lead.phone, whatsappMessage)}
              label=""
              icon={<MessageCircle className="h-3.5 w-3.5" />}
              variant="outline"
              className="h-7 w-7 p-0 bg-green-600/10 hover:bg-green-600/20 text-green-600 border-green-600/30"
              toastLabel="Abrindo WhatsApp..."
              onBeforeOpen={onWhatsAppClick}
              context="kanban_whatsapp"
              leadId={lead.id}
            />
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="h-7 w-7 flex items-center justify-center rounded border border-muted-foreground/20 text-muted-foreground opacity-50 cursor-not-allowed">
                  <MessageCircle className="h-3.5 w-3.5" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-yellow-500" />
                  <span>WhatsApp disponível no Starter</span>
                </div>
              </TooltipContent>
            </Tooltip>
          )
        )}
        {lead.google_maps_url && (
          <ExternalLinkButton
            url={lead.google_maps_url}
            label=""
            icon={<MapPin className="h-3.5 w-3.5" />}
            variant="outline"
            className="h-7 w-7 p-0"
            toastLabel="Abrindo Maps..."
            context="kanban_maps"
            leadId={lead.id}
          />
        )}
        {lead.website && (
          <ExternalLinkButton
            url={ensureHttps(lead.website)}
            label=""
            icon={<Globe className="h-3.5 w-3.5" />}
            variant="outline"
            className="h-7 w-7 p-0"
            toastLabel="Abrindo site..."
            context="kanban_website"
            leadId={lead.id}
          />
        )}
      </div>
    </Card>
  );
}
