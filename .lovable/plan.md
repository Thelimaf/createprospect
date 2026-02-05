

## Plano: Corrigir Edge Functions de Pagamento PIX

### Problema Identificado

Os logs mostram que as Edge Functions de pagamento estão retornando **404**:

```text
OPTIONS | 404 | https://hixkhrhvvensttvzdojg.supabase.co/functions/v1/create-pix-payment
```

A causa raiz é que o deploy falha com **"Bundle generation timed out"** porque as funções usam importações `esm.sh` antigas que são lentas para resolver.

---

### Causa Raiz

```typescript
// PROBLEMA - Importações lentas que causam timeout
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
```

---

### Solução

Refatorar ambas as Edge Functions de pagamento PIX para usar:
1. `Deno.serve()` ao invés de `serve()` importado
2. `npm:@supabase/supabase-js@2` ao invés de `esm.sh`

---

### Arquivos a Modificar

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EDGE FUNCTIONS DE PIX                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. supabase/functions/create-pix-payment/index.ts                          │
│     ├─ Remover: import { serve } from "https://deno.land/std..."            │
│     ├─ Mudar: esm.sh → npm:@supabase/supabase-js@2                          │
│     └─ Usar: Deno.serve() ao invés de serve()                               │
│                                                                             │
│  2. supabase/functions/check-pix-payment/index.ts                           │
│     ├─ Remover: import { serve } from "https://deno.land/std..."            │
│     ├─ Mudar: esm.sh → npm:@supabase/supabase-js@2                          │
│     └─ Usar: Deno.serve() ao invés de serve()                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Mudanças Técnicas

#### Antes (Causa Timeout)

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  // ...código
});
```

#### Depois (Deploy Rápido)

```typescript
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  // ...código (mantém toda a lógica existente)
});
```

---

### Impacto

| Métrica | Antes | Depois |
|---------|-------|--------|
| Deploy | ❌ Timeout | ✅ Sucesso |
| Status HTTP | 404 | 200 |
| Vendas | Perdidas | Recuperadas |

---

### Próximos Passos após Aprovação

1. Atualizar `create-pix-payment/index.ts` com novas importações
2. Atualizar `check-pix-payment/index.ts` com novas importações
3. Fazer deploy das funções
4. Testar geração de PIX no checkout

