import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Target, Briefcase, MessageSquare, Pencil } from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  goal: string;
  context: string | null;
  tone: string;
}

interface CampaignOverviewProps {
  campaign: Campaign;
  isExpanded: boolean;
  onEdit?: () => void;
}

const toneLabels: Record<string, string> = {
  professional: 'Profissional',
  casual: 'Casual',
  friendly: 'Amigável',
};

export function CampaignOverview({ campaign, isExpanded, onEdit }: CampaignOverviewProps) {
  return (
    <AnimatePresence>
      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
          <Card className="border-border bg-card mb-6">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Target className="h-4 w-4 text-primary" />
                    Objetivo
                  </div>
                  <p className="text-foreground font-medium">{campaign.goal}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Briefcase className="h-4 w-4 text-primary" />
                    Contexto
                  </div>
                  <p className="text-foreground font-medium">{campaign.context || '-'}</p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      Tom
                    </div>
                    <Badge variant="secondary">{toneLabels[campaign.tone] || campaign.tone}</Badge>
                  </div>
                  {onEdit && (
                    <Button variant="outline" size="sm" onClick={onEdit}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
