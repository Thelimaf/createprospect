

## Plano: Corrigir CORS e Deploy das Edge Functions

### Problema

O erro "Failed to send a request to the Edge Function" ocorre porque:
1. A função `scrape-google-maps` **não está deployada** (sem nenhum log)
2. Os CORS headers estão incompletos em **todas as 20 Edge Functions** - faltam headers que o cliente Supabase JS v2.90 envia automaticamente

### Causa Raiz

O Supabase JS v2.90 envia headers extras (`x-supabase-client-platform`, etc.) que não estão listados no `Access-Control-Allow-Headers`. Quando o browser faz o preflight OPTIONS, o servidor rejeita a requisição por CORS.

### Solução

Atualizar os CORS headers em **todas as 20 Edge Functions** e fazer redeploy:

**De:**
```
'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
```

**Para:**
```
'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version'
```

### Arquivos a Modificar (20 funções)

| Arquivo | Linha |
|---------|-------|
| `supabase/functions/scrape-google-maps/index.ts` | 3-6 |
| `supabase/functions/firecrawl-business-search/index.ts` | 1-4 |
| `supabase/functions/firecrawl-search/index.ts` | 1-4 |
| `supabase/functions/firecrawl-scrape/index.ts` | 3-6 |
| `supabase/functions/check-user-limits/index.ts` | 3-6 |
| `supabase/functions/increment-search-usage/index.ts` | 3-6 |
| `supabase/functions/admin-users/index.ts` | 3-6 |
| `supabase/functions/create-pix-payment/index.ts` | 3-6 |
| `supabase/functions/check-pix-payment/index.ts` | 3-6 |
| `supabase/functions/simulate-pix-payment/index.ts` | 3-6 |
| `supabase/functions/generate-whatsapp/index.ts` | 3-6 |
| `supabase/functions/generate-outreach/index.ts` | 3-6 |
| `supabase/functions/create-search/index.ts` | 3-6 |
| `supabase/functions/enrich-lead-cnpj/index.ts` | 3-6 |
| `supabase/functions/enrich-lead-email/index.ts` | 3-6 |
| `supabase/functions/exa-webhook/index.ts` | 3-6 |
| `supabase/functions/send-email-verification/index.ts` | 4-7 |
| `supabase/functions/verify-email/index.ts` | 3-6 |
| `supabase/functions/reset-password/index.ts` | 3-6 |
| `supabase/functions/send-password-reset/index.ts` | 3-6 |

Após atualizar, deploy de todas as funções para garantir que estejam ativas.

