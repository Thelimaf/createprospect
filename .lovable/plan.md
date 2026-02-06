

## Plano: Corrigir Normalização de Telefones nas Buscas de Campanha

### Problema Identificado

Quando o usuário busca leads **dentro das campanhas** (não na página de Prospecção B2B), o parâmetro `country` não está sendo enviado para a Edge Function. Isso faz com que telefones de buscas internacionais recebam o DDI `55` (Brasil) incorretamente.

### Locais com Problema

| Arquivo | Problema |
|---------|----------|
| `CampaignLeadsPage.tsx` | Busca inline (linha 319-327) não passa `country` |
| `GoogleMapsScraper.tsx` | `executeSearch` e `handleLoadMore` não passam `country` |
| `LeadSearchDialog.tsx` | ✅ Já corrigido - passa `country` corretamente |

### Arquivos a Modificar

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ARQUIVOS A MODIFICAR                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. src/pages/CampaignLeadsPage.tsx                                         │
│     ├─ Adicionar estado 'country' (default: "br")                          │
│     ├─ Adicionar seletor de país na UI de busca inline                     │
│     └─ Passar 'country' para scrape-google-maps                            │
│                                                                             │
│  2. src/components/google-maps/GoogleMapsScraper.tsx                        │
│     ├─ Adicionar estado 'country' (default: "br")                          │
│     ├─ Adicionar seletor de país na UI                                     │
│     └─ Passar 'country' em executeSearch e handleLoadMore                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Mudanças Técnicas

#### 1. CampaignLeadsPage.tsx

**Adicionar estado e seletor de país:**
```typescript
// Novo import
import { Globe } from 'lucide-react';

// Array de países (mesmo do LeadSearchDialog)
const COUNTRIES = [
  { value: 'br', label: '🇧🇷 Brasil' },
  { value: 'us', label: '🇺🇸 Estados Unidos' },
  { value: 'ca', label: '🇨🇦 Canadá' },
  { value: 'mx', label: '🇲🇽 México' },
  { value: 'ar', label: '🇦🇷 Argentina' },
  { value: 'pt', label: '🇵🇹 Portugal' },
  { value: 'es', label: '🇪🇸 Espanha' },
  { value: 'uk', label: '🇬🇧 Reino Unido' },
  { value: 'de', label: '🇩🇪 Alemanha' },
  { value: 'fr', label: '🇫🇷 França' },
  { value: 'it', label: '🇮🇹 Itália' },
];

// Novo estado
const [searchCountry, setSearchCountry] = useState('br');

// Atualizar chamada (linhas 319-327)
const { data, error } = await supabase.functions.invoke('scrape-google-maps', {
  body: {
    query: searchQuery,
    limit: limit[0],
    page: 1,
    campaignId: id,
    mode: 'normal',
    country: searchCountry,  // ← NOVO
  },
});
```

**Adicionar seletor na UI:**
```typescript
// Na área de busca (provavelmente perto do Input de busca)
<Select value={searchCountry} onValueChange={setSearchCountry}>
  <SelectTrigger className="w-[180px]">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    {COUNTRIES.map((c) => (
      <SelectItem key={c.value} value={c.value}>
        {c.label}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

#### 2. GoogleMapsScraper.tsx

**Adicionar estado e passar nas chamadas:**
```typescript
// Novo import
import { Globe } from 'lucide-react';

// Array de países
const COUNTRIES = [
  { value: 'br', label: '🇧🇷 Brasil' },
  { value: 'us', label: '🇺🇸 Estados Unidos' },
  // ... mesmo array
];

// Novo estado (após linha 71)
const [country, setCountry] = useState('br');

// Atualizar executeSearch (linha 120-121)
const { data, error } = await supabase.functions.invoke("scrape-google-maps", {
  body: { 
    query: searchQuery, 
    limit, 
    page: 1, 
    campaignId, 
    mode,
    country,  // ← NOVO
  },
});

// Atualizar handleLoadMore (linha 220-221)
const { data, error } = await supabase.functions.invoke("scrape-google-maps", {
  body: { 
    query: lastQuery, 
    limit: 20, 
    page: nextPage, 
    campaignId, 
    mode,
    country,  // ← NOVO (usar mesmo país da busca original)
  },
});
```

**Adicionar seletor na UI (após o Input de query):**
```typescript
<div className="space-y-2">
  <Label htmlFor="country" className="text-foreground">País</Label>
  <Select value={country} onValueChange={setCountry}>
    <SelectTrigger id="country" className="bg-input border-border">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {COUNTRIES.map((c) => (
        <SelectItem key={c.value} value={c.value}>
          {c.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

---

### Fluxo Corrigido

```text
ANTES (CampaignLeadsPage.tsx):
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ Busca: "lawyers  │────>│ Sem 'country'    │────>│ DDI 55 adicionado│
│ in Miami"        │     │ default: br      │     │ 555551234567 ❌  │
└──────────────────┘     └──────────────────┘     └──────────────────┘

DEPOIS:
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ Busca: "lawyers  │────>│ country: 'us'    │────>│ DDI 1 adicionado │
│ in Miami" 🇺🇸     │     │ passado          │     │ 15551234567 ✅   │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

---

### Resultado Esperado

Após a correção, **todas as formas de buscar leads** terão suporte a país:

| Local de Busca | Antes | Depois |
|----------------|-------|--------|
| Prospecção B2B (`ProspectarTab`) | ✅ Com país | ✅ Com país |
| Dialog de busca (`LeadSearchDialog`) | ✅ Com país | ✅ Com país |
| Busca inline na campanha (`CampaignLeadsPage`) | ❌ Sem país | ✅ Com país |
| Card de busca (`GoogleMapsScraper`) | ❌ Sem país | ✅ Com país |

