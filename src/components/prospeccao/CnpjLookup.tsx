import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Building2, Search, Loader2, CheckCircle, XCircle, Plus, Users } from 'lucide-react';
import { formatCnpj, formatCurrency, formatDate } from '@/lib/api/enrichment';
import { toast } from 'sonner';

interface CnpjData {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  descricao_situacao_cadastral: string;
  cnae_fiscal_descricao: string;
  capital_social: number;
  data_inicio_atividade: string;
  qsa: Array<{ nome_socio: string; qualificacao_socio: string }>;
  logradouro: string;
  numero: string;
  municipio: string;
  uf: string;
  cep: string;
  ddd_telefone_1: string;
  email: string;
}

export function CnpjLookup() {
  const [cnpjInput, setCnpjInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CnpjData | null>(null);

  const handleSearch = async () => {
    const cleanCnpj = cnpjInput.replace(/\D/g, '');
    if (cleanCnpj.length !== 14) {
      toast.error('CNPJ deve ter 14 dígitos');
      return;
    }

    setLoading(true);
    setData(null);

    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
      if (!response.ok) {
        throw new Error('CNPJ não encontrado');
      }
      const result = await response.json();
      setData(result);
    } catch (error) {
      toast.error('Erro ao consultar CNPJ. Verifique o número e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToBase = () => {
    if (!data) return;
    toast.success(`${data.nome_fantasia || data.razao_social} adicionado à base!`);
  };

  const isActive = data?.descricao_situacao_cadastral === 'ATIVA';

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Building2 className="h-5 w-5 text-primary" />
          Consulta CNPJ
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Busque informações oficiais de qualquer empresa brasileira
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search Input */}
        <div className="flex gap-2">
          <Input
            placeholder="00.000.000/0000-00"
            value={cnpjInput}
            onChange={(e) => setCnpjInput(e.target.value)}
            className="font-mono"
          />
          <Button onClick={handleSearch} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Consultar
          </Button>
        </div>

        {/* Results */}
        {data && (
          <div className="space-y-4 animate-in fade-in-50">
            <Separator />

            {/* Company Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {data.nome_fantasia || data.razao_social}
                </h3>
                <p className="text-sm text-muted-foreground">{data.razao_social}</p>
                <p className="text-sm font-mono text-muted-foreground mt-1">
                  CNPJ: {formatCnpj(data.cnpj)}
                </p>
              </div>
              <Badge 
                variant={isActive ? 'default' : 'destructive'}
                className={isActive ? 'bg-green-500/10 text-green-500 border-green-500/20' : ''}
              >
                {isActive ? (
                  <CheckCircle className="h-3 w-3 mr-1" />
                ) : (
                  <XCircle className="h-3 w-3 mr-1" />
                )}
                {data.descricao_situacao_cadastral}
              </Badge>
            </div>

            {/* Details Grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">CNAE Principal</p>
                <p className="text-sm text-foreground">{data.cnae_fiscal_descricao || '-'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Capital Social</p>
                <p className="text-sm text-foreground">{formatCurrency(data.capital_social)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Data de Abertura</p>
                <p className="text-sm text-foreground">{formatDate(data.data_inicio_atividade)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Telefone</p>
                <p className="text-sm text-foreground">{data.ddd_telefone_1 || '-'}</p>
              </div>
              <div className="sm:col-span-2 space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Endereço</p>
                <p className="text-sm text-foreground">
                  {data.logradouro}, {data.numero} - {data.municipio}/{data.uf} - CEP {data.cep}
                </p>
              </div>
              {data.email && (
                <div className="sm:col-span-2 space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">E-mail</p>
                  <p className="text-sm text-foreground">{data.email}</p>
                </div>
              )}
            </div>

            {/* Partners */}
            {data.qsa && data.qsa.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">Quadro Societário</p>
                </div>
                <div className="space-y-2">
                  {data.qsa.map((socio, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                      <span className="text-sm text-foreground">{socio.nome_socio}</span>
                      <span className="text-xs text-muted-foreground">{socio.qualificacao_socio}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Button */}
            <Button onClick={handleAddToBase} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar à Base
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
