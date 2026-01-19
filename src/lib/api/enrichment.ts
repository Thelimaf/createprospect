import { supabase } from '@/integrations/supabase/client';

type EnrichmentResponse<T = unknown> = {
  success: boolean;
  error?: string;
  data?: T;
};

// CNPJ enrichment via Brasil API + Firecrawl search
export const brasilApi = {
  async enrichCnpj(leadId: string, businessName: string, city?: string): Promise<EnrichmentResponse> {
    const { data, error } = await supabase.functions.invoke('enrich-lead-cnpj', {
      body: { lead_id: leadId, business_name: businessName, city },
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return data;
  },
};

// Firecrawl web scraping and search
export const firecrawlApi = {
  async scrape(url: string, leadId?: string, options?: {
    formats?: ('markdown' | 'html' | 'links')[];
    onlyMainContent?: boolean;
  }): Promise<EnrichmentResponse> {
    const { data, error } = await supabase.functions.invoke('firecrawl-scrape', {
      body: { url, lead_id: leadId, options },
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return data;
  },

  async search(query: string, options?: {
    limit?: number;
    lang?: string;
    country?: string;
  }): Promise<EnrichmentResponse> {
    const { data, error } = await supabase.functions.invoke('firecrawl-search', {
      body: { query, options },
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return data;
  },
};

// Format helpers
export function formatCnpj(cnpj: string): string {
  const clean = cnpj.replace(/\D/g, '');
  if (clean.length !== 14) return cnpj;
  return clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    return new Intl.DateTimeFormat('pt-BR').format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}
