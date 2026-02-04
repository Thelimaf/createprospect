

## Plano: Limpar Banco de Leads e Garantir Sistema 100% Funcional

### Estado Atual

O sistema está **quase pronto**, mas há dois problemas identificados:

1. **Edge function ainda não redeployada** - A constraint correta existe no banco, mas a função está usando versão cacheada
2. **Dados antigos no banco** - 315 leads de testes anteriores precisam ser removidos

---

### O Que Será Feito

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AÇÕES DE LIMPEZA E CORREÇÃO                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. LIMPEZA DO BANCO DE DADOS                                               │
│     ├─ Excluir TODOS os leads da tabela google_maps_leads (315 registros)   │
│     └─ Excluir TODOS os históricos de busca google_maps_searches (22)       │
│                                                                              │
│  2. REDEPLOY DAS EDGE FUNCTIONS                                             │
│     ├─ scrape-google-maps (forçar reconhecimento da nova constraint)        │
│     └─ firecrawl-business-search (garantir consistência)                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Detalhes da Limpeza

| Tabela | Registros Atuais | Ação |
|--------|------------------|------|
| `google_maps_leads` | 315 leads | Excluir tudo |
| `google_maps_searches` | 22 buscas | Excluir tudo |

**Por usuário que será limpo:**
- Anderson Lima: 193 leads
- Anderson: 60 leads  
- Alessandro Evangelista: 35 leads
- Usuário sem nome: 20 leads
- João Silva: 7 leads

---

### Resultado Esperado

Após a execução:

| Cenário | Antes | Depois |
|---------|-------|--------|
| João busca "Academias em Londrina" (20) | Recebe 0 | Recebe ~20 |
| Maria busca mesmos termos (20) | Bloqueada por João | Recebe ~20 (isolados) |
| Dados entre usuários | Misturados/conflitos | Totalmente isolados |
| Constraint funcionando | Não (cache) | Sim (nova constraint) |

---

### Comandos SQL que Serão Executados

```sql
-- Limpar todos os leads de busca do Google Maps
DELETE FROM google_maps_leads;

-- Limpar histórico de buscas
DELETE FROM google_maps_searches;
```

---

### Seção Técnica

**Por que os erros continuavam após a migração:**

As Edge Functions no Lovable Cloud/Supabase rodam em workers isolados. Quando uma migração altera constraints, as funções que já estão em execução podem continuar usando o schema antigo em cache. O redeploy força o worker a buscar o schema atualizado.

**Verificação da constraint atual (confirmada):**
```sql
CREATE UNIQUE INDEX google_maps_leads_user_place_unique 
ON public.google_maps_leads USING btree (user_id, place_id)
-- SEM cláusula WHERE - CORRETO!
```

**Fluxo após correção:**
1. Serper retorna 20 leads
2. Edge function tenta upsert com `onConflict: 'user_id,place_id'`
3. PostgreSQL reconhece a constraint correta
4. Upsert funciona - 20 leads salvos
5. Usuário vê 20 leads na interface

