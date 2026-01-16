import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, MapPin, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GoogleMapsScraperProps {
  onSearchComplete?: () => void;
  campaignId?: string;
  campaignName?: string;
}

const exampleSearches = [
  "Academias em Londrina",
  "Clínicas de estética em Curitiba",
  "Restaurantes em Maringá",
  "Médicos em Londrina",
  "Salões de beleza em Cascavel",
];

export function GoogleMapsScraper({ onSearchComplete, campaignId, campaignName }: GoogleMapsScraperProps) {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(20);
  const [isLoading, setIsLoading] = useState(false);
  
  // Pagination state
  const [lastQuery, setLastQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalLoaded, setTotalLoaded] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const handleSearch = async (searchQuery?: string) => {
    const finalQuery = searchQuery || query;
    
    if (!finalQuery.trim()) {
      toast.error("Digite uma busca");
      return;
    }

    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("scrape-google-maps", {
        body: { query: finalQuery, limit, page: 1, campaignId },
      });

      if (error) throw error;

      // Reset pagination state for new search
      setLastQuery(finalQuery);
      setCurrentPage(1);
      setTotalLoaded(data.count);
      setHasMore(data.hasMore);

      if (campaignName) {
        toast.success(`Busca iniciada para campanha "${campaignName}" - ${data.count} leads encontrados`);
      } else {
        toast.success(data.message);
      }
      setQuery("");
      onSearchComplete?.();
    } catch (error: any) {
      console.error("Error scraping:", error);
      toast.error(error.message || "Erro ao buscar leads");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (!lastQuery || isLoadingMore) return;

    const nextPage = currentPage + 1;
    setIsLoadingMore(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("scrape-google-maps", {
        body: { query: lastQuery, limit: 20, page: nextPage, campaignId },
      });

      if (error) throw error;

      setCurrentPage(nextPage);
      setTotalLoaded(prev => prev + data.count);
      setHasMore(data.hasMore);

      if (data.hasMore) {
        toast.success(`Mais ${data.count} leads carregados`);
      } else {
        toast.info("Todos os resultados foram carregados");
      }

      onSearchComplete?.();
    } catch (error: any) {
      console.error("Error loading more:", error);
      toast.error(error.message || "Erro ao carregar mais leads");
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
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
        {/* Pagination info */}
        {totalLoaded > 0 && (
          <div className="flex flex-wrap gap-2 items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
            <Badge variant="secondary" className="text-sm">
              Total de leads carregados: {totalLoaded}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Mostrando {((currentPage - 1) * 20) + 1}-{Math.min(currentPage * 20, totalLoaded)} de muitos
            </span>
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
                aria-label="Quantidade por busca"
                aria-valuemin={5}
                aria-valuemax={20}
                aria-valuenow={limit}
                className="flex-1 h-2 bg-muted rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
              />
              <span className="px-3 py-1 rounded-md bg-primary/10 text-primary font-medium text-sm min-w-[3rem] text-center">
                {limit}
              </span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>5</span>
              <span>20</span>
            </div>
          </div>
        </div>

        <Button 
          onClick={() => handleSearch()} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Buscando...
            </>
          ) : (
            <>
              <Search className="mr-2 h-4 w-4" />
              Buscar Leads
            </>
          )}
        </Button>

        {/* Load More Button */}
        {hasMore && lastQuery && (
          <Button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            variant="outline"
            className="w-full"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Carregando...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Carregar Mais 20 Leads
              </>
            )}
          </Button>
        )}

        {/* All results loaded message */}
        {totalLoaded > 0 && !hasMore && lastQuery && (
          <p className="text-sm text-center text-muted-foreground py-2">
            ✓ Todos os resultados foram carregados
          </p>
        )}

        <div className="pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground mb-3">Exemplos de busca:</p>
          <div className="flex flex-wrap gap-2">
            {exampleSearches.map((example) => (
              <button
                key={example}
                onClick={() => {
                  setQuery(example);
                  toast.success("Campo preenchido! Clique em Buscar Leads para iniciar", {
                    duration: 2000,
                  });
                }}
                disabled={isLoading}
                className="text-xs px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
