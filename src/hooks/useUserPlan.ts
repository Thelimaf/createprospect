import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const MASTER_EMAIL = 'anderson.ferlimajunior@gmail.com';

interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  price_brl: number;
  features: string[];
  limits: {
    searches_lifetime?: number;
    searches_monthly?: number;
    campaigns?: number | string;
  };
}

interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'active' | 'cancelled' | 'paused';
  current_period_start: string | null;
  current_period_end: string | null;
  subscription_plans: SubscriptionPlan;
}

interface UserUsage {
  id: string;
  user_id: string;
  searches_used_lifetime: number;
  searches_used_monthly: number;
  reset_date: string | null;
  last_search_at: string | null;
}

interface UserPlanData {
  subscription: UserSubscription | null;
  usage: UserUsage | null;
  plan: SubscriptionPlan | null;
  isLoading: boolean;
  error: string | null;
  isPro: boolean;
  isFree: boolean;
  searchesUsed: number;
  searchesLimit: number;
  searchesRemaining: number;
  refetch: () => Promise<void>;
  // Feature flags
  canSearchEmails: boolean;
  canSendWhatsApp: boolean;
  canViewFullLeadData: boolean;
  canExportCSV: boolean;
  // First 3 leads unlocked for free users
  unlockedLeadIds: Set<string>;
  isLeadUnlocked: (leadId: string) => boolean;
  refreshUnlockedLeads: () => Promise<void>;
}

export function useUserPlan(): UserPlanData {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [usage, setUsage] = useState<UserUsage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unlockedLeadIds, setUnlockedLeadIds] = useState<Set<string>>(new Set());

  // Fetch unlocked leads (first 3 leads by created_at)
  const fetchUnlockedLeads = useCallback(async () => {
    if (!user) return;

    try {
      const { data: firstLeads } = await supabase
        .from('google_maps_leads')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(3);

      if (firstLeads) {
        setUnlockedLeadIds(new Set(firstLeads.map(l => l.id)));
      }
    } catch (err) {
      console.error('Error fetching unlocked leads:', err);
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch subscription with plan - use maybeSingle to avoid error when no record exists
      const { data: subData, error: subError } = await supabase
        .from('user_subscriptions')
        .select('*, subscription_plans(*)')
        .eq('user_id', user.id)
        .maybeSingle();

      if (subError) {
        throw subError;
      }

      // Fetch usage - use maybeSingle to avoid error when no record exists
      const { data: usageData, error: usageError } = await supabase
        .from('user_usage')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (usageError) {
        throw usageError;
      }

      // Fetch first 3 leads for free users (unlocked leads)
      await fetchUnlockedLeads();

      setSubscription(subData as UserSubscription);
      setUsage(usageData as UserUsage);
    } catch (err) {
      console.error('Error fetching user plan:', err);
      setError('Erro ao carregar plano');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Setup realtime subscription for leads to update unlocked leads dynamically
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('unlocked_leads_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'google_maps_leads',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // When a new lead is inserted, re-fetch unlocked leads
          fetchUnlockedLeads();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'google_maps_leads',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // When a lead is deleted, re-fetch unlocked leads
          fetchUnlockedLeads();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchUnlockedLeads]);

  const plan = subscription?.subscription_plans || null;
  // Admin master always has full Pro access regardless of database plan
  const isMaster = user?.email === MASTER_EMAIL;
  const isPro = isMaster || (plan?.slug === 'starter' && subscription?.status === 'active');
  const isFree = !isPro;

  // Calculate searches
  let searchesUsed = 0;
  let searchesLimit = 3;

  if (isFree) {
    searchesUsed = usage?.searches_used_lifetime || 0;
    searchesLimit = plan?.limits?.searches_lifetime || 3;
  } else {
    searchesUsed = usage?.searches_used_monthly || 0;
    searchesLimit = plan?.limits?.searches_monthly || 100;
  }

  const searchesRemaining = Math.max(0, searchesLimit - searchesUsed);

  // Feature flags based on plan
  const canSearchEmails = isPro;
  const canSendWhatsApp = isPro;
  const canViewFullLeadData = isPro;
  const canExportCSV = isPro;

  // Check if a specific lead is unlocked (first 3 leads for free users, or all for pro)
  const isLeadUnlocked = useCallback((leadId: string): boolean => {
    if (isPro) return true;
    return unlockedLeadIds.has(leadId);
  }, [isPro, unlockedLeadIds]);

  return {
    subscription,
    usage,
    plan,
    isLoading,
    error,
    isPro,
    isFree,
    searchesUsed,
    searchesLimit,
    searchesRemaining,
    refetch: fetchData,
    // Feature flags
    canSearchEmails,
    canSendWhatsApp,
    canViewFullLeadData,
    canExportCSV,
    // First 3 leads unlocked
    unlockedLeadIds,
    isLeadUnlocked,
    refreshUnlockedLeads: fetchUnlockedLeads,
  };
}
