import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Flame, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Challenge {
  id: string;
  title: string;
  difficulty: string;
  participants_count: number;
}

const fetchTrendingChallenges = async (): Promise<Challenge[]> => {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/challenges`;
  const params = new URLSearchParams({
    select: "id,title,difficulty,participants_count",
    publish_status: "eq.published",
    end_date: `gte.${new Date().toISOString()}`,
    order: "participants_count.desc",
    limit: "5",
  });

  const response = await fetch(`${url}?${params}`, {
    headers: {
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
  });

  if (!response.ok) throw new Error("Failed to fetch trending challenges");
  return response.json();
};

export const TrendingChallenges = () => {
  const navigate = useNavigate();

  const { data: trendingChallenges, isLoading } = useQuery({
    queryKey: ["trending-challenges"],
    queryFn: fetchTrendingChallenges,
  });

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Flame className="h-5 w-5 text-orange-500" />
          <h3 className="font-semibold">Trending Challenges</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <Skeleton className="h-4 w-full mb-2" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-20" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (!trendingChallenges || trendingChallenges.length === 0) {
    return null;
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Flame className="h-5 w-5 text-orange-500" />
        <h3 className="font-semibold">Trending Challenges</h3>
      </div>
      <div className="space-y-3">
        {trendingChallenges.map((challenge, index) => (
          <div
            key={challenge.id}
            className="cursor-pointer hover:bg-accent/50 p-2 rounded-lg transition-colors"
            onClick={() => navigate(`/challenge/${challenge.id}`)}
          >
            <div className="flex items-start gap-2">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex-shrink-0">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm line-clamp-2 mb-1">
                  {challenge.title}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>{challenge.participants_count || 0}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs px-1.5 py-0">
                    {challenge.difficulty}
                  </Badge>
                </div>
              </div>
              {index === 0 && (
                <TrendingUp className="h-4 w-4 text-orange-500 flex-shrink-0" />
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
