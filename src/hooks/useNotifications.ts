import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const playNotificationSound = () => {
  const audio = new Audio("/notification-sound.mp3");
  audio.volume = 0.5;
  audio.play().catch(err => console.log("Error playing sound:", err));
};

export const useNotifications = (filterType?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Fetch notifications with optional filter
  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications", user?.id, filterType],
    queryFn: async () => {
      if (!user) return [];
      let query = supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id);
      
      if (filterType && filterType !== "all") {
        query = query.eq("type", filterType);
      }
      
      const { data, error } = await query
        .order("created_at", { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Mark notification as read
  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Mark all as read
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Listen for realtime updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("New notification received:", payload);
          
          // Play notification sound if enabled
          if (soundEnabled) {
            playNotificationSound();
          }
          
          // Show toast for new notification
          const notification = payload.new as any;
          toast.success(notification.title, {
            description: notification.message,
          });

          // Invalidate queries to refetch
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient, soundEnabled]);

  const unreadCount = notifications?.filter((n) => !n.is_read).length || 0;

  return {
    notifications: notifications || [],
    unreadCount,
    isLoading,
    markAsRead: markAsRead.mutate,
    markAllAsRead: markAllAsRead.mutate,
    isMarkingRead: markAsRead.isPending,
    isMarkingAllRead: markAllAsRead.isPending,
    soundEnabled,
    setSoundEnabled,
  };
};
