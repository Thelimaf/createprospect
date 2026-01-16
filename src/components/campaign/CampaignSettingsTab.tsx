import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, MessageSquare } from 'lucide-react';

interface QuickReply {
  text: string;
  variables: string[];
}

interface CampaignSettingsTabProps {
  campaignId: string;
  quickReplies: QuickReply[] | null;
  onQuickRepliesUpdate: (replies: QuickReply[]) => void;
}

const AVAILABLE_VARIABLES = [
  { value: 'business_name', label: 'Nome do Negócio' },
  { value: 'category', label: 'Categoria' },
  { value: 'city', label: 'Cidade' },
  { value: 'phone', label: 'Telefone' },
  { value: 'my_name', label: 'Meu Nome' },
  { value: 'company_name', label: 'Minha Empresa' },
];

const DEFAULT_QUICK_REPLIES: QuickReply[] = [
  { text: 'Olá {business_name}!', variables: ['business_name'] },
  { text: 'Sou {my_name} da {company_name}', variables: ['my_name', 'company_name'] },
  { text: 'Vi sua empresa no Google Maps', variables: [] },
  { text: 'Podemos conversar sobre {category}?', variables: ['category'] },
  { text: 'Gostaria de apresentar uma proposta', variables: [] },
];

export function CampaignSettingsTab({
  campaignId,
  quickReplies,
  onQuickRepliesUpdate,
}: CampaignSettingsTabProps) {
  const [replies, setReplies] = useState<QuickReply[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newReplyText, setNewReplyText] = useState('');
  const [newReplyVariables, setNewReplyVariables] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize replies
  useEffect(() => {
    if (quickReplies && quickReplies.length > 0) {
      setReplies(quickReplies);
    } else {
      // Use default replies for new campaigns
      setReplies(DEFAULT_QUICK_REPLIES);
    }
  }, [quickReplies]);

  // Save replies to database
  const saveReplies = async (newReplies: QuickReply[]) => {
    setIsSaving(true);
    
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ quick_replies: JSON.parse(JSON.stringify(newReplies)) })
        .eq('id', campaignId);

      if (error) throw error;

      setReplies(newReplies);
      onQuickRepliesUpdate(newReplies);
      toast.success('Respostas rápidas salvas!');
    } catch (error) {
      console.error('Error saving quick replies:', error);
      toast.error('Erro ao salvar respostas rápidas');
    } finally {
      setIsSaving(false);
    }
  };

  // Open dialog for new reply
  const handleAddReply = () => {
    setEditingIndex(null);
    setNewReplyText('');
    setNewReplyVariables([]);
    setDialogOpen(true);
  };

  // Open dialog for editing
  const handleEditReply = (index: number) => {
    const reply = replies[index];
    setEditingIndex(index);
    setNewReplyText(reply.text);
    setNewReplyVariables(reply.variables);
    setDialogOpen(true);
  };

  // Delete reply
  const handleDeleteReply = (index: number) => {
    const newReplies = replies.filter((_, i) => i !== index);
    saveReplies(newReplies);
  };

  // Save reply from dialog
  const handleSaveReply = () => {
    if (!newReplyText.trim()) {
      toast.error('Digite o texto da resposta');
      return;
    }

    const newReply: QuickReply = {
      text: newReplyText.trim(),
      variables: newReplyVariables,
    };

    let newReplies: QuickReply[];
    
    if (editingIndex !== null) {
      newReplies = [...replies];
      newReplies[editingIndex] = newReply;
    } else {
      newReplies = [...replies, newReply];
    }

    saveReplies(newReplies);
    setDialogOpen(false);
  };

  // Toggle variable selection
  const toggleVariable = (variable: string) => {
    setNewReplyVariables((prev) =>
      prev.includes(variable)
        ? prev.filter((v) => v !== variable)
        : [...prev, variable]
    );
  };

  // Get display text for preview
  const getPreviewText = (text: string) => {
    return text.length > 40 ? text.substring(0, 40) + '...' : text;
  };

  return (
    <div className="space-y-6">
      {/* Quick Replies Section */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <MessageSquare className="h-5 w-5 text-primary" />
            Respostas Rápidas
          </CardTitle>
          <CardDescription>
            Configure mensagens que você usa frequentemente para agilizar suas conversas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick Replies Table */}
          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Texto</TableHead>
                  <TableHead className="w-48">Variáveis</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {replies.map((reply, index) => (
                  <motion.tr
                    key={index}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-muted/30"
                  >
                    <TableCell className="font-medium">
                      {getPreviewText(reply.text)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {reply.variables.length > 0 ? (
                          reply.variables.map((v) => (
                            <Badge key={v} variant="outline" className="text-xs">
                              {`{${v}}`}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-xs">Nenhuma</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => handleEditReply(index)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteReply(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
                {replies.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      Nenhuma resposta rápida configurada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Add Button */}
          <Button onClick={handleAddReply} variant="outline" className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Resposta Rápida
          </Button>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>
              {editingIndex !== null ? 'Editar Resposta Rápida' : 'Nova Resposta Rápida'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Text Input */}
            <div className="space-y-2">
              <Label htmlFor="reply-text">Texto da Resposta</Label>
              <Input
                id="reply-text"
                value={newReplyText}
                onChange={(e) => setNewReplyText(e.target.value)}
                placeholder="Ex: Olá {business_name}!"
                className="bg-input"
              />
              <p className="text-xs text-muted-foreground">
                Use variáveis como {'{business_name}'} para personalizar a mensagem
              </p>
            </div>

            {/* Variables Selection */}
            <div className="space-y-2">
              <Label>Variáveis Disponíveis</Label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_VARIABLES.map((variable) => (
                  <button
                    key={variable.value}
                    onClick={() => toggleVariable(variable.value)}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                      newReplyVariables.includes(variable.value)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-secondary border-border hover:border-primary'
                    }`}
                  >
                    {`{${variable.value}}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            {newReplyText && (
              <div className="space-y-2">
                <Label>Prévia</Label>
                <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                  <p className="text-sm">{newReplyText}</p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveReply} disabled={isSaving}>
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
