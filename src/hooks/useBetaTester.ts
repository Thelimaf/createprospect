import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface BetaTesterState {
  isBetaTester: boolean;
  hasSeenWelcome: boolean;
  isLoading: boolean;
}

export function useBetaTester() {
  const { user } = useAuth();
  const [state, setState] = useState<BetaTesterState>({
    isBetaTester: false,
    hasSeenWelcome: true,
    isLoading: true,
  });

  useEffect(() => {
    if (!user) {
      setState({ isBetaTester: false, hasSeenWelcome: true, isLoading: false });
      return;
    }

    const fetchBetaStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('is_beta_tester, beta_welcome_shown')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching beta status:', error);
          setState({ isBetaTester: false, hasSeenWelcome: true, isLoading: false });
          return;
        }

        setState({
          isBetaTester: data?.is_beta_tester ?? false,
          hasSeenWelcome: data?.beta_welcome_shown ?? true,
          isLoading: false,
        });
      } catch (err) {
        console.error('Error in useBetaTester:', err);
        setState({ isBetaTester: false, hasSeenWelcome: true, isLoading: false });
      }
    };

    fetchBetaStatus();
  }, [user]);

  const markWelcomeAsSeen = useCallback(async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ beta_welcome_shown: true })
        .eq('id', user.id);

      if (error) {
        console.error('Error marking welcome as seen:', error);
        return;
      }

      setState(prev => ({ ...prev, hasSeenWelcome: true }));
    } catch (err) {
      console.error('Error in markWelcomeAsSeen:', err);
    }
  }, [user]);

  const shouldShowWelcome = state.isBetaTester && !state.hasSeenWelcome && !state.isLoading;

  return {
    isBetaTester: state.isBetaTester,
    hasSeenWelcome: state.hasSeenWelcome,
    isLoading: state.isLoading,
    shouldShowWelcome,
    markWelcomeAsSeen,
  };
}
