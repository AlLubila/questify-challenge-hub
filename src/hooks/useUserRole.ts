import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type UserRole = "admin" | "moderator" | "user";

export const useUserRole = () => {
  const { user } = useAuth();

  const { data: roles, isLoading } = useQuery({
    queryKey: ["userRoles", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (error) throw error;
      return (data || []).map((r) => r.role as UserRole);
    },
    enabled: !!user?.id,
  });

  const isAdmin = roles?.includes("admin") || false;
  const isModerator = roles?.includes("moderator") || false;
  const isAdminOrModerator = isAdmin || isModerator;

  return {
    roles: roles || [],
    isAdmin,
    isModerator,
    isAdminOrModerator,
    isLoading,
  };
};
