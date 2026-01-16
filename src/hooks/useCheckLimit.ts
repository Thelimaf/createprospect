import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LimitCheckResult {
  allowed: boolean;
  plan_name: string;
  remaining_searches: number;
  current_usage: number;
  limit: number;
  is_last_search?: boolean;
  message?: string | null;
  payment_required?: boolean;
  renewal_date?: string;
}

export function useCheckLimit() {
  const [isChecking, setIsChecking] = useState(false);
  const [lastResult, setLastResult] = useState<LimitCheckResult | null>(null);

  const checkLimit = async (): Promise<LimitCheckResult> => {
    setIsChecking(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return {
          allowed: false,
          plan_name: 'free',
          remaining_searches: 0,
          current_usage: 0,
          limit: 3,
          message: 'Você precisa estar logado para buscar',
        };
      }

      const { data, error } = await supabase.functions.invoke('check-user-limits', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Error checking limits:', error);
        throw error;
      }

      setLastResult(data);
      return data;
    } catch (err) {
      console.error('Error in checkLimit:', err);
      return {
        allowed: false,
        plan_name: 'free',
        remaining_searches: 0,
        current_usage: 0,
        limit: 3,
        message: 'Erro ao verificar limites',
      };
    } finally {
      setIsChecking(false);
    }
  };

  const incrementUsage = async (): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return false;
      }

      const { error } = await supabase.functions.invoke('increment-search-usage', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Error incrementing usage:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error in incrementUsage:', err);
      return false;
    }
  };

  return {
    checkLimit,
    incrementUsage,
    isChecking,
    lastResult,
  };
}
