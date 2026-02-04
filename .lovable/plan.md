
## Plano: Correção do Sistema de Busca de Leads - Problema de Duplicatas Falsas

### Diagnóstico do Problema

O usuário João está buscando 20 leads mas recebendo apenas 2-5. Após investigação detalhada, identifiquei **um problema crítico** no sistema:

---

### Causa Raiz do Bug

O problema está na **CONSTRAINT UNIQUE global no campo `place_id`**:

```sql
CREATE UNIQUE INDEX google_maps_leads_place_id_key 
ON public.google_maps_leads USING btree (place_id)
```

**Fluxo do bug:**

```text
┌─────────────────────────────────────────────────────────────────┐
│                    FLUXO ATUAL (COM BUG)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. João busca "Dentistas em Londrina" (20 leads)               │
│                         ↓                                        │
│  2. Serper retorna 20 place_ids de dentistas                     │
│                         ↓                                        │
│  3. Edge function verifica: João já tem esses place_ids?         │
│     → NÃO (João tem 0 leads) → Tenta inserir                    │
│                         ↓                                        │
│  4. INSERT falha com erro 23505 (unique violation)               │
│     → Admin (anderson) já tem 18 desses place_ids!              │
│                         ↓                                        │
│  5. Código trata erro 23505 como "duplicata do usuário"          │
│     → existingCount++ (ERRADO!)                                  │
│                         ↓                                        │
│  6. Resultado: 2 novos, 18 "duplicatas" (falsas)                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Evidência no banco de dados:**
- João tem **apenas 7 leads** no total
- Busca de dentistas reportou **18 duplicatas** quando João não tinha nenhum lead antes
- Admin (anderson) já possui **23 dentistas de Londrina** com os mesmos place_ids

---

### Solução

A constraint precisa ser **COMPOSTA** (user_id + place_id) em vez de apenas place_id:

**Atual (problema):**
```sql
UNIQUE (place_id)  -- Global: um place_id só pode existir 1x na tabela inteira
```

**Corrigido:**
```sql
UNIQUE (user_id, place_id)  -- Por usuário: cada usuário pode ter seu próprio registro
```

---

### Alterações Necessárias

#### 1. Migração do Banco de Dados

```sql
-- Remover constraint única global
ALTER TABLE google_maps_leads 
DROP CONSTRAINT google_maps_leads_place_id_key;

-- Criar nova constraint composta (user_id + place_id)
ALTER TABLE google_maps_leads 
ADD CONSTRAINT google_maps_leads_user_place_unique 
UNIQUE (user_id, place_id);
```

#### 2. Atualização da Edge Function `scrape-google-maps`

Corrigir o tratamento de erro 23505 para re-tentar a inserção ou buscar o lead correto:

| Linha | Antes | Depois |
|-------|-------|--------|
| 251-253 | Trata 23505 como duplicata | Ignora silenciosamente conflitos com outros usuários OU tenta upsert |

A melhor solução é usar `upsert` com `onConflict: 'user_id,place_id'` para que:
- Se o usuário já tem o lead → Atualiza (merge inteligente)
- Se é novo para o usuário → Insere

#### 3. Atualização da Edge Function `firecrawl-business-search`

Mesmo tratamento precisa ser aplicado para evitar problemas semelhantes no futuro.

---

### Resumo das Alterações

| Tipo | Componente | Ação |
|------|------------|------|
| 🗄️ DB | Constraint `google_maps_leads_place_id_key` | Remover (global) |
| 🗄️ DB | Constraint `google_maps_leads_user_place_unique` | Criar (composta) |
| ✏️ Editar | `supabase/functions/scrape-google-maps/index.ts` | Usar upsert ao invés de insert |
| ✏️ Editar | `supabase/functions/firecrawl-business-search/index.ts` | Adicionar tratamento adequado de conflitos |

---

### Seção Técnica

**Por que usar `upsert` com constraint composta:**

1. **Integridade**: Garante que cada usuário tenha no máximo 1 registro por place_id
2. **Merge inteligente**: Permite atualizar dados quando o mesmo local é encontrado novamente
3. **Sem falsos positivos**: Outros usuários não bloqueiam inserções
4. **Performance**: O PostgreSQL otimiza upserts com índices únicos

**Código da edge function corrigida:**
```typescript
const { error: upsertError } = await supabaseClient
  .from("google_maps_leads")
  .upsert(lead, { 
    onConflict: 'user_id,place_id',
    ignoreDuplicates: false // Atualiza se existir
  });

if (!upsertError) {
  newCount++;
} else {
  console.error(`Error upserting lead:`, upsertError);
}
```

**Verificação adicional necessária:**
- Limpar dados duplicados existentes se houver antes de criar a nova constraint
- Testar com João após a correção

**Impacto esperado após correção:**
- João busca 20 leads → Recebe 20 leads (ou próximo, excluindo verdadeiras duplicatas dele)
- Cada usuário tem sua própria base isolada
- Sem colisões entre usuários diferentes
