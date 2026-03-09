

## Plano: Corrigir Exibição de Receita no Dashboard Admin

### Problema Identificado

O valor da receita está sendo exibido como **R$ 0,28** ao invés de **R$ 27,90**.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CAUSA DO BUG                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Banco de dados:    amount_brl = 27.90 (valor em REAIS ✓)                  │
│                            ↓                                                │
│  Edge Function:     totalRevenue = 27.90 (soma correta ✓)                  │
│                            ↓                                                │
│  Frontend:          formatCurrency(27.90) → 27.90 ÷ 100 = 0.279           │
│                            ↓                                                │
│  Exibição:          R$ 0,28 ❌                                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

O problema está na função `formatCurrency` no arquivo `Admin.tsx` (linha 266-271):

```typescript
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value / 100);  // ← BUG: divide por 100
};
```

A função assume que o valor está em **centavos**, mas o banco armazena em **reais**.

---

### Arquivo a Modificar

| Arquivo | Linha | Mudança |
|---------|-------|---------|
| `src/pages/Admin.tsx` | 266-271 | Remover divisão por 100 |

---

### Mudança Técnica

**Antes:**
```typescript
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value / 100);
};
```

**Depois:**
```typescript
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};
```

---

### Resultado Esperado

| Métrica | Antes | Depois |
|---------|-------|--------|
| Receita Total | R$ 0,28 | R$ 27,90 ✅ |
| MRR | Valor ÷ 100 | Valor correto ✅ |
| Ticket Médio | Valor ÷ 100 | Valor correto ✅ |

