import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { buildWhatsAppUrl } from '@/lib/external-links';
import { toast } from 'sonner';
import {
  MessageCircle,
  Sparkles,
  Loader2,
  Star,
  Phone,
  MapPin,
  Plus,
  Send,
} from 'lucide-react';

interface Lead {
  id: string;
  business_name: string;
  phone: string | null;
  rating: number | null;
  category: string | null;
  city: string | null;
  address: string | null;
}

interface QuickReply {
  text: string;
  variables: string[];
}

interface Campaign {
  id: string;
  name: string;
  goal: string;
  context: string | null;
  tone: string;
  quick_replies: QuickReply[] | null;
}

interface WhatsAppMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
  campaign: Campaign;
  onStatusUpdate: (leadId: string) => void;
}

const DEFAULT_QUICK_REPLIES: QuickReply[] = [
  { text: 'Olá {business_name}!', variables: ['business_name'] },
  { text: 'Vi no Google Maps', variables: [] },
  { text: 'Gostaria de apresentar proposta', variables: [] },
  { text: 'Podemos agendar conversa?', variables: [] },
  { text: 'Obrigado pelo seu tempo', variables: [] },
];

export function WhatsAppMessageDialog({
  open,
  onOpenChange,
  lead,
  campaign,
  onStatusUpdate,
}: WhatsAppMessageDialogProps) {
  const { user } = useAuth();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [message, setMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);

  // Get quick replies from campaign or use defaults
  const quickReplies = campaign.quick_replies?.length 
    ? campaign.quick_replies 
    : DEFAULT_QUICK_REPLIES;

  // Reset message when lead changes
  useEffect(() => {
    setMessage('');
  }, [lead.id]);

  // Generate initial message when dialog opens or lead changes
  useEffect(() => {
    if (open) {
      generateMessage();
    }
  }, [open, lead.id]);

  // Replace variables in text
  const replaceVariables = (text: string): string => {
    const userName = user?.user_metadata?.full_name || '';
    const companyName = campaign.context?.split(' ')[0] || '';

    return text
      .replace(/{business_name}/g, lead.business_name)
      .replace(/{category}/g, lead.category || '')
      .replace(/{city}/g, lead.city || '')
      .replace(/{phone}/g, lead.phone || '')
      .replace(/{my_name}/g, userName)
      .replace(/{company_name}/g, companyName);
  };

  // Generate AI message
  const generateMessage = async () => {
    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-whatsapp', {
        body: {
          campaign: {
            goal: campaign.goal,
            context: campaign.context,
            tone: campaign.tone,
          },
          lead: {
            business_name: lead.business_name,
            category: lead.category,
            city: lead.city,
            rating: lead.rating,
          },
        },
      });

      if (error) throw error;

      if (data.message) {
        // Replace {nome} placeholder with actual business name
        const personalizedMessage = data.message.replace(/{nome}/g, lead.business_name);
        setMessage(personalizedMessage);
      }
    } catch (error) {
      console.error('Error generating message:', error);
      toast.error('Erro ao gerar mensagem');
      // Set a fallback message
      setMessage(`Olá ${lead.business_name}! Vi sua empresa no Google Maps e gostaria de apresentar uma proposta. Podemos conversar?`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Insert quick reply at cursor position
  const handleQuickReplyClick = (quickReply: QuickReply) => {
    const replacedText = replaceVariables(quickReply.text);
    const textarea = textareaRef.current;
    
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newMessage = message.substring(0, start) + replacedText + ' ' + message.substring(end);
      setMessage(newMessage);
      
      // Set cursor position after inserted text
      setTimeout(() => {
        textarea.focus();
        const newPosition = start + replacedText.length + 1;
        textarea.setSelectionRange(newPosition, newPosition);
      }, 0);
    } else {
      setMessage(prev => prev + ' ' + replacedText);
    }
  };

  // Send WhatsApp message
  const handleSendWhatsApp = () => {
    if (!message.trim()) {
      toast.error('Digite uma mensagem');
      return;
    }

    if (!lead.phone) {
      toast.error('Lead sem telefone');
      return;
    }

    const whatsappUrl = buildWhatsAppUrl(lead.phone, message);
    window.open(whatsappUrl, '_blank');

    // Update lead status to contacted
    onStatusUpdate(lead.id);
    
    toast.success('Abrindo WhatsApp...');
    onOpenChange(false);
  };

  // Render stars
  const renderStars = (rating: number | null) => {
    if (!rating) return null;
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card border-border backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <MessageCircle className="h-5 w-5 text-green-500" />
            Enviar Mensagem WhatsApp
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Para {lead.business_name}
          </p>
        </DialogHeader>

        <div className="space-y-5">
          {/* Lead Summary Card */}
          <Card className="bg-secondary/50 border-border">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12 bg-primary/10">
                  <AvatarFallback className="text-primary font-semibold">
                    {lead.business_name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-foreground truncate">
                    {lead.business_name}
                  </h4>
                  {lead.phone && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {lead.phone}
                    </div>
                  )}
                  {lead.city && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {lead.city}
                    </div>
                  )}
                  {renderStars(lead.rating)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Message Textarea */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">
                Mensagem gerada por IA
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={generateMessage}
                disabled={isGenerating}
                className="h-8 px-3 text-primary hover:text-primary hover:bg-primary/10 border-primary/30"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                <span className="ml-1.5 text-xs">Gerar Nova</span>
              </Button>
            </div>
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onSelect={(e) => setCursorPosition((e.target as HTMLTextAreaElement).selectionStart)}
              placeholder="Digite sua mensagem..."
              className="min-h-[150px] bg-input border-border resize-none"
              disabled={isGenerating}
            />
            <p className="text-xs text-muted-foreground text-right">
              {message.length}/500 caracteres
            </p>
          </div>

          {/* Quick Replies - Below Textarea */}
          <div className="space-y-3 pt-2 border-t border-border">
            <p className="text-sm font-medium text-foreground pt-2">Inserir texto rápido:</p>
            <ScrollArea className="w-full">
              <div className="flex flex-wrap gap-2 pb-2">
                {quickReplies.map((qr, index) => (
                  <Tooltip key={index}>
                    <TooltipTrigger asChild>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleQuickReplyClick(qr)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs 
                                   border border-border bg-secondary/50 hover:bg-primary hover:text-primary-foreground
                                   hover:border-primary transition-colors whitespace-nowrap"
                      >
                        <Plus className="h-3 w-3" />
                        <span className="truncate max-w-[120px]">
                          {replaceVariables(qr.text).substring(0, 20)}...
                        </span>
                      </motion.button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{replaceVariables(qr.text)}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              onClick={handleSendWhatsApp}
              disabled={!message.trim() || isGenerating}
            >
              <Send className="mr-2 h-4 w-4" />
              Enviar no WhatsApp
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
