import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Loader2, MapPin, Plus, Sparkles, Eye, RefreshCw, RotateCcw, Globe } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useDuplicateBehavior } from "@/hooks/useDuplicateBehavior";
import { useNavigate } from "react-router-dom";
import { useCheckLimit } from "@/hooks/useCheckLimit";
import { UpgradeModal, UpgradeModalVariant } from "@/components/billing/UpgradeModal";

interface Campaign {
  id: string;
  name: string;
  goal: string;
  context: string | null;
  tone: string;
}

interface GoogleMapsScraperProps {
  onSearchComplete?: () => void;
  campaignId?: string;
  campaignName?: string;
  campaign?: Campaign;
  whatsappTemplate?: string;
  onWhatsappTemplateChange?: (template: string) => void;
}

interface RecentSearch {
  id: string;
  query: string;
  hoursAgo: number;
  totalResults: number;
  newLeads: number;
  duplicates: number;
  updatedLeads: number;
}

const exampleSearches = [
  "Academias em Londrina",
  "Clínicas de estética em Curitiba",
  "Restaurantes em Maringá",
  "Médicos em Londrina",
  "Salões de beleza em Cascavel",
];

export function GoogleMapsScraper({ 
  onSearchComplete, 
  campaignId, 
  campaignName,
  campaign,
  whatsappTemplate = '',
  onWhatsappTemplateChange
}: GoogleMapsScraperProps) {
  const navigate = useNavigate();
  const { behavior } = useDuplicateBehavior();
  const { checkLimit, incrementUsage, isChecking } = useCheckLimit();
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(20);
  const [isLoading, setIsLoading] = useState(false);
  const [country, setCountry] = useState("br");
  
  // Pagination state
  const [lastQuery, setLastQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalLoaded, setTotalLoaded] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // AI generation state
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);

  // Recent search dialog state
  const [recentSearchDialogOpen, setRecentSearchDialogOpen] = useState(false);
  const [recentSearch, setRecentSearch] = useState<RecentSearch | null>(null);
  const [pendingQuery, setPendingQuery] = useState("");

  // Upgrade modal state
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeModalVariant, setUpgradeModalVariant] = useState<UpgradeModalVariant>('limit_reached');
  const [pendingSearchAfterModal, setPendingSearchAfterModal] = useState<string | null>(null);

  const checkRecentSearch = async (searchQuery: string): Promise<boolean> => {
    if (behavior !== "ask") return false;

    try {
      const { data, error } = await supabase.functions.invoke("scrape-google-maps", {
        body: { query: searchQuery, checkRecent: true },
      });

      if (error) throw error;

      if (data.hasRecentSearch) {
        setRecentSearch(data.recentSearch);
        setPendingQuery(searchQuery);
        setRecentSearchDialogOpen(true);
        return true;
      }
    } catch (error) {
      console.error("Error checking recent search:", error);
    }
    return false;
  };

  const executeSearch = async (searchQuery: string, mode: string = "normal") => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("scrape-google-maps", {
        body: { query: searchQuery, limit, page: 1, campaignId, mode, country },
      });

      if (error) throw error;

      // Increment usage after successful search
      await incrementUsage();

      // Reset pagination state for new search
      setLastQuery(searchQuery);
      setCurrentPage(1);
      setTotalLoaded(data.count);
      setHasMore(data.hasMore);

      // LAYER 4: Show detailed stats in toast
      const stats = data.stats || { new: data.count, existing: 0, updated: 0 };
      toast.success(
        `Busca concluída!\n🟢 ${stats.new} novos\n🔵 ${stats.existing} existentes\n🟡 ${stats.updated} atualizados`,
        { duration: 5000 }
      );

      setQuery("");
      onSearchComplete?.();
    } catch (error: any) {
      console.error("Error scraping:", error);
      toast.error(error.message || "Erro ao buscar clientes");
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueLastSearch = async () => {
    if (pendingSearchAfterModal) {
      const mode = behavior === "update" ? "update" : "normal";
      await executeSearch(pendingSearchAfterModal, mode);
      setPendingSearchAfterModal(null);
    }
  };

  const handleSearch = async (searchQuery?: string) => {
    const finalQuery = searchQuery || query;
    
    if (!finalQuery.trim()) {
      toast.error("Digite uma busca");
      return;
    }

    // Check user limits before searching
    const limitResult = await checkLimit();
    
    if (!limitResult.allowed) {
      // Show upgrade modal for limit reached
      setUpgradeModalVariant('limit_reached');
      setUpgradeModalOpen(true);
      return;
    }

    if (limitResult.is_last_search) {
      // Show warning modal for last search
      setPendingSearchAfterModal(finalQuery);
      setUpgradeModalVariant('last_search');
      setUpgradeModalOpen(true);
      return;
    }

    // Check for recent search if behavior is "ask"
    const hasRecent = await checkRecentSearch(finalQuery);
    if (hasRecent) return;

    // Determine mode based on behavior setting
    const mode = behavior === "update" ? "update" : "normal";
    await executeSearch(finalQuery, mode);
  };

  const handleViewPreviousResults = () => {
    setRecentSearchDialogOpen(false);
    if (recentSearch) {
      navigate(`/google-maps-leads?search_id=${recentSearch.id}`);
    }
  };

  const handleSearchAgain = async () => {
    setRecentSearchDialogOpen(false);
    await executeSearch(pendingQuery, "normal");
  };

  const handleUpdateData = async () => {
    setRecentSearchDialogOpen(false);
    await executeSearch(pendingQuery, "update");
  };

  const handleLoadMore = async () => {
    if (!lastQuery || isLoadingMore) return;

    const nextPage = currentPage + 1;
    setIsLoadingMore(true);
    
    try {
      const mode = behavior === "update" ? "update" : "normal";
      const { data, error } = await supabase.functions.invoke("scrape-google-maps", {
        body: { query: lastQuery, limit: 20, page: nextPage, campaignId, mode, country },
      });

      if (error) throw error;

      setCurrentPage(nextPage);
      setTotalLoaded(prev => prev + data.count);
      setHasMore(data.hasMore);

      const stats = data.stats || { new: data.count, existing: 0, updated: 0 };
      toast.success(
        `🟢 ${stats.new} novos | 🔵 ${stats.existing} existentes | 🟡 ${stats.updated} atualizados`
      );

      onSearchComplete?.();
    } catch (error: any) {
      console.error("Error loading more:", error);
      toast.error(error.message || "Erro ao carregar mais leads");
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleGenerateWhatsAppMessage = async () => {
    if (!campaign) {
      toast.error("Campanha não encontrada");
      return;
    }

    setIsGeneratingMessage(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("generate-whatsapp", {
        body: { 
          campaign: {
            goal: campaign.goal,
            context: campaign.context,
            tone: campaign.tone,
          }
        },
      });

      if (error) throw error;

      if (data.message) {
        onWhatsappTemplateChange?.(data.message);
        toast.success("Mensagem gerada com sucesso!");
      }
    } catch (error: any) {
      console.error("Error generating message:", error);
      toast.error(error.message || "Erro ao gerar mensagem");
    } finally {
      setIsGeneratingMessage(false);
    }
  };

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <MapPin className="h-5 w-5 text-primary" />
            Buscar Leads
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Encontre empresas no Google Maps
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {totalLoaded > 0 && (
            <div className="flex flex-wrap gap-2 items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
              <Badge variant="secondary" className="text-sm">
                Total de leads carregados: {totalLoaded}
              </Badge>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="query" className="text-foreground">Busca</Label>
            <Input
              id="query"
              placeholder="Ex: Médicos em Londrina"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="bg-input border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="country" className="text-foreground">País</Label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger id="country" className="bg-input border-border">
                <Globe className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="br">🇧🇷 Brasil</SelectItem>
                <SelectItem value="us">🇺🇸 Estados Unidos</SelectItem>
                <SelectItem value="ca">🇨🇦 Canadá</SelectItem>
                <SelectItem value="mx">🇲🇽 México</SelectItem>
                <SelectItem value="ar">🇦🇷 Argentina</SelectItem>
                <SelectItem value="pt">🇵🇹 Portugal</SelectItem>
                <SelectItem value="es">🇪🇸 Espanha</SelectItem>
                <SelectItem value="uk">🇬🇧 Reino Unido</SelectItem>
                <SelectItem value="de">🇩🇪 Alemanha</SelectItem>
                <SelectItem value="fr">🇫🇷 França</SelectItem>
                <SelectItem value="it">🇮🇹 Itália</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="limit" className="text-foreground">Quantidade por busca</Label>
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <input
                  id="limit"
                  type="range"
                  min={5}
                  max={20}
                  step={1}
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="flex-1 h-2 bg-muted rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                />
                <span className="px-3 py-1 rounded-md bg-primary/10 text-primary font-medium text-sm min-w-[3rem] text-center">
                  {limit}
                </span>
              </div>
            </div>
          </div>

          <Button onClick={() => handleSearch()} disabled={isLoading} className="w-full">
            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Buscando...</> : <><Search className="mr-2 h-4 w-4" />Buscar Leads</>}
          </Button>

          {hasMore && lastQuery && (
            <Button onClick={handleLoadMore} disabled={isLoadingMore} variant="outline" className="w-full">
              {isLoadingMore ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Carregando...</> : <><Plus className="mr-2 h-4 w-4" />Carregar Mais 20 Leads</>}
            </Button>
          )}

          {campaign && (
            <div className="pt-4 border-t border-border space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="whatsapp-template" className="text-foreground">Template WhatsApp</Label>
                <Button size="sm" variant="ghost" onClick={handleGenerateWhatsAppMessage} disabled={isGeneratingMessage} className="h-7 px-2 text-primary hover:text-primary hover:bg-primary/10">
                  {isGeneratingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  <span className="ml-1 text-xs">Gerar com IA</span>
                </Button>
              </div>
              <Textarea id="whatsapp-template" value={whatsappTemplate} onChange={(e) => onWhatsappTemplateChange?.(e.target.value)} placeholder="Olá {nome}! Vi sua empresa no Google Maps..." className="min-h-[100px] bg-input border-border text-foreground" />
            </div>
          )}

          <div className="pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground mb-3">Exemplos de busca:</p>
            <div className="flex flex-wrap gap-2">
              {exampleSearches.map((example) => (
                <button key={example} onClick={() => setQuery(example)} disabled={isLoading} className="text-xs px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50">
                  {example}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* LAYER 3: Recent Search Dialog */}
      <Dialog open={recentSearchDialogOpen} onOpenChange={setRecentSearchDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Busca Recente Encontrada</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Você já fez esta busca há {recentSearch?.hoursAgo} hora(s) com {recentSearch?.totalResults} resultados.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <div className="flex gap-2">
              <Badge className="bg-green-500/20 text-green-400">🟢 {recentSearch?.newLeads} novos</Badge>
              <Badge className="bg-blue-500/20 text-blue-400">🔵 {recentSearch?.duplicates} duplicados</Badge>
              <Badge className="bg-yellow-500/20 text-yellow-400">🟡 {recentSearch?.updatedLeads} atualizados</Badge>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleViewPreviousResults} className="w-full sm:w-auto">
              <Eye className="mr-2 h-4 w-4" />Ver Resultados Anteriores
            </Button>
            <Button variant="secondary" onClick={handleSearchAgain} className="w-full sm:w-auto">
              <RotateCcw className="mr-2 h-4 w-4" />Buscar Novamente
            </Button>
            <Button onClick={handleUpdateData} className="w-full sm:w-auto">
              <RefreshCw className="mr-2 h-4 w-4" />Atualizar Dados
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upgrade Modal */}
      <UpgradeModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
        variant={upgradeModalVariant}
        onContinueLastSearch={handleContinueLastSearch}
      />
    </>
  );
}
