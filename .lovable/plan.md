

## Plano: Beta Testers PRO + Configuração Abacate Pay Produção

### Problema Identificado

O sistema atual funciona assim:
- Beta testers recebem o plano `starter` com `upgrade_source = 'beta_tester'`
- O `useUserPlan.ts` verifica `plan?.slug === 'starter'` → considera PRO ✅

**Beta testers JÁ são tratados como PRO** porque o trigger de banco atribui o plano Starter automaticamente. Não há necessidade de mudança no código!

---

### Ações Necessárias

```text
┌────────────────────────────────────────────────────────────────────────────┐
│                         O QUE SERÁ CONFIGURADO                             │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. ATUALIZAR SECRET DO ABACATE PAY                                        │
│     ├─ Chave atual: abc_dev_* (desenvolvimento)                            │
│     └─ Nova chave: abc_prod_jQfusFGWsazREckX4C2GtUac (produção)            │
│                                                                             │
│  2. REDEPLOY DAS EDGE FUNCTIONS                                            │
│     ├─ create-pix-payment (usar nova chave)                                │
│     └─ check-pix-payment (usar nova chave)                                 │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

---

### Fluxo de Pagamento PIX

| Etapa | Endpoint | Descrição |
|-------|----------|-----------|
| 1 | `POST /pixQrCode/create` | Gera QR Code com brCode e brCodeBase64 |
| 2 | Polling | Frontend verifica a cada 5s |
| 3 | `GET /pixQrCode/check?id=` | Verifica status (PENDING/PAID/EXPIRED) |
| 4 | Upgrade | Se PAID, upgrade para Starter |

---

### Confirmação de Funcionalidades Beta Tester

| Funcionalidade | Status |
|----------------|--------|
| Buscas ilimitadas (100/mês) | ✅ Já funciona |
| Sem limite de 3 buscas | ✅ Já funciona |
| WhatsApp liberado | ✅ Já funciona |
| Export Excel | ✅ Já funciona |
| Dados completos de leads | ✅ Já funciona |

O trigger de banco de dados já atribui o plano Starter aos beta testers, e o `useUserPlan` reconhece `starter` como PRO.

---

### Seção Técnica

**Verificação do fluxo beta tester:**

```text
1. Novo usuário se cadastra
         ↓
2. Trigger 'handle_new_user_setup' verifica promo_config
         ↓
3. Se slots < limite (10):
   - Atribui plano Starter
   - upgrade_source = 'beta_tester'
   - is_beta_tester = true
         ↓
4. useUserPlan verifica plan.slug === 'starter'
         ↓
5. isPro = true → TODAS as features liberadas
```

**Configuração da API Abacate Pay:**

A chave `abc_prod_*` é a chave de produção que processa pagamentos reais. O formato da requisição e resposta permanece idêntico, apenas a chave muda.

