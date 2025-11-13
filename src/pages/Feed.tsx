import { Header } from "@/components/Header";
import { SubmissionCard } from "@/components/SubmissionCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles } from "lucide-react";

const Feed = () => {
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
      </div>
    </div>
  );
};

export default Feed;