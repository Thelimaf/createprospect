
## Plano: Corrigir Beta Testers Sem Acesso às Buscas

### Problema Identificado

A investigação revelou que alguns Beta Testers têm a flag `is_beta_tester = true` no perfil, **mas não possuem o plano Starter atribuído**:

| Usuário | is_beta_tester | plan_slug | Problema |
|---------|----------------|-----------|----------|
| Israel Freitas | ✅ true | ❌ null | Sem assinatura |
| Michel | ✅ true | ❌ free | Plano Free |
| Ronei Vinagre | ✅ true | ❌ null | Sem assinatura |
| Willian Sena | ✅ true | ✅ starter | OK |

O sistema atual só dá acesso PRO para `plan_slug = 'starter'`, ignorando a flag `is_beta_tester`.

---

### Solução em Duas Frentes

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CORREÇÃO NECESSÁRIA                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. EDGE FUNCTION: check-user-limits/index.ts                               │
│     ├─ Adicionar verificação da flag is_beta_tester no perfil               │
│     ├─ Se is_beta_tester = true → tratar como plano Starter (100 buscas)   │
│     └─ Priorizar verificação ANTES de checar o plano Free                   │
│                                                                             │
│  2. EDGE FUNCTION: increment-search-usage/index.ts                          │
│     └─ Adicionar mesma lógica para beta testers                             │
│                                                                             │
│  3. MIGRAÇÃO SQL (Opcional mas recomendado):                                │
│     └─ Corrigir beta testers existentes atribuindo plano Starter            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Fluxo Corrigido

```text
ANTES (Incorreto):
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ Beta Tester      │────>│ Verifica plano   │────>│ plan = free/null │
│ is_beta = true   │     │ (ignora flag)    │     │ → BLOQUEADO!     │
└──────────────────┘     └──────────────────┘     └──────────────────┘

DEPOIS (Correto):
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ Beta Tester      │────>│ Verifica perfil  │────>│ is_beta = true   │
│ is_beta = true   │     │ is_beta_tester?  │     │ → ACESSO PRO! ✅ │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

---

### Mudanças Técnicas

#### 1. check-user-limits/index.ts

Adicionar após a verificação de master e antes de verificar o plano:

```typescript
// Verificar se é beta tester (após pegar subscription)
const { data: profile } = await supabase
  .from('profiles')
  .select('is_beta_tester')
  .eq('id', user.id)
  .single();

// Beta testers têm acesso PRO mesmo sem plano Starter
if (profile?.is_beta_tester) {
  console.log('Beta tester detected:', user.id);
  
  // Usar lógica do plano Starter (100 buscas/mês)
  const monthlyLimit = 100;
  let monthlyUsed = usage?.searches_used_monthly || 0;
  
  // Reset se necessário
  if (usage?.reset_date && new Date(usage.reset_date) <= new Date()) {
    await supabase
      .from('user_usage')
      .update({
        searches_used_monthly: 0,
        reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq('user_id', user.id);
    monthlyUsed = 0;
  }

  const remaining = Math.max(0, monthlyLimit - monthlyUsed);
  const allowed = monthlyUsed < monthlyLimit;

  return new Response(
    JSON.stringify({ 
      allowed, 
      plan_name: 'beta_tester',
      remaining_searches: remaining,
      current_usage: monthlyUsed,
      limit: monthlyLimit,
      message: allowed ? null : 'Você atingiu o limite de 100 buscas deste mês'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

#### 2. increment-search-usage/index.ts

Adicionar mesma verificação:

```typescript
// Verificar se é beta tester
const { data: profile } = await supabase
  .from('profiles')
  .select('is_beta_tester')
  .eq('id', user.id)
  .single();

if (profile?.is_beta_tester) {
  console.log('Beta tester - using monthly counter:', user.id);
  // Usar contador mensal (igual ao Starter)
  const newMonthlyCount = (usage?.searches_used_monthly || 0) + 1;
  
  await supabase
    .from('user_usage')
    .upsert({
      user_id: user.id,
      searches_used_monthly: newMonthlyCount,
      searches_used_lifetime: (usage?.searches_used_lifetime || 0) + 1,
      last_search_at: now,
    }, { onConflict: 'user_id' });

  return new Response(
    JSON.stringify({ 
      success: true, 
      plan: 'beta_tester',
      searches_used_monthly: newMonthlyCount,
      remaining: Math.max(0, 100 - newMonthlyCount)
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

#### 3. Migração SQL (Recomendado)

Para corrigir beta testers existentes sem plano Starter:

```sql
-- Atribuir plano Starter para beta testers sem assinatura válida
INSERT INTO user_subscriptions (user_id, plan_id, status, upgrade_source)
SELECT 
  p.id,
  (SELECT id FROM subscription_plans WHERE slug = 'starter'),
  'active',
  'beta_tester'
FROM profiles p
LEFT JOIN user_subscriptions us ON us.user_id = p.id
WHERE p.is_beta_tester = true
  AND (us.id IS NULL OR us.plan_id = (SELECT id FROM subscription_plans WHERE slug = 'free'))
ON CONFLICT (user_id) 
DO UPDATE SET 
  plan_id = (SELECT id FROM subscription_plans WHERE slug = 'starter'),
  status = 'active',
  upgrade_source = 'beta_tester';
```

---

### Resultado Esperado

| Beta Tester | Antes | Depois |
|-------------|-------|--------|
| Acesso a buscas | ❌ Bloqueado (pede pagamento) | ✅ 100 buscas/mês |
| Limite mensal | N/A | 100 buscas com reset automático |
| Features PRO | ❌ Bloqueadas | ✅ Todas liberadas |

---

### Arquivos a Modificar

1. `supabase/functions/check-user-limits/index.ts`
2. `supabase/functions/increment-search-usage/index.ts`
3. Migração SQL para corrigir dados existentes
