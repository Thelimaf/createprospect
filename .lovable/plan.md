

## Plano: Sistema de Beta Testers - Próximos 10 Usuários Recebem PRO Grátis

### Visão Geral

Implementar um sistema promocional onde os próximos 10 usuários cadastrados automaticamente recebem o plano Starter (PRO) de graça, com um popup especial de agradecimento após criarem sua primeira campanha.

---

### Componentes do Sistema

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FLUXO DO BETA TESTER                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. Novo usuário se cadastra (email verificado ou Google OAuth)             │
│                         ↓                                                    │
│  2. Trigger no banco verifica: contador < 10?                               │
│                         ↓                                                    │
│     ┌─── SIM ───────────────┐   ┌─── NÃO ──────────────┐                    │
│     │ Atribui plano Starter │   │ Atribui plano Free   │                    │
│     │ upgrade_source='beta' │   │ (comportamento atual)│                    │
│     │ Marca: is_beta_tester │   └──────────────────────┘                    │
│     │ Incrementa contador   │                                                │
│     └───────────────────────┘                                                │
│                         ↓                                                    │
│  3. Usuário cria primeira campanha                                           │
│                         ↓                                                    │
│  4. Frontend detecta: is_beta_tester + primeira campanha criada              │
│                         ↓                                                    │
│  5. Exibe popup de agradecimento com link do Instagram                       │
│                         ↓                                                    │
│  6. Marca: beta_welcome_shown = true (não mostrar novamente)                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 1. Alterações no Banco de Dados

#### 1.1 Criar tabela de configuração da promoção

```sql
CREATE TABLE public.promo_config (
  id TEXT PRIMARY KEY DEFAULT 'beta_testers',
  max_beta_users INTEGER NOT NULL DEFAULT 10,
  current_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir configuração inicial
INSERT INTO promo_config (id, max_beta_users, current_count, is_active)
VALUES ('beta_testers', 10, 0, true);

-- RLS: apenas leitura pública
ALTER TABLE promo_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "promo_config_select" ON promo_config FOR SELECT USING (true);
```

#### 1.2 Adicionar campos na tabela profiles

```sql
ALTER TABLE public.profiles 
ADD COLUMN is_beta_tester BOOLEAN DEFAULT false,
ADD COLUMN beta_welcome_shown BOOLEAN DEFAULT false;
```

#### 1.3 Atualizar trigger de novo usuário

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user_setup()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  plan_id UUID;
  promo promo_config%ROWTYPE;
  is_beta BOOLEAN := false;
BEGIN
  -- Buscar configuração da promoção
  SELECT * INTO promo FROM promo_config WHERE id = 'beta_testers';
  
  -- Verificar se usuário se qualifica para beta
  IF promo.is_active AND promo.current_count < promo.max_beta_users THEN
    -- Atribuir plano Starter
    SELECT id INTO plan_id FROM subscription_plans WHERE slug = 'starter' LIMIT 1;
    is_beta := true;
    
    -- Incrementar contador
    UPDATE promo_config 
    SET current_count = current_count + 1, updated_at = NOW()
    WHERE id = 'beta_testers';
  ELSE
    -- Atribuir plano Free (padrão)
    SELECT id INTO plan_id FROM subscription_plans WHERE slug = 'free' LIMIT 1;
  END IF;
  
  -- Criar subscription
  INSERT INTO user_subscriptions (user_id, plan_id, status, upgrade_source)
  VALUES (
    NEW.id, 
    plan_id, 
    'active', 
    CASE WHEN is_beta THEN 'beta_tester' ELSE NULL END
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Criar usage
  INSERT INTO user_usage (user_id, searches_used_lifetime, searches_used_monthly)
  VALUES (NEW.id, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Criar/atualizar profile com flag beta
  INSERT INTO profiles (id, full_name, avatar_url, is_beta_tester, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''),
    is_beta,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    is_beta_tester = is_beta,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;
```

---

### 2. Novos Arquivos Frontend

#### 2.1 Componente do Popup - `src/components/billing/BetaTesterWelcomeModal.tsx`

| Elemento | Descrição |
|----------|-----------|
| Ícone | Coroa/estrela com animação de brilho |
| Título | "🎉 Parabéns! Você é um Beta Tester!" |
| Mensagem principal | "Você agora é um usuário PRO com acesso completo!" |
| Mensagem secundária | Texto de agradecimento com @thelimaf clicável |
| Link Instagram | https://www.instagram.com/thelimaf/ |
| Botão | "Começar a Prospectar" |

```typescript
// Estrutura do componente
export function BetaTesterWelcomeModal({ 
  open, 
  onClose 
}: { 
  open: boolean; 
  onClose: () => void 
}) {
  // Visual inspirado no UpgradeModal (gradiente roxo, glow effects)
  // Link do Instagram clicável com ícone
  // Botão para fechar e marcar como visto
}
```

#### 2.2 Hook para gerenciar beta tester - `src/hooks/useBetaTester.ts`

```typescript
export function useBetaTester() {
  // Retorna:
  // - isBetaTester: boolean
  // - hasSeenWelcome: boolean
  // - markWelcomeAsSeen: () => Promise<void>
  // - shouldShowWelcome: boolean (calculado)
}
```

---

### 3. Modificações em Arquivos Existentes

#### 3.1 `src/pages/CampaignNew.tsx`

Após criar campanha com sucesso:
1. Verificar se usuário é beta tester
2. Verificar se já viu o popup de boas-vindas
3. Se ambas condições: mostrar popup
4. Ao fechar popup: marcar como visto no banco

```typescript
// Adicionar ao handleCreate():
if (isBetaTester && !hasSeenWelcome) {
  setShowBetaWelcome(true);
} else {
  navigate(`/campaigns/${data.id}`);
}
```

#### 3.2 `src/integrations/supabase/types.ts`

O arquivo será atualizado automaticamente após a migração com os novos campos:
- `profiles.is_beta_tester`
- `profiles.beta_welcome_shown`
- Nova tabela `promo_config`

---

### 4. Resumo das Alterações

| Tipo | Arquivo/Tabela | Ação |
|------|----------------|------|
| 🗄️ DB | `promo_config` | Criar tabela nova |
| 🗄️ DB | `profiles` | Adicionar 2 colunas |
| 🗄️ DB | Trigger `handle_new_user_setup` | Atualizar lógica |
| 📁 Novo | `BetaTesterWelcomeModal.tsx` | Criar componente |
| 📁 Novo | `useBetaTester.ts` | Criar hook |
| ✏️ Editar | `CampaignNew.tsx` | Integrar popup |

---

### Seção Técnica

**Decisões de Design:**

1. **Tabela `promo_config` separada**: Permite controlar a promoção sem alterar código (ativar/desativar, mudar limite)

2. **Flag `is_beta_tester` no profile**: Permanece mesmo após promoção acabar - histórico de quem foi beta

3. **`beta_welcome_shown`**: Evita mostrar popup repetidamente se usuário fechar sem ver

4. **`upgrade_source = 'beta_tester'`**: Diferencia no dashboard admin de cortesias manuais

**Contagem atual**: 7 usuários existentes. Os próximos 10 (usuários 8-17) receberão PRO grátis.

**Reativação**: Para resetar ou reativar, basta executar:
```sql
UPDATE promo_config SET current_count = 0, is_active = true WHERE id = 'beta_testers';
```

