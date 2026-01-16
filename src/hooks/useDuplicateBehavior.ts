import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type DuplicateBehavior = "ignore" | "update" | "ask";

export function useDuplicateBehavior() {
  const { user } = useAuth();
  const [behavior, setBehavior] = useState<DuplicateBehavior>("ignore");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchBehavior();
  }, [user]);

  const fetchBehavior = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("duplicate_behavior")
      .eq("id", user.id)
      .single();

    if (!error && data?.duplicate_behavior) {
      setBehavior(data.duplicate_behavior as DuplicateBehavior);
    }
    setIsLoading(false);
  };

  const updateBehavior = async (newBehavior: DuplicateBehavior) => {
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ duplicate_behavior: newBehavior })
      .eq("id", user.id);

    if (!error) {
      setBehavior(newBehavior);
    }
    return !error;
  };

  return { behavior, updateBehavior, isLoading };
}
