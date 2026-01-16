import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CampaignSettingsTab } from '@/components/campaign/CampaignSettingsTab';
import { MessageSquare, Zap, Link2 } from 'lucide-react';

interface QuickReply {
  text: string;
  variables: string[];
}

interface ConfigModalProps {
  open: boolean;
  onClose: () => void;
  campaignId: string;
  quickReplies: QuickReply[] | null;
  onQuickRepliesUpdate: (replies: QuickReply[]) => void;
}

export function ConfigModal({
  open,
  onClose,
  campaignId,
  quickReplies,
  onQuickRepliesUpdate,
}: ConfigModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-[800px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Configurações da Campanha</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="quick-replies" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3 shrink-0">
            <TabsTrigger value="quick-replies" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Respostas Rápidas</span>
            </TabsTrigger>
            <TabsTrigger value="automations" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">Automações</span>
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              <span className="hidden sm:inline">Integrações</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="quick-replies" className="flex-1 overflow-auto mt-4">
            <CampaignSettingsTab
              campaignId={campaignId}
              quickReplies={quickReplies}
              onQuickRepliesUpdate={onQuickRepliesUpdate}
            />
          </TabsContent>

          <TabsContent value="automations" className="flex-1 overflow-auto mt-4">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Zap className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Em breve
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Configure automações de follow-up para enviar mensagens automaticamente
              </p>
            </div>
          </TabsContent>

          <TabsContent value="integrations" className="flex-1 overflow-auto mt-4">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Link2 className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Em breve
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Conecte com CRMs e outras ferramentas para sincronizar seus leads
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
