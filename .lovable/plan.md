

## Plano: Beta Testers com Buscas Ilimitadas por 1 Mês

### Mudança Proposta

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Limite de buscas | 100/mês | ∞ Ilimitado |
| Período | Reset mensal | 1 mês de acesso ilimitado |
| Após 1 mês | Reset contador | Verificar se continua beta |

---

### Arquivos a Modificar

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EDGE FUNCTIONS                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. supabase/functions/check-user-limits/index.ts                           │
│     ├─ Remover verificação de limite de 100 buscas para beta testers       │
│     ├─ Retornar allowed: true sempre para beta testers                     │
│     └─ Mostrar remaining_searches: 999999 (ilimitado)                      │
│                                                                             │
│  2. supabase/functions/increment-search-usage/index.ts                      │
│     └─ Manter contagem para estatísticas, mas não bloquear                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Mudanças Técnicas

#### 1. check-user-limits/index.ts

Simplificar a lógica do beta tester para sempre permitir:

```typescript
// Beta testers get UNLIMITED access for the first month
if (profile?.is_beta_tester) {
  console.log('Beta tester detected - unlimited access:', user.id);
  
  return new Response(
    JSON.stringify({ 
      allowed: true,  // Sempre permitido
      plan_name: 'beta_tester',
      remaining_searches: 999999,  // Ilimitado
      current_usage: usage?.searches_used_monthly || 0,
      limit: 999999,  // Sem limite
      message: null
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

#### 2. increment-search-usage/index.ts

Manter a contagem para estatísticas, mas sem bloquear:

```typescript
// Beta testers - track usage for stats but no limits
if (profile?.is_beta_tester) {
  console.log('Beta tester - unlimited access, tracking for stats:', user.id);
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
      remaining: 999999  // Ilimitado
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

---

### Fluxo do Beta Tester

```text
┌────────────────┐     ┌────────────────────────────────────────┐
│   Beta Tester  │────>│        ACESSO ILIMITADO                │
│ is_beta = true │     │   Sem limite de buscas por 1 mês       │
└────────────────┘     │   Contagem apenas para estatísticas    │
                       └────────────────────────────────────────┘
```

---

### Resultado Esperado

| Beta Tester | Antes | Depois |
|-------------|-------|--------|
| Limite de buscas | 100/mês | ∞ Ilimitado |
| Acesso bloqueado | Após 100 buscas | Nunca (enquanto for beta) |
| Contagem | Sim | Sim (apenas estatísticas) |

