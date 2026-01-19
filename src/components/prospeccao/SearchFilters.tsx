import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useUserPlan } from '@/hooks/useUserPlan';

const SEGMENTS = [
  { value: 'all', label: 'Todos os Segmentos' },
  { value: 'saude', label: 'Saúde' },
  { value: 'alimentacao', label: 'Alimentação' },
  { value: 'servicos', label: 'Serviços' },
  { value: 'comercio', label: 'Comércio' },
  { value: 'tecnologia', label: 'Tecnologia' },
  { value: 'construcao', label: 'Construção' },
  { value: 'educacao', label: 'Educação' },
  { value: 'beleza', label: 'Beleza e Estética' },
  { value: 'juridico', label: 'Jurídico' },
  { value: 'contabilidade', label: 'Contabilidade' },
];

const STATES = [
  { value: 'all', label: 'Todos os Estados' },
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' },
];

export interface SearchFiltersData {
  term: string;
  segment: string;
  state: string;
  city: string;
  quantity: number;
}

interface SearchFiltersProps {
  filters: SearchFiltersData;
  onChange: (filters: SearchFiltersData) => void;
}

export function SearchFilters({ filters, onChange }: SearchFiltersProps) {
  const { plan, isFree, isLoading } = useUserPlan();
  const maxQuantity = isFree ? 20 : 100;

  const handleChange = (key: keyof SearchFiltersData, value: string | number) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-2">
        <Label htmlFor="term">Tipo de Negócio</Label>
        <Input
          id="term"
          placeholder="Ex: dentista, advogado, pizzaria..."
          value={filters.term}
          onChange={(e) => handleChange('term', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="segment">Segmento</Label>
        <Select value={filters.segment} onValueChange={(v) => handleChange('segment', v)}>
          <SelectTrigger id="segment">
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            {SEGMENTS.map((seg) => (
              <SelectItem key={seg.value} value={seg.value}>
                {seg.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="state">Estado</Label>
        <Select value={filters.state} onValueChange={(v) => handleChange('state', v)}>
          <SelectTrigger id="state">
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent className="bg-popover max-h-[300px]">
            {STATES.map((st) => (
              <SelectItem key={st.value} value={st.value}>
                {st.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="city">Cidade</Label>
        <Input
          id="city"
          placeholder="Ex: São Paulo, Curitiba..."
          value={filters.city}
          onChange={(e) => handleChange('city', e.target.value)}
        />
      </div>

      <div className="sm:col-span-2 lg:col-span-4 space-y-3">
        <div className="flex items-center justify-between">
          <Label>Quantidade de Empresas</Label>
          <span className="text-sm font-medium text-primary">{filters.quantity} empresas</span>
        </div>
        <Slider
          value={[filters.quantity]}
          onValueChange={([v]) => handleChange('quantity', v)}
          min={5}
          max={maxQuantity}
          step={5}
          className="w-full"
          disabled={isLoading}
        />
        <p className="text-xs text-muted-foreground">
          {isFree 
            ? 'Plano Free: máximo de 20 leads por busca' 
            : `Plano ${plan?.name || 'Starter'}: máximo de 100 leads por busca`
          }
        </p>
      </div>
    </div>
  );
}
