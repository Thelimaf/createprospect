import { MapPin, Globe, Star, Phone, Building2, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { SourceType } from './SourceToggle';

interface SourceInfoCardProps {
  source: SourceType;
}

export function SourceInfoCard({ source }: SourceInfoCardProps) {
  if (source === 'google_maps') {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                Google Maps (Serper API)
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">Recomendado</span>
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Dados reais de empresas: nome, telefone, endereço, website e avaliações. 
                Enriquecimento automático de CNPJ via BrasilAPI.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">
                  <Phone className="h-3 w-3" /> Telefone
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">
                  <Star className="h-3 w-3" /> Avaliações
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">
                  <Building2 className="h-3 w-3" /> Endereço
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-accent/30 bg-accent/5">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
            <Globe className="h-5 w-5 text-accent" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              Busca Web (Firecrawl)
              <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent">Avançado</span>
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Busca ampla na web com extração inteligente de dados. 
              Ideal para nichos específicos e validação de CNPJ via BrasilAPI.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">
                <Search className="h-3 w-3" /> Web Crawling
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">
                <Building2 className="h-3 w-3" /> CNPJ
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
