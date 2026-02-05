
## Plano: Corrigir Normalização de Telefones para Buscas Internacionais

### Problema Atual

```text
Entrada da API (EUA):     (916) 441-6870
                               ↓
Edge Function:            9164416870 (remove símbolos)
                               ↓
Adiciona "55":            559164416870 ❌
                               ↓
WhatsApp normaliza:       55559164416870 ❌ INVÁLIDO!
```

---

### Arquivos a Modificar

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ARQUIVOS A MODIFICAR                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. supabase/functions/scrape-google-maps/index.ts                          │
│     ├─ Corrigir imports (esm.sh → npm:) para evitar timeout                │
│     ├─ Usar Deno.serve() ao invés de serve()                               │
│     ├─ Receber parâmetro 'country' (default: "br")                         │
│     ├─ Criar mapa de códigos de país (br→55, us→1, mx→52, etc.)            │
│     └─ Aplicar código correto baseado no país da busca                     │
│                                                                             │
│  2. src/lib/external-links.ts                                               │
│     ├─ Nova função normalizePhone() inteligente                            │
│     ├─ Detectar se já tem código de país válido                            │
│     └─ Atualizar buildWhatsAppUrl() para usar nova lógica                  │
│                                                                             │
│  3. src/components/prospeccao/SearchFilters.tsx                             │
│     └─ Adicionar seletor de país de busca                                  │
│                                                                             │
│  4. src/components/prospeccao/ProspectarTab.tsx                             │
│     └─ Passar parâmetro 'country' para a Edge Function                     │
│                                                                             │
│  5. src/components/leads/LeadSearchDialog.tsx                               │
│     └─ Adicionar seletor de país na busca de campanhas                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Mudanças Técnicas

#### 1. scrape-google-maps/index.ts

**Antes:**
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  // ...
  const { query, limit = 20, page = 1, campaignId, mode = "normal" } = await req.json();
  
  // Linha 161-168: Adiciona 55 cegamente
  if (cleanPhone && cleanPhone.length === 10) {
    cleanPhone = "55" + cleanPhone;
  } else if (cleanPhone && cleanPhone.length === 11) {
    cleanPhone = "55" + cleanPhone;
  }
});
```

**Depois:**
```typescript
import { createClient } from "npm:@supabase/supabase-js@2";

// Mapa de códigos de país para DDI
const COUNTRY_CODES: Record<string, string> = {
  br: "55", us: "1", ca: "1", mx: "52", ar: "54", 
  pt: "351", es: "34", uk: "44", de: "49", fr: "33", it: "39",
};

Deno.serve(async (req) => {
  // Receber país da busca
  const { query, limit = 20, page = 1, campaignId, mode = "normal", country = "br" } = await req.json();
  
  const countryCode = COUNTRY_CODES[country] || "55";
  
  // Chamada Serper com país dinâmico
  body: JSON.stringify({
    q: query,
    num: Math.min(limit, 20),
    hl: country === "br" ? "pt" : "en",
    gl: country,  // ← Dinâmico agora
  }),
  
  // Normalização inteligente de telefone
  let cleanPhone = place.phoneNumber?.replace(/[^\d+]/g, "") || null;
  if (cleanPhone) {
    // Se já começa com +, remover o + (já tem código)
    if (cleanPhone.startsWith('+')) {
      cleanPhone = cleanPhone.slice(1);
    } 
    // Se não começa com código de país conhecido, adicionar
    else if (!startsWithKnownCountryCode(cleanPhone)) {
      cleanPhone = cleanPhone.replace(/^0+/, ''); // Remover zeros iniciais
      cleanPhone = countryCode + cleanPhone;
    }
  }
});
```

#### 2. src/lib/external-links.ts

**Nova função:**
```typescript
// Lista de códigos de país conhecidos com tamanho esperado
const KNOWN_COUNTRY_CODES: Record<string, { code: string; minLen: number; maxLen: number }> = {
  '55': { code: '55', minLen: 12, maxLen: 13 },  // BR: 55 + DDD(2) + 8-9 dígitos
  '1':  { code: '1',  minLen: 11, maxLen: 11 },  // US/CA: 1 + 10 dígitos
  '54': { code: '54', minLen: 12, maxLen: 13 },  // AR
  '52': { code: '52', minLen: 12, maxLen: 13 },  // MX
  '351':{ code: '351',minLen: 12, maxLen: 12 },  // PT
  '34': { code: '34', minLen: 11, maxLen: 11 },  // ES
  '44': { code: '44', minLen: 12, maxLen: 12 },  // UK
  '49': { code: '49', minLen: 12, maxLen: 14 },  // DE
  '33': { code: '33', minLen: 11, maxLen: 11 },  // FR
  '39': { code: '39', minLen: 12, maxLen: 12 },  // IT
};

/**
 * Normalize phone to international format
 * Detects if already has a valid country code
 */
export function normalizePhone(phone: string, defaultCountryCode: string = '55'): string {
  if (!phone) return phone;
  
  let digits = phone.replace(/\D/g, '');
  
  // Verificar se já começa com um código de país conhecido E tem tamanho válido
  for (const [code, info] of Object.entries(KNOWN_COUNTRY_CODES)) {
    if (digits.startsWith(code) && digits.length >= info.minLen && digits.length <= info.maxLen) {
      return digits; // Já está correto, não modificar
    }
  }
  
  // Remover zeros iniciais (comum em alguns países)
  digits = digits.replace(/^0+/, '');
  
  // Adicionar código do país padrão
  return defaultCountryCode + digits;
}

// Manter compatibilidade
export function normalizePhoneBR(phone: string): string {
  return normalizePhone(phone, '55');
}

// Atualizar buildWhatsAppUrl
export function buildWhatsAppUrl(phone: string, text?: string): string {
  const normalizedPhone = normalizePhone(phone);
  
  if (text) {
    return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(text)}`;
  }
  return `https://wa.me/${normalizedPhone}`;
}
```

#### 3. SearchFilters.tsx

**Adicionar seletor de país:**
```typescript
// Novo array de países
const COUNTRIES = [
  { value: 'br', label: '🇧🇷 Brasil' },
  { value: 'us', label: '🇺🇸 Estados Unidos' },
  { value: 'mx', label: '🇲🇽 México' },
  { value: 'ar', label: '🇦🇷 Argentina' },
  { value: 'pt', label: '🇵🇹 Portugal' },
  { value: 'es', label: '🇪🇸 Espanha' },
  { value: 'uk', label: '🇬🇧 Reino Unido' },
  { value: 'de', label: '🇩🇪 Alemanha' },
  { value: 'fr', label: '🇫🇷 França' },
  { value: 'it', label: '🇮🇹 Itália' },
  { value: 'ca', label: '🇨🇦 Canadá' },
];

// Atualizar interface
export interface SearchFiltersData {
  term: string;
  segment: string;
  state: string;
  city: string;
  quantity: number;
  country: string;  // ← NOVO
}

// Adicionar Select de país no componente
```

#### 4. ProspectarTab.tsx

**Passar país para Edge Function:**
```typescript
const [filters, setFilters] = useState<SearchFiltersData>({
  term: '',
  segment: 'all',
  state: 'all',
  city: '',
  quantity: 20,
  country: 'br',  // ← NOVO
});

// Na chamada da função:
const { data, error } = await supabase.functions.invoke('scrape-google-maps', {
  body: { 
    query, 
    limit: filters.quantity,
    user_id: user?.id,
    campaignId,
    country: filters.country,  // ← NOVO
  },
});
```

#### 5. LeadSearchDialog.tsx

**Adicionar país (padrão: Brasil):**
```typescript
const [country, setCountry] = useState('br');

// Na chamada:
body: { 
  query, 
  limit: limit[0], 
  page: 1, 
  campaignId,
  mode: 'normal',
  country,  // ← NOVO
},
```

---

### Fluxo Corrigido

```text
ANTES:
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ API: (916) 441-  │────>│ Adiciona "55"    │────>│ 559164416870 ❌  │
│ 6870 (EUA)       │     │ sempre           │     │ Inválido!        │
└──────────────────┘     └──────────────────┘     └──────────────────┘

DEPOIS:
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ API: (916) 441-  │────>│ Detecta país=us  │────>│ 19164416870 ✅   │
│ 6870 (EUA)       │     │ Adiciona "1"     │     │ Válido!          │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

---

### Resultado Esperado

| País da Busca | Telefone Original | Antes | Depois |
|---------------|-------------------|-------|--------|
| EUA 🇺🇸 | (916) 441-6870 | 559164416870 ❌ | 19164416870 ✅ |
| Brasil 🇧🇷 | (11) 99999-9999 | 5511999999999 ✅ | 5511999999999 ✅ |
| México 🇲🇽 | (55) 1234-5678 | 555512345678 ❌ | 525512345678 ✅ |
| Portugal 🇵🇹 | 912 345 678 | 55912345678 ❌ | 351912345678 ✅ |
