
## Plano: Mudar Plano Starter para Vitalício (R$ 27,90)

### Resumo da Mudança

Atualmente o plano Starter cobra **R$ 27,90/mês** com 100 buscas mensais. A nova estrutura será:

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Modelo | Mensal (assinatura) | Pagamento único vitalício |
| Preço | R$ 27,90/mês | R$ 27,90 (uma vez) |
| Buscas | 100/mês | 100/mês para sempre |
| Renovação | A cada 30 dias | Nunca expira |

---

### Arquivos a Serem Modificados

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PÁGINAS E COMPONENTES                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. src/pages/Pricing.tsx                                                   │
│     ├─ Mudar "/mês" → "vitalício" no preço                                 │
│     ├─ Atualizar FAQs (remover pergunta sobre cancelamento)                │
│     └─ Mudar textos "100 buscas/mês" → "100 buscas/mês para sempre"        │
│                                                                             │
│  2. src/pages/Landing.tsx                                                   │
│     ├─ Seção PricingSection: mudar period "/mês" → "vitalício"             │
│     └─ Atualizar FAQs na seção FAQ                                         │
│                                                                             │
│  3. src/pages/Checkout.tsx                                                  │
│     ├─ Mudar título "Assinar" → "Adquirir"                                 │
│     └─ Mudar subtítulo "R$ 27,90/mês" → "R$ 27,90 (pagamento único)"       │
│                                                                             │
│  4. src/pages/Billing.tsx                                                   │
│     ├─ Remover lógica de "Próxima renovação"                               │
│     ├─ Remover botão "Cancelar Assinatura"                                 │
│     └─ Mostrar "Acesso Vitalício" para usuários PRO                        │
│                                                                             │
│  5. src/components/billing/PixPayment.tsx                                   │
│     └─ Mudar "Plano Starter - Mensal" → "Plano Starter - Vitalício"        │
│                                                                             │
│  6. src/components/billing/UsageCard.tsx                                    │
│     ├─ Remover "Renova em" para usuários PRO                               │
│     ├─ Mudar "Buscas este mês" → "Buscas utilizadas"                       │
│     └─ Mostrar "Acesso Vitalício" badge                                    │
│                                                                             │
│  7. src/components/billing/UpgradeModal.tsx                                 │
│     ├─ Mudar "R$ 27,90/mês" → "R$ 27,90 (vitalício)"                       │
│     └─ Mudar "100 buscas por mês" → "100 buscas/mês para sempre"           │
│                                                                             │
│  8. src/components/billing/PlanBadge.tsx                                    │
│     └─ (Opcional) Adicionar indicador "VITALÍCIO"                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           EDGE FUNCTIONS                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  9. supabase/functions/create-pix-payment/index.ts                          │
│     └─ Mudar descrição "Plano Starter Mensal" → "Plano Starter Vitalício"  │
│                                                                             │
│  10. supabase/functions/check-pix-payment/index.ts                          │
│     ├─ Remover lógica de "current_period_end" (ou setar null)              │
│     └─ Ajustar notificação de email (remover próxima cobrança)             │
│                                                                             │
│  11. supabase/functions/check-user-limits/index.ts                          │
│     └─ Ajustar para não verificar renovação mensal (vitalício)             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              HOOKS                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  12. src/hooks/useUserPlan.ts                                               │
│     └─ (Opcional) Ajustar lógica de limite mensal vs vitalício             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Mudanças de Copy Detalhadas

#### Preços e Valores

| Local | Antes | Depois |
|-------|-------|--------|
| Pricing.tsx | `R$ 27,90/mês` | `R$ 27,90` (vitalício) |
| Landing.tsx | `period: "/mês"` | `period: " (vitalício)"` |
| Checkout.tsx | `Pagamento via PIX` | `Pagamento único via PIX` |
| UpgradeModal | `R$ 27,90/mês` | `R$ 27,90 uma vez` |

#### Features e Benefícios

| Local | Antes | Depois |
|-------|-------|--------|
| Pricing | `100 buscas/mês` | `100 buscas/mês para sempre` |
| Landing | `100 buscas/mês` | `100 buscas/mês para sempre` |
| UpgradeModal | `100 buscas por mês` | `100 buscas/mês para sempre` |

#### CTAs (Call to Action)

| Local | Antes | Depois |
|-------|-------|--------|
| Pricing | `Assinar Agora` | `Comprar Agora` |
| Landing | `Assinar Agora` | `Comprar Agora` |
| Checkout | `Assinar Plano Starter` | `Adquirir Acesso Vitalício` |
| UpgradeModal | `Assinar Agora com PIX` | `Comprar Agora com PIX` |

#### FAQs a Atualizar/Remover

| FAQ | Ação |
|-----|------|
| "Posso cancelar quando quiser?" | **Remover** (não há assinatura) |
| "O plano renova automaticamente?" | **Adicionar**: "Não. Pague uma vez, use para sempre." |
| "Quais os benefícios do Starter?" | **Manter** com ajuste de copy |

---

### Lógica de Negócio

A mudança principal na lógica é:

1. **Sem renovação**: O campo `current_period_end` não será usado para expirar o acesso
2. **Reset mensal mantido**: As 100 buscas ainda resetam a cada 30 dias
3. **Sem cancelamento**: Usuários PRO têm acesso permanente

```text
ANTES (Mensal):
┌────────────────┐    ┌────────────────┐    ┌────────────────┐
│   Pagamento    │───>│  Acesso 30d    │───>│   Renovação    │
│   R$ 27,90     │    │  100 buscas    │    │   ou perde     │
└────────────────┘    └────────────────┘    └────────────────┘

DEPOIS (Vitalício):
┌────────────────┐    ┌────────────────────────────────────────┐
│   Pagamento    │───>│        Acesso PERMANENTE               │
│   R$ 27,90     │    │   100 buscas/mês (reset automático)    │
└────────────────┘    └────────────────────────────────────────┘
```

---

### Seção Técnica

#### Mudança na Edge Function check-pix-payment

```typescript
// ANTES
periodEnd.setDate(periodEnd.getDate() + 30);
// ...
current_period_end: periodEnd.toISOString(),

// DEPOIS
// Setar null ou uma data muito distante (ex: 2099)
current_period_end: null, // Vitalício - sem expiração
```

#### Mudança no useUserPlan.ts

A lógica atual já funciona porque:
- Usuários com `plan?.slug === 'starter'` são tratados como PRO
- O reset de buscas mensais é independente da expiração do plano

Apenas ajustar o componente UsageCard para não mostrar "Renova em".

#### Email de Notificação (check-pix-payment)

Remover a linha:
```html
<tr>
  <td>Próxima Cobrança:</td>
  <td>${periodEnd.toLocaleDateString('pt-BR')}</td>
</tr>
```

Substituir por:
```html
<tr>
  <td>Tipo:</td>
  <td>ACESSO VITALÍCIO</td>
</tr>
```

---

### Arquivos Finais Afetados

1. `src/pages/Pricing.tsx` - Copy de preços e FAQs
2. `src/pages/Landing.tsx` - Copy de preços e FAQs  
3. `src/pages/Checkout.tsx` - Título e subtítulo
4. `src/pages/Billing.tsx` - Remover renovação/cancelamento
5. `src/components/billing/PixPayment.tsx` - Label do plano
6. `src/components/billing/UsageCard.tsx` - Remover "Renova em"
7. `src/components/billing/UpgradeModal.tsx` - Copy de upgrade
8. `supabase/functions/create-pix-payment/index.ts` - Descrição
9. `supabase/functions/check-pix-payment/index.ts` - Lógica e email
10. `supabase/functions/check-user-limits/index.ts` - (Opcional) Ajustar mensagem
