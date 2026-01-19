import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  MessageCircle,
  MapPin,
  Globe,
  Star,
  ChevronUp,
  ChevronDown,
  Copy,
  Mail,
  Search,
  Loader2,
  Lock,
  Crown,
} from 'lucide-react';
import { ExternalLinkButton } from '@/components/shared/ExternalLinkButton';
import { buildWhatsAppUrl, ensureHttps } from '@/lib/external-links';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useUserPlan } from '@/hooks/useUserPlan';

interface Lead {
  id: string;
  business_name: string;
  phone: string | null;
  email?: string | null;
  rating: number | null;
  website: string | null;
  google_maps_url: string | null;
  status: string;
  updated_at: string;
  city: string | null;
  address: string | null;
  last_contact_date: string | null;
  enriched_at?: string | null;
  campaign_id?: string | null;
  category?: string | null;
}

interface LeadsTableProps {
  leads: Lead[];
  onStatusChange: (leadId: string, status: string) => void;
  onWhatsAppClick: (lead: Lead) => void;
  onEnrichEmail?: (leadId: string, website: string) => Promise<void>;
  enrichingLeadIds?: Set<string>;
}

type SortField = 'business_name' | 'rating' | 'status' | 'city' | 'updated_at';
type SortDirection = 'asc' | 'desc';

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  new: { label: 'Novo', variant: 'default' },
  contacted: { label: 'Contactado', variant: 'secondary' },
  interested: { label: 'Interessado', variant: 'default' },
  not_interested: { label: 'Não Interessado', variant: 'outline' },
  closed: { label: 'Fechado', variant: 'default' },
};

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  contacted: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  interested: 'bg-green-500/20 text-green-400 border-green-500/30',
  not_interested: 'bg-red-500/20 text-red-400 border-red-500/30',
  closed: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

// Locked data placeholder component
function LockedData({ feature }: { feature: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-1 text-muted-foreground cursor-help">
          <Lock className="h-3 w-3" />
          <span className="text-xs blur-sm select-none">*****</span>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-yellow-500" />
            <span>Disponível no plano Starter</span>
          </div>
          <span className="text-xs text-muted-foreground">
            No Free, os 3 primeiros leads têm dados liberados (badge "Grátis")
          </span>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export function LeadsTable({ leads, onStatusChange, onWhatsAppClick, onEnrichEmail, enrichingLeadIds = new Set() }: LeadsTableProps) {
  const { isFree, canSendWhatsApp, canSearchEmails, isLeadUnlocked } = useUserPlan();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('updated_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Sort leads - prioritize unlocked leads for Free users
  const sortedLeads = useMemo(() => {
    return [...leads].sort((a, b) => {
      // For Free users, prioritize unlocked leads first
      if (isFree) {
        const aUnlocked = isLeadUnlocked(a.id);
        const bUnlocked = isLeadUnlocked(b.id);
        if (aUnlocked && !bUnlocked) return -1;
        if (!aUnlocked && bUnlocked) return 1;
      }

      let comparison = 0;
      
      switch (sortField) {
        case 'business_name':
          comparison = a.business_name.localeCompare(b.business_name);
          break;
        case 'rating':
          comparison = (a.rating || 0) - (b.rating || 0);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'city':
          comparison = (a.city || '').localeCompare(b.city || '');
          break;
        case 'updated_at':
          comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [leads, sortField, sortDirection, isFree, isLeadUnlocked]);

  // Paginate leads
  const paginatedLeads = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedLeads.slice(start, start + pageSize);
  }, [sortedLeads, page, pageSize]);

  const totalPages = Math.ceil(sortedLeads.length / pageSize);

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(paginatedLeads.map(l => l.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  // Handle select one
  const handleSelectOne = (leadId: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(leadId);
    } else {
      newSet.delete(leadId);
    }
    setSelectedIds(newSet);
  };

  // Copy phone to clipboard
  const copyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    toast.success('Telefone copiado!');
  };

  // Copy email to clipboard
  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    toast.success('Email copiado!');
  };

  // Render sort indicator
  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  // Render stars
  const renderStars = (rating: number | null) => {
    if (!rating) return <span className="text-muted-foreground">-</span>;
    return (
      <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-3 w-3 ${
              i < Math.floor(rating)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-muted-foreground/30'
            }`}
          />
        ))}
        <span className="text-xs text-muted-foreground ml-1">({rating})</span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Free user upgrade banner */}
      {isFree && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-lg border border-yellow-500/20"
        >
          <div className="flex items-center gap-3">
            <Lock className="h-5 w-5 text-yellow-500" />
            <div>
              <p className="font-medium text-foreground">Dados limitados no plano Free</p>
              <p className="text-sm text-muted-foreground">
                Você pode ver dados completos dos 3 primeiros leads para testar. Faça upgrade para desbloquear todos!
              </p>
            </div>
          </div>
          <Button asChild className="bg-yellow-500 hover:bg-yellow-600 text-black">
            <Link to="/pricing">
              <Crown className="h-4 w-4 mr-2" />
              Ver Planos
            </Link>
          </Button>
        </motion.div>
      )}

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 p-3 bg-primary/10 rounded-lg border border-primary/20"
        >
          <span className="text-sm text-foreground">
            {selectedIds.size} selecionado(s)
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              selectedIds.forEach(id => onStatusChange(id, 'contacted'));
              setSelectedIds(new Set());
            }}
          >
            Marcar como Contactado
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              selectedIds.forEach(id => onStatusChange(id, 'interested'));
              setSelectedIds(new Set());
            }}
          >
            Marcar como Interessado
          </Button>
        </motion.div>
      )}

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedIds.size === paginatedLeads.length && paginatedLeads.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:text-foreground"
                onClick={() => handleSort('business_name')}
              >
                <div className="flex items-center gap-1">
                  Nome
                  <SortIndicator field="business_name" />
                </div>
              </TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead 
                className="cursor-pointer hover:text-foreground"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center gap-1">
                  Status
                  <SortIndicator field="status" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:text-foreground"
                onClick={() => handleSort('city')}
              >
                <div className="flex items-center gap-1">
                  Cidade
                  <SortIndicator field="city" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:text-foreground"
                onClick={() => handleSort('rating')}
              >
                <div className="flex items-center gap-1">
                  Rating
                  <SortIndicator field="rating" />
                </div>
              </TableHead>
              <TableHead className="w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedLeads.map((lead) => {
              const showFullData = isLeadUnlocked(lead.id);
              return (
              <TableRow
                key={lead.id}
                className={`hover:bg-muted/30 ${
                  selectedIds.has(lead.id) ? 'bg-primary/5' : ''
                }`}
              >
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(lead.id)}
                    onCheckedChange={(checked) => handleSelectOne(lead.id, !!checked)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div>
                      <p className="font-medium text-foreground">{lead.business_name}</p>
                      {lead.last_contact_date && (
                        <p className="text-xs text-muted-foreground">
                          Último contato: {formatDistanceToNow(new Date(lead.last_contact_date), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </p>
                      )}
                    </div>
                    {isFree && showFullData && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-500/10 text-green-500 border-green-500/30 shrink-0">
                        Grátis
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {showFullData ? (
                    lead.phone ? (
                      <button
                        onClick={() => copyPhone(lead.phone!)}
                        className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                      >
                        {lead.phone}
                        <Copy className="h-3 w-3 opacity-50" />
                      </button>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )
                  ) : (
                    <LockedData feature="phone" />
                  )}
                </TableCell>
                <TableCell>
                  {showFullData ? (
                    lead.email ? (
                      <button
                        onClick={() => copyEmail(lead.email!)}
                        className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                      >
                        <Mail className="h-3 w-3 text-primary" />
                        {lead.email.length > 25 ? `${lead.email.slice(0, 25)}...` : lead.email}
                        <Copy className="h-3 w-3 opacity-50" />
                      </button>
                    ) : lead.website && onEnrichEmail && canSearchEmails ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => onEnrichEmail(lead.id, lead.website!)}
                        disabled={enrichingLeadIds.has(lead.id)}
                      >
                        {enrichingLeadIds.has(lead.id) ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Buscando...
                          </>
                        ) : (
                          <>
                            <Search className="h-3 w-3 mr-1" />
                            Buscar
                          </>
                        )}
                      </Button>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )
                  ) : (
                    <LockedData feature="email" />
                  )}
                </TableCell>
                <TableCell>
                  <Select
                    value={lead.status}
                    onValueChange={(value) => onStatusChange(lead.id, value)}
                  >
                    <SelectTrigger className={`w-[140px] h-8 text-xs ${STATUS_COLORS[lead.status]}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABELS).map(([value, { label }]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {showFullData ? (
                    lead.city || '-'
                  ) : (
                    <LockedData feature="city" />
                  )}
                </TableCell>
                <TableCell>{renderStars(lead.rating)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {lead.phone && (
                      (canSendWhatsApp || showFullData) ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-green-500 hover:text-green-400 hover:bg-green-500/10"
                          onClick={() => onWhatsAppClick(lead)}
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground opacity-50 cursor-not-allowed"
                              disabled
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                        <TooltipContent>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <Crown className="h-4 w-4 text-yellow-500" />
                                <span>WhatsApp disponível no Starter</span>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                No Free, os 3 primeiros leads têm WhatsApp liberado (badge "Grátis")
                              </span>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )
                    )}
                    {lead.google_maps_url && (
                      <ExternalLinkButton
                        url={lead.google_maps_url}
                        label=""
                        icon={<MapPin className="h-4 w-4" />}
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        toastLabel="Abrindo Maps..."
                        context="table_maps"
                        leadId={lead.id}
                      />
                    )}
                    {lead.website && (
                      <ExternalLinkButton
                        url={ensureHttps(lead.website)}
                        label=""
                        icon={<Globe className="h-4 w-4" />}
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        toastLabel="Abrindo site..."
                        context="table_website"
                        leadId={lead.id}
                      />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )})}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Linhas por página:</span>
          <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(Number(v))}>
            <SelectTrigger className="w-[70px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages || 1}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            Anterior
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Próximo
          </Button>
        </div>
      </div>
    </div>
  );
}
