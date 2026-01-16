import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Edit, Copy, Trash2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { copyToClipboard } from '@/lib/external-links';

interface Lead {
  id: string;
  business_name: string;
  phone: string | null;
  status: string;
}

interface KanbanContextMenuProps {
  children: React.ReactNode;
  lead: Lead;
  onEdit?: (lead: Lead) => void;
  onDelete?: (lead: Lead) => void;
  onMoveToStatus?: (lead: Lead, status: string) => void;
}

const statusOptions = [
  { id: 'new', label: 'Novo' },
  { id: 'contacted', label: 'Contactado' },
  { id: 'interested', label: 'Interessado' },
  { id: 'not_interested', label: 'Não Interessado' },
  { id: 'closed', label: 'Fechado' },
];

export function KanbanContextMenu({
  children,
  lead,
  onEdit,
  onDelete,
  onMoveToStatus,
}: KanbanContextMenuProps) {
  const handleCopyPhone = async () => {
    if (!lead.phone) {
      toast.error('Lead não tem telefone');
      return;
    }
    const success = await copyToClipboard(lead.phone);
    if (success) {
      toast.success('Telefone copiado!');
    } else {
      toast.error('Erro ao copiar telefone');
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={() => onEdit?.(lead)}>
          <Edit className="mr-2 h-4 w-4" />
          Editar lead
        </ContextMenuItem>
        
        <ContextMenuItem onClick={handleCopyPhone} disabled={!lead.phone}>
          <Copy className="mr-2 h-4 w-4" />
          Copiar telefone
        </ContextMenuItem>
        
        <ContextMenuSeparator />
        
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <ArrowRight className="mr-2 h-4 w-4" />
            Mover para
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-40">
            {statusOptions
              .filter((s) => s.id !== lead.status)
              .map((status) => (
                <ContextMenuItem
                  key={status.id}
                  onClick={() => onMoveToStatus?.(lead, status.id)}
                >
                  {status.label}
                </ContextMenuItem>
              ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
        
        <ContextMenuSeparator />
        
        <ContextMenuItem
          onClick={() => onDelete?.(lead)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Deletar
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
