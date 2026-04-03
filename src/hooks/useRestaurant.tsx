import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useRestaurant() {
  const { userRole } = useAuth();

  return useQuery({
    queryKey: ["restaurant", userRole?.restaurant_id],
    queryFn: async () => {
      if (!userRole?.restaurant_id) return null;
      const { data, error } = await supabase
        .from("restaurants")
        .select("*")
        .eq("id", userRole.restaurant_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userRole?.restaurant_id,
  });
}

export function useTrialStatus() {
  const { data: restaurant } = useRestaurant();

  if (!restaurant) return { isExpired: false, daysLeft: 7, status: "trial" as const };

  const now = new Date();
  const expiresAt = new Date(restaurant.trial_expires_at);
  const isExpired = restaurant.status === "blocked" || (restaurant.status === "trial" && now > expiresAt);
  const daysLeft = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  return { isExpired, daysLeft, status: restaurant.status };
}
