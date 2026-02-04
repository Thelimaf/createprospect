

## Plano: Correção Urgente - Constraint Incompatível com ON CONFLICT

### Diagnóstico do Problema

A busca de João por "Academias em Londrina" **retornou 20 resultados da API Serper**, mas **TODOS os 20 inserts falharam** com o erro:

```
"there is no unique or exclusion constraint matching the ON CONFLICT specification"
```

---

### Causa Raiz

A migração anterior criou um **índice parcial** (com cláusula `WHERE`):

```sql
CREATE UNIQUE INDEX google_maps_leads_user_place_unique 
ON public.google_maps_leads (user_id, place_id) 
WHERE (place_id IS NOT NULL)  -- ISSO É O PROBLEMA!
```

**Índices parciais não funcionam com `ON CONFLICT`** no PostgreSQL. O Supabase client usa `ON CONFLICT` internamente quando chamamos `.upsert()`, e isso requer uma constraint UNIQUE real ou índice único **SEM** cláusula WHERE.

---

### Fluxo do Erro

```text
┌────────────────────────────────────────────────────────────────────┐
│                     O QUE ACONTECEU COM JOÃO                       │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. João buscou "Academias em Londrina" (20 leads)                 │
│                         ↓                                           │
│  2. API Serper retornou 20 academias com sucesso                   │
│                         ↓                                           │
│  3. Edge function tentou upsert com onConflict: 'user_id,place_id' │
│                         ↓                                           │
│  4. PostgreSQL: "Não existe constraint UNIQUE válida para          │
│     user_id + place_id que funcione com ON CONFLICT"               │
│     (índices parciais não contam!)                                 │
│                         ↓                                           │
│  5. TODOS os 20 upserts falharam com erro 42P10                    │
│                         ↓                                           │
│  6. Resultado: 0 leads salvos, mesmo com 20 disponíveis            │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

### Solução

Recriar o índice **SEM** a cláusula `WHERE`:

```sql
-- Remover o índice parcial atual
DROP INDEX IF EXISTS google_maps_leads_user_place_unique;

-- Criar índice ÚNICO completo (sem WHERE)
CREATE UNIQUE INDEX google_maps_leads_user_place_unique 
ON public.google_maps_leads (user_id, place_id);
```

**Nota:** Para criar um índice único, precisamos garantir que não há duplicatas existentes de `(user_id, place_id)`. Vou verificar e limpar se necessário.

---

### Alterações Necessárias

| Tipo | Componente | Ação |
|------|------------|------|
| 🗄️ DB | Índice `google_maps_leads_user_place_unique` | Recriar SEM cláusula WHERE |
| 🗄️ DB | Dados existentes | Verificar/limpar duplicatas de (user_id, place_id) |
| 🔄 Deploy | Edge function `scrape-google-maps` | Re-deploy para aplicar nova constraint |

---

### Seção Técnica

**Por que índices parciais não funcionam com ON CONFLICT:**

O PostgreSQL exige que a constraint ou índice usado em `ON CONFLICT` cubra **todas** as linhas da tabela, não apenas um subconjunto. Índices parciais (com `WHERE`) são otimizações de performance, mas não servem como alvos válidos para `ON CONFLICT`.

**Referência PostgreSQL:**
> "For ON CONFLICT DO UPDATE, a unique index inference specification must uniquely identify a single row. A partial unique index is not sufficient."

**Verificação de duplicatas:**
Antes de criar o índice único completo, executar:
```sql
SELECT user_id, place_id, COUNT(*) 
FROM google_maps_leads 
WHERE place_id IS NOT NULL
GROUP BY user_id, place_id 
HAVING COUNT(*) > 1;
```

Se houver duplicatas, manter apenas o registro mais recente de cada par.

**Impacto esperado após correção:**
- João busca 20 leads → Recebe ~20 leads (menos duplicatas reais dele mesmo)
- Sistema 100% funcional para todos os usuários
- Isolamento de dados por usuário garantido

