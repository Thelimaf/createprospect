import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Building, 
  Globe, 
  Users, 
  Calendar,
  DollarSign,
  Briefcase,
  FileText,
  Link,
  Loader2,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Sparkles
} from "lucide-react";
import { brasilApi, firecrawlApi, formatCnpj, formatCurrency, formatDate } from "@/lib/api/enrichment";
import { toast } from "sonner";

interface Socio {
  nome_socio: string;
  qualificacao_socio: string;
  data_entrada_sociedade?: string;
}

interface ScrapeData {
  content?: string;
  links?: Array<{ url: string; text?: string }>;
  title?: string;
  description?: string;
  scraped_at?: string;
}

interface Lead {
  id: string;
  business_name: string;
  category?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  google_maps_url?: string | null;
  rating?: number | null;
  reviews_count?: number | null;
  status: string;
  // CNPJ enrichment fields
  cnpj?: string | null;
  razao_social?: string | null;
  nome_fantasia?: string | null;
  cnpj_status?: string | null;
  cnae_principal?: string | null;
  socios?: Socio[] | null;
  capital_social?: number | null;
  data_abertura?: string | null;
  enriched_at?: string | null;
  // Scrape data
  scrape_data?: ScrapeData | null;
}

interface LeadDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  lead: Lead;
  onLeadUpdated?: () => void;
}

export function LeadDetailsDialog({ open, onClose, lead, onLeadUpdated }: LeadDetailsDialogProps) {
  const [isEnrichingCnpj, setIsEnrichingCnpj] = useState(false);
  const [isScrapingWebsite, setIsScrapingWebsite] = useState(false);
  const [isEnrichingAll, setIsEnrichingAll] = useState(false);
  const [localLead, setLocalLead] = useState(lead);

  // Update local lead when prop changes
  if (lead.id !== localLead.id) {
    setLocalLead(lead);
  }

  const handleEnrichCnpj = async () => {
    setIsEnrichingCnpj(true);
    try {
      const result = await brasilApi.enrichCnpj(lead.id, lead.business_name, lead.city || undefined);
      
      if (result.success && result.data) {
        const enrichData = result.data as {
          cnpj?: string;
          razao_social?: string;
          nome_fantasia?: string;
          situacao?: string;
          cnae?: string;
          socios?: Socio[];
          capital_social?: number;
          data_abertura?: string;
        };
        toast.success("CNPJ encontrado e dados enriquecidos!");
        setLocalLead(prev => ({
          ...prev,
          cnpj: enrichData.cnpj,
          razao_social: enrichData.razao_social,
          nome_fantasia: enrichData.nome_fantasia,
          cnpj_status: enrichData.situacao,
          cnae_principal: enrichData.cnae,
          socios: enrichData.socios,
          capital_social: enrichData.capital_social,
          data_abertura: enrichData.data_abertura,
          enriched_at: new Date().toISOString(),
        }));
        onLeadUpdated?.();
      } else {
        toast.error(result.error || "Erro ao buscar CNPJ");
      }
    } catch (error) {
      console.error("Error enriching CNPJ:", error);
      toast.error("Erro ao buscar dados do CNPJ");
    } finally {
      setIsEnrichingCnpj(false);
    }
  };

  const handleScrapeWebsite = async () => {
    if (!lead.website) {
      toast.error("Lead não possui website cadastrado");
      return;
    }

    setIsScrapingWebsite(true);
    try {
      const result = await firecrawlApi.scrape(lead.website, lead.id);
      
      if (result.success && result.data) {
        const scrapeResult = result.data as {
          data?: {
            markdown?: string;
            links?: Array<{ url: string; text?: string }>;
            metadata?: { title?: string; description?: string };
          };
        };
        toast.success("Website analisado com sucesso!");
        setLocalLead(prev => ({
          ...prev,
          scrape_data: {
            content: scrapeResult.data?.markdown,
            links: scrapeResult.data?.links,
            title: scrapeResult.data?.metadata?.title,
            description: scrapeResult.data?.metadata?.description,
            scraped_at: new Date().toISOString(),
          },
        }));
        onLeadUpdated?.();
      } else {
        toast.error(result.error || "Erro ao analisar website");
      }
    } catch (error) {
      console.error("Error scraping website:", error);
      toast.error("Erro ao analisar website");
    } finally {
      setIsScrapingWebsite(false);
    }
  };

  // Enrich all data (CNPJ + Website scrape)
  const handleEnrichAll = async () => {
    setIsEnrichingAll(true);
    const results: string[] = [];

    try {
      // Step 1: Search CNPJ
      if (!localLead.cnpj) {
        toast.loading("Buscando CNPJ...", { id: "enrich-all" });
        const cnpjResult = await brasilApi.enrichCnpj(lead.id, lead.business_name, lead.city || undefined);
        
        if (cnpjResult.success && cnpjResult.data) {
          const enrichData = cnpjResult.data as any;
          setLocalLead(prev => ({
            ...prev,
            cnpj: enrichData.cnpj,
            razao_social: enrichData.razao_social,
            nome_fantasia: enrichData.nome_fantasia,
            cnpj_status: enrichData.situacao,
            cnae_principal: enrichData.cnae,
            socios: enrichData.socios,
            capital_social: enrichData.capital_social,
            data_abertura: enrichData.data_abertura,
            enriched_at: new Date().toISOString(),
          }));
          results.push("CNPJ encontrado");
        } else {
          results.push("CNPJ não encontrado");
        }
      } else {
        results.push("CNPJ já existia");
      }

      // Step 2: Scrape website
      if (localLead.website && !localLead.scrape_data?.content) {
        toast.loading("Analisando website...", { id: "enrich-all" });
        const scrapeResult = await firecrawlApi.scrape(localLead.website, lead.id);
        
        if (scrapeResult.success && scrapeResult.data) {
          const data = scrapeResult.data as any;
          setLocalLead(prev => ({
            ...prev,
            scrape_data: {
              content: data.data?.markdown,
              links: data.data?.links,
              title: data.data?.metadata?.title,
              description: data.data?.metadata?.description,
              scraped_at: new Date().toISOString(),
            },
          }));
          results.push("Site analisado");
        } else {
          results.push("Falha ao analisar site");
        }
      } else if (!localLead.website) {
        results.push("Sem website");
      } else {
        results.push("Site já analisado");
      }

      toast.success(`Enriquecimento concluído: ${results.join(", ")}`, { id: "enrich-all" });
      onLeadUpdated?.();
    } catch (error) {
      console.error("Error enriching all:", error);
      toast.error("Erro ao enriquecer dados", { id: "enrich-all" });
    } finally {
      setIsEnrichingAll(false);
    }
  };

  const hasCnpjData = !!localLead.cnpj;
  const hasWebsiteData = !!localLead.scrape_data?.content;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5 text-primary" />
            {localLead.business_name}
          </DialogTitle>
        </DialogHeader>

        {/* Enrich All Button */}
        <Button 
          onClick={handleEnrichAll}
          disabled={isEnrichingAll || isEnrichingCnpj || isScrapingWebsite}
          className="w-full mb-4 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
        >
          {isEnrichingAll ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Enriquecendo dados...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Enriquecer Dados Completos
            </>
          )}
        </Button>

        <Tabs defaultValue="info" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="cnpj" className="flex items-center gap-1">
              CNPJ
              {hasCnpjData && <CheckCircle className="h-3 w-3 text-green-500" />}
            </TabsTrigger>
            <TabsTrigger value="website" className="flex items-center gap-1">
              Website
              {hasWebsiteData && <CheckCircle className="h-3 w-3 text-green-500" />}
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            {/* Info Tab */}
            <TabsContent value="info" className="mt-0 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InfoItem label="Categoria" value={localLead.category} />
                <InfoItem label="Cidade" value={localLead.city} />
                <InfoItem label="Estado" value={localLead.state} />
                <InfoItem label="Telefone" value={localLead.phone} />
                <InfoItem label="Email" value={localLead.email} />
                <InfoItem label="Avaliação" value={localLead.rating ? `${localLead.rating} ⭐` : null} />
                <InfoItem label="Avaliações" value={localLead.reviews_count?.toString()} />
              </div>
              {localLead.address && (
                <div>
                  <p className="text-sm text-muted-foreground">Endereço</p>
                  <p className="text-sm">{localLead.address}</p>
                </div>
              )}
              {localLead.website && (
                <div>
                  <p className="text-sm text-muted-foreground">Website</p>
                  <a 
                    href={localLead.website.startsWith('http') ? localLead.website : `https://${localLead.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    {localLead.website}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </TabsContent>

            {/* CNPJ Tab */}
            <TabsContent value="cnpj" className="mt-0 space-y-4">
              {hasCnpjData ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">CNPJ</p>
                      <p className="text-lg font-mono font-semibold">{formatCnpj(localLead.cnpj!)}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Razão Social</p>
                      <p className="text-sm font-medium">{localLead.razao_social || "-"}</p>
                    </div>
                    {localLead.nome_fantasia && (
                      <div className="col-span-2">
                        <p className="text-sm text-muted-foreground">Nome Fantasia</p>
                        <p className="text-sm">{localLead.nome_fantasia}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground">Situação</p>
                      <Badge variant={localLead.cnpj_status === "ATIVA" ? "default" : "secondary"}>
                        {localLead.cnpj_status || "-"}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Data de Abertura</p>
                      <p className="text-sm flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(localLead.data_abertura)}
                      </p>
                    </div>
                    {localLead.cnae_principal && (
                      <div className="col-span-2">
                        <p className="text-sm text-muted-foreground">CNAE Principal</p>
                        <p className="text-sm flex items-center gap-1">
                          <Briefcase className="h-3.5 w-3.5" />
                          {localLead.cnae_principal}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground">Capital Social</p>
                      <p className="text-sm flex items-center gap-1">
                        <DollarSign className="h-3.5 w-3.5" />
                        {formatCurrency(localLead.capital_social)}
                      </p>
                    </div>
                  </div>

                  {localLead.socios && localLead.socios.length > 0 && (
                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        Quadro Societário ({localLead.socios.length})
                      </p>
                      <div className="space-y-2">
                        {localLead.socios.map((socio, i) => (
                          <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                            <span className="text-sm font-medium">{socio.nome_socio}</span>
                            <Badge variant="outline" className="text-xs">
                              {socio.qualificacao_socio}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {localLead.enriched_at && (
                    <p className="text-xs text-muted-foreground pt-2">
                      Enriquecido em {formatDate(localLead.enriched_at)}
                    </p>
                  )}
                </>
              ) : (
                <div className="text-center py-8 space-y-4">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
                  <div>
                    <p className="text-muted-foreground">
                      Dados do CNPJ ainda não foram buscados.
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Clique no botão abaixo para buscar automaticamente o CNPJ via Firecrawl e consultar a Brasil API.
                    </p>
                  </div>
                  <Button onClick={handleEnrichCnpj} disabled={isEnrichingCnpj}>
                    {isEnrichingCnpj ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Buscando CNPJ...
                      </>
                    ) : (
                      <>
                        <Building className="mr-2 h-4 w-4" />
                        Buscar Dados do CNPJ
                      </>
                    )}
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Website Tab */}
            <TabsContent value="website" className="mt-0 space-y-4">
              {hasWebsiteData ? (
                <>
                  {localLead.scrape_data?.title && (
                    <div>
                      <p className="text-sm text-muted-foreground">Título da Página</p>
                      <p className="text-sm font-medium">{localLead.scrape_data.title}</p>
                    </div>
                  )}
                  {localLead.scrape_data?.description && (
                    <div>
                      <p className="text-sm text-muted-foreground">Descrição</p>
                      <p className="text-sm">{localLead.scrape_data.description}</p>
                    </div>
                  )}
                  
                  <div className="border-t pt-4">
                    <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      Conteúdo Extraído
                    </p>
                    <ScrollArea className="h-[200px] rounded-md border p-3 bg-muted/30">
                      <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-xs">
                        {localLead.scrape_data?.content || "Sem conteúdo extraído"}
                      </div>
                    </ScrollArea>
                  </div>

                  {localLead.scrape_data?.links && localLead.scrape_data.links.length > 0 && (
                    <div className="border-t pt-4">
                      <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                        <Link className="h-4 w-4" />
                        Links Encontrados ({localLead.scrape_data.links.length})
                      </p>
                      <div className="space-y-1 max-h-[150px] overflow-auto">
                        {localLead.scrape_data.links.slice(0, 20).map((link, i) => (
                          <a
                            key={i}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-xs text-primary hover:underline truncate"
                          >
                            {link.text || link.url}
                          </a>
                        ))}
                        {localLead.scrape_data.links.length > 20 && (
                          <p className="text-xs text-muted-foreground">
                            +{localLead.scrape_data.links.length - 20} links...
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {localLead.scrape_data?.scraped_at && (
                    <p className="text-xs text-muted-foreground pt-2">
                      Analisado em {formatDate(localLead.scrape_data.scraped_at)}
                    </p>
                  )}
                </>
              ) : (
                <div className="text-center py-8 space-y-4">
                  <Globe className="h-12 w-12 text-muted-foreground mx-auto" />
                  <div>
                    <p className="text-muted-foreground">
                      Website ainda não foi analisado.
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {localLead.website 
                        ? "Clique no botão abaixo para extrair o conteúdo do site via Firecrawl."
                        : "Este lead não possui website cadastrado."}
                    </p>
                  </div>
                  {localLead.website && (
                    <Button onClick={handleScrapeWebsite} disabled={isScrapingWebsite}>
                      {isScrapingWebsite ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Analisando Site...
                        </>
                      ) : (
                        <>
                          <Globe className="mr-2 h-4 w-4" />
                          Analisar Website
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function InfoItem({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}
