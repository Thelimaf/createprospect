import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Loader2, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GoogleMapsScraperProps {
  onSearchComplete?: () => void;
}

const exampleSearches = [
  "Academias em Londrina",
  "Clínicas de estética em Curitiba",
  "Restaurantes em Maringá",
  "Médicos em Londrina",
  "Salões de beleza em Cascavel",
];

export function GoogleMapsScraper({ onSearchComplete }: GoogleMapsScraperProps) {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(50);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (searchQuery?: string) => {
    const finalQuery = searchQuery || query;
    
    if (!finalQuery.trim()) {
      toast.error("Digite uma busca");
      return;
    }

    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("scrape-google-maps", {
        body: { query: finalQuery, limit },
      });

      if (error) throw error;

      toast.success(data.message);
      setQuery("");
      onSearchComplete?.();
    } catch (error: any) {
      console.error("Error scraping:", error);
      toast.error(error.message || "Erro ao buscar leads");
    } finally {
      setIsLoading(false);
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
          <Label htmlFor="limit" className="text-foreground">Quantidade máxima</Label>
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <input
                id="limit"
                type="range"
                min={10}
                max={100}
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                aria-label="Quantidade máxima de resultados"
                aria-valuemin={10}
                aria-valuemax={100}
                aria-valuenow={limit}
                className="flex-1 h-2 bg-muted rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
              />
              <span className="px-3 py-1 rounded-md bg-primary/10 text-primary font-medium text-sm min-w-[3rem] text-center">
                {limit}
              </span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>10</span>
              <span>100</span>
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
