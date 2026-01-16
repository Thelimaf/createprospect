import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { 
  ExternalLink, 
  MapPin, 
  Building, 
  Mail, 
  Linkedin,
  Copy,
  Loader2,
  Check
} from 'lucide-react';
import { toast } from 'sonner';

interface Campaign {
  id: string;
  name: string;
  goal: string;
  context: string | null;
  tone: string;
}

interface SearchResult {
  id: string;
  search_id: string;
  item_id: string;
  name: string | null;
  url: string | null;
  enrichment_data: any;
}

interface ProspectCardProps {
  result: SearchResult;
  campaign: Campaign;
}

export function ProspectCard({ result, campaign }: ProspectCardProps) {
  const [open, setOpen] = useState(false);
  const [generatingEmail, setGeneratingEmail] = useState(false);
  const [generatingLinkedIn, setGeneratingLinkedIn] = useState(false);
  const [emailMessage, setEmailMessage] = useState('');
  const [linkedInMessage, setLinkedInMessage] = useState('');
  const [copied, setCopied] = useState(false);

  // Analisar dados de enriquecimento
  const person = result.enrichment_data?.person;
  const company = result.enrichment_data?.company;
  const displayName = result.name || person?.name || company?.name || 'Desconhecido';
  const displayUrl = result.url || result.enrichment_data?.url || '';
  const position = person?.position;
  const companyName = person?.company?.name || company?.name;
  const location = person?.location || person?.company?.location || company?.location;
  const pictureUrl = person?.pictureUrl;
  const description = person?.description || company?.description;

  const generateMessage = async (type: 'email' | 'linkedin') => {
    const setLoading = type === 'email' ? setGeneratingEmail : setGeneratingLinkedIn;
    const setMessage = type === 'email' ? setEmailMessage : setLinkedInMessage;
    
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-outreach', {
        body: {
          campaign: {
            goal: campaign.goal,
            context: campaign.context,
            tone: campaign.tone,
          },
          prospect: {
            name: displayName,
            position,
            company: companyName,
            location,
            description,
          },
          messageType: type,
        },
      });

      if (error) throw error;

      setMessage(data.message);
    } catch (error: any) {
      console.error('Erro ao gerar mensagem:', error);
      toast.error(error.message || 'Falha ao gerar mensagem');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copiado para a área de transferência');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Card 
        className="border-border bg-card transition-all hover:border-primary/50 hover:shadow-glow cursor-pointer"
        onClick={() => setOpen(true)}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={pictureUrl} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-foreground truncate">{displayName}</h4>
              {position && (
                <p className="text-sm text-muted-foreground truncate">{position}</p>
              )}
              {companyName && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <Building className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{companyName}</span>
                </div>
              )}
              {location && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{location}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Diálogo de Detalhes */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-foreground">
              <Avatar className="h-12 w-12">
                <AvatarImage src={pictureUrl} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <span>{displayName}</span>
                {position && <p className="text-sm font-normal text-muted-foreground">{position}</p>}
              </div>
            </DialogTitle>
            <DialogDescription className="sr-only">
              Detalhes do prospect e opções de alcance
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Detalhes */}
            <div className="flex flex-wrap gap-2">
              {companyName && (
                <Badge variant="secondary" className="bg-secondary text-secondary-foreground">
                  <Building className="mr-1 h-3 w-3" />
                  {companyName}
                </Badge>
              )}
              {location && (
                <Badge variant="secondary" className="bg-secondary text-secondary-foreground">
                  <MapPin className="mr-1 h-3 w-3" />
                  {location}
                </Badge>
              )}
            </div>

            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}

            {displayUrl && (
              <Button
                variant="outline"
                size="sm"
                asChild
                className="border-border text-foreground hover:bg-secondary"
              >
                <a href={displayUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Ver Perfil
                </a>
              </Button>
            )}

            {/* Abas de Alcance */}
            <Tabs defaultValue="email" className="w-full">
              <TabsList className="w-full bg-secondary">
                <TabsTrigger value="email" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Mail className="mr-2 h-4 w-4" />
                  Email
                </TabsTrigger>
                <TabsTrigger value="linkedin" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Linkedin className="mr-2 h-4 w-4" />
                  LinkedIn
                </TabsTrigger>
              </TabsList>

              <TabsContent value="email" className="mt-4">
                {emailMessage ? (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-border bg-background p-4">
                      <pre className="whitespace-pre-wrap text-sm text-foreground font-sans">
                        {emailMessage}
                      </pre>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => copyToClipboard(emailMessage)}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                        {copied ? 'Copiado!' : 'Copiar'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => generateMessage('email')}
                        disabled={generatingEmail}
                        className="border-border text-foreground hover:bg-secondary"
                      >
                        {generatingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Regenerar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={() => generateMessage('email')}
                    disabled={generatingEmail}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {generatingEmail ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Gerar Email
                      </>
                    )}
                  </Button>
                )}
              </TabsContent>

              <TabsContent value="linkedin" className="mt-4">
                {linkedInMessage ? (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-border bg-background p-4">
                      <pre className="whitespace-pre-wrap text-sm text-foreground font-sans">
                        {linkedInMessage}
                      </pre>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => copyToClipboard(linkedInMessage)}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                        {copied ? 'Copiado!' : 'Copiar'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => generateMessage('linkedin')}
                        disabled={generatingLinkedIn}
                        className="border-border text-foreground hover:bg-secondary"
                      >
                        {generatingLinkedIn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Regenerar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={() => generateMessage('linkedin')}
                    disabled={generatingLinkedIn}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {generatingLinkedIn ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      <>
                        <Linkedin className="mr-2 h-4 w-4" />
                        Gerar Mensagem LinkedIn
                      </>
                    )}
                  </Button>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
