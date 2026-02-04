

## Plano: Corrigir Envio de Emails com Domínio Verificado

### Problema Identificado

Os emails estão sendo enviados de `noreply@resend.dev` (domínio de teste), mas seu domínio verificado é `studiomamute.com.br`. O Resend bloqueia emails de teste para destinatários externos.

### Solução

Atualizar o remetente em ambas as Edge Functions de email para usar o domínio verificado.

---

### Alteração 1: send-email-verification

**Arquivo:** `supabase/functions/send-email-verification/index.ts`

**Linha 115 - Alterar de:**
```typescript
from: "ProspectAI <noreply@resend.dev>",
```

**Para:**
```typescript
from: "ProspectAI <noreply@studiomamute.com.br>",
```

---

### Alteração 2: send-password-reset

**Arquivo:** `supabase/functions/send-password-reset/index.ts`

**Linha 98 - Alterar de:**
```typescript
from: "ProspectAI <noreply@resend.dev>",
```

**Para:**
```typescript
from: "ProspectAI <noreply@studiomamute.com.br>",
```

---

### Resumo das Alterações

| Arquivo | Linha | Antes | Depois |
|---------|-------|-------|--------|
| `send-email-verification/index.ts` | 115 | `noreply@resend.dev` | `noreply@studiomamute.com.br` |
| `send-password-reset/index.ts` | 98 | `noreply@resend.dev` | `noreply@studiomamute.com.br` |

---

### Resultado Esperado

Após as alterações:
- Emails de verificação de conta chegarão normalmente
- Emails de recuperação de senha chegarão normalmente
- Sem mais erro 403 do Resend

---

### Teste Recomendado

1. Testar cadastro com um email novo
2. Verificar se o email de verificação chega
3. Testar recuperação de senha
4. Confirmar que não vai para spam

