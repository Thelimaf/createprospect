

## Diagnóstico Completo: Dashboard e Buscas do Usuário Master

### Problemas Identificados

Foram identificados **3 problemas críticos** que impedem o funcionamento do sistema:

---

### Problema 1: Edge Functions NÃO estão deployadas (404)

As Edge Functions críticas retornam erro **404 - NOT_FOUND** porque o deploy falha por timeout:

| Edge Function | Status | Impacto |
|---------------|--------|---------|
| `admin-users` | ❌ 404 | Dashboard admin não carrega |
| `check-user-limits` | ❌ 404 | Verificação de limites falha |
| `simulate-pix-payment` | ❌ 404 | Simulador de pagamentos falha |

**Causa:** Uso de imports antigos (`esm.sh` e `deno.land/std`) que causam timeout no bundler.

---

### Problema 2: Assinatura do Usuário Master aponta para plano ERRADO

Os dados do banco mostram inconsistência:

```text
user_subscriptions.plan_id = 862e4b4a-7018-46a8-9ec9-9659a7703dce
                               ↓
subscription_plans.slug = "free" ❌ (deveria ser "starter")
```

Planos disponíveis:
- `862e4b4a-7018-46a8-9ec9-9659a7703dce` → **Free** (ATUAL - ERRADO)
- `9e83220d-b0c2-454f-a1b5-d328698d09bc` → **Starter** (CORRETO)

Mesmo o usuário master tendo bypass por email, a UI mostra o plano errado.

---

### Problema 3: 8 Edge Functions com imports antigos

Edge Functions que causarão timeout no deploy:

| Arquivo | Problema |
|---------|----------|
| `admin-users/index.ts` | `esm.sh` + `deno.land/std` |
| `simulate-pix-payment/index.ts` | `esm.sh` + `deno.land/std` |
| `verify-email/index.ts` | `esm.sh` + `deno.land/std` |
| `exa-webhook/index.ts` | `esm.sh` + `deno.land/std` |
| `reset-password/index.ts` | `esm.sh` + `deno.land/std` |
| `generate-outreach/index.ts` | `esm.sh` + `deno.land/std` |
| `send-password-reset/index.ts` | `esm.sh` + `deno.land/std` |
| `create-search/index.ts` | `esm.sh` + `deno.land/std` |
| `send-email-verification/index.ts` | `esm.sh` + `Resend` |

---

### Solução Proposta

#### Etapa 1: Corrigir imports em TODAS as Edge Functions

Mudar de:
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => { ... });
```

Para:
```typescript
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => { ... });
```

#### Etapa 2: Corrigir assinatura do usuário master no banco

Executar migração SQL para corrigir o `plan_id`:

```sql
UPDATE user_subscriptions 
SET plan_id = '9e83220d-b0c2-454f-a1b5-d328698d09bc'
WHERE user_id = '70422b9f-33a8-4c21-b124-9f0ede3b2059';
```

#### Etapa 3: Deploy das Edge Functions corrigidas

Fazer deploy de todas as funções corrigidas:
- `admin-users`
- `check-user-limits` (já corrigida)
- `simulate-pix-payment`
- `verify-email`
- `exa-webhook`
- `reset-password`
- `generate-outreach`
- `send-password-reset`
- `create-search`
- `send-email-verification`

---

### Arquivos a Modificar

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    EDGE FUNCTIONS A CORRIGIR                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. supabase/functions/admin-users/index.ts                                 │
│     ├─ Remover: import { serve } from "https://deno.land/std..."           │
│     ├─ Mudar: esm.sh → npm:@supabase/supabase-js@2                         │
│     └─ Usar: Deno.serve() ao invés de serve()                              │
│                                                                             │
│  2. supabase/functions/simulate-pix-payment/index.ts                        │
│     ├─ Mesmas correções                                                    │
│                                                                             │
│  3. supabase/functions/verify-email/index.ts                                │
│     ├─ Mesmas correções                                                    │
│                                                                             │
│  4. supabase/functions/exa-webhook/index.ts                                 │
│     ├─ Mesmas correções                                                    │
│                                                                             │
│  5. supabase/functions/reset-password/index.ts                              │
│     ├─ Mesmas correções                                                    │
│                                                                             │
│  6. supabase/functions/generate-outreach/index.ts                           │
│     ├─ Mesmas correções                                                    │
│                                                                             │
│  7. supabase/functions/send-password-reset/index.ts                         │
│     ├─ Mesmas correções                                                    │
│                                                                             │
│  8. supabase/functions/create-search/index.ts                               │
│     ├─ Mesmas correções                                                    │
│                                                                             │
│  9. supabase/functions/send-email-verification/index.ts                     │
│     ├─ Mesmas correções                                                    │
│     └─ Mudar: esm.sh/resend → npm:resend                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Resultado Esperado

| Funcionalidade | Antes | Depois |
|----------------|-------|--------|
| Dashboard Admin | ❌ Não carrega (404) | ✅ Carrega normalmente |
| Buscas Master | ❌ Erro de limites | ✅ Funciona sem limites |
| Simulador PIX | ❌ 404 | ✅ Funciona |
| Verificação de Email | ❌ 404 | ✅ Funciona |
| Plano do Master | Free (errado) | Starter (correto) |

