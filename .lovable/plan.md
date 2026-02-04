

## Plano: Corrigir Deduplicação e Limpar Dados de Teste

### Problema Identificado

A verificação de duplicados na Edge Function `scrape-google-maps` está incorreta:

**Código Atual (linha 176-180):**
```typescript
const { data: existingLead } = await supabaseClient
  .from("google_maps_leads")
  .select("*")
  .eq("place_id", place.placeId)  // ❌ Verifica globalmente
  .single();
```

Isso significa que se **qualquer usuário** já salvou um lead com determinado `place_id`, ele é considerado duplicado para **todos os usuários**.

**Solução - Adicionar filtro por user_id:**
```typescript
const { data: existingLead } = await supabaseClient
  .from("google_maps_leads")
  .select("*")
  .eq("user_id", user.id)         // ✅ Filtrar por usuário
  .eq("place_id", place.placeId)
  .maybeSingle();
```

---

### Alterações Necessárias

#### 1. Corrigir Deduplicação na Edge Function

**Arquivo:** `supabase/functions/scrape-google-maps/index.ts`

**Linhas 176-180** - Adicionar filtro `user_id`:

```typescript
// ANTES
const { data: existingLead } = await supabaseClient
  .from("google_maps_leads")
  .select("*")
  .eq("place_id", place.placeId)
  .single();

// DEPOIS
const { data: existingLead } = await supabaseClient
  .from("google_maps_leads")
  .select("*")
  .eq("user_id", user.id)
  .eq("place_id", place.placeId)
  .maybeSingle();
```

---

#### 2. Limpar Dados do João (via Backend)

Para limpar os dados do João, você precisa executar estas queries no painel do Lovable Cloud:

```sql
-- 1. Deletar leads do João
DELETE FROM google_maps_leads 
WHERE user_id = 'd0c7136d-0627-403c-85af-65097bfce84d';

-- 2. Deletar buscas do João
DELETE FROM google_maps_searches 
WHERE user_id = 'd0c7136d-0627-403c-85af-65097bfce84d';

-- 3. Deletar campanhas do João
DELETE FROM campaigns 
WHERE user_id = 'd0c7136d-0627-403c-85af-65097bfce84d';

-- 4. Resetar uso do João
UPDATE user_usage 
SET searches_used_lifetime = 0, searches_used_monthly = 0 
WHERE user_id = 'd0c7136d-0627-403c-85af-65097bfce84d';
```

---

### Resumo

| Arquivo | Alteração |
|---------|-----------|
| `scrape-google-maps/index.ts` | Linha 177: adicionar `.eq("user_id", user.id)` |
| `scrape-google-maps/index.ts` | Linha 180: trocar `.single()` por `.maybeSingle()` |
| Backend (manual) | Executar DELETE para limpar dados de teste |

---

### Resultado Esperado

Após a correção:
- Cada usuário terá sua própria base de leads isolada
- Se João buscar 20 leads, ele receberá 20 (a menos que ele mesmo já tenha esses leads)
- Outros usuários não afetam a contagem de duplicados do João

