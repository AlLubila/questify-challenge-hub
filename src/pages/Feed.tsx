import { Header } from "@/components/Header";
import { SubmissionCard } from "@/components/SubmissionCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";

const Feed = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const boostSuccess = searchParams.get("boost_success");
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    const processPaymentSuccess = async () => {
      if (boostSuccess === "true" && sessionId) {
        try {
          const { error } = await supabase.functions.invoke("process-payment-success", {
            body: { sessionId },
          });
          
          if (error) throw error;
          
          toast.success("Boost Applied Successfully! ⚡", {
            description: "Your submission visibility has been increased!",
          });
        } catch (error) {
          console.error("Error processing payment:", error);
        } finally {
          // Clear the URL parameters
          searchParams.delete("boost_success");
          searchParams.delete("session_id");
          setSearchParams(searchParams);
        }
      }
    };

    processPaymentSuccess();
  }, [boostSuccess, sessionId, searchParams, setSearchParams]);
  
  // All submissions query
  const { data: submissions, isLoading } = useQuery({
    queryKey: ["feed-submissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("submissions")
        .select(`
          *,
          profiles (
            id,
            username,
            display_name,
            avatar_url
          ),
          challenges (
            id,
            title,
            difficulty,
            points
          )
        `)
        .eq("status", "approved")
        .order("submitted_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
  });

  // Following submissions query
  const { data: followingSubmissions, isLoading: followingLoading } = useQuery({
    queryKey: ["following-submissions", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // First, get the list of users the current user follows
      const { data: follows, error: followsError } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);
      
      if (followsError) throw followsError;
      
      if (!follows || follows.length === 0) return [];
      
      const followingIds = follows.map((f) => f.following_id);
      
      // Then get submissions from those users
      const { data, error } = await supabase
        .from("submissions")
        .select(`
          *,
          profiles (
            id,
            username,
            display_name,
            avatar_url
          ),
          challenges (
            id,
            title,
            difficulty,
            points
          )
        `)
        .eq("status", "approved")
        .in("user_id", followingIds)
        .order("submitted_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container py-8 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Community Feed</h1>
          <p className="text-muted-foreground text-lg">
            Discover amazing creations from talented creators
          </p>
        </div>

        <Tabs defaultValue="discover" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="discover">Discover</TabsTrigger>
            <TabsTrigger value="following" disabled={!user}>
              Following
            </TabsTrigger>
          </TabsList>

          <TabsContent value="discover" className="space-y-6 mt-8">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : submissions && submissions.length > 0 ? (
              <div className="max-w-2xl mx-auto space-y-6">
                {submissions.map((submission: any) => (
                  <SubmissionCard key={submission.id} submission={submission} />
                ))}
              </div>
            ) : (
              <div className="max-w-2xl mx-auto">
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Sparkles className="w-16 h-16 mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-bold mb-2">No submissions yet</h3>
                  <p className="text-muted-foreground">
                    Be the first to submit an entry to a challenge!
                  </p>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="following" className="space-y-6 mt-8">
            {followingLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : followingSubmissions && followingSubmissions.length > 0 ? (
              <div className="max-w-2xl mx-auto space-y-6">
                {followingSubmissions.map((submission: any) => (
                  <SubmissionCard key={submission.id} submission={submission} />
                ))}
              </div>
            ) : (
              <div className="max-w-2xl mx-auto">
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Sparkles className="w-16 h-16 mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-bold mb-2">No submissions from followed users</h3>
                  <p className="text-muted-foreground">
                    Follow creators to see their latest submissions here!
                  </p>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Feed;