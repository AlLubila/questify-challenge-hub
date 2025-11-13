import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useChallengeRecommendations } from "@/hooks/useChallengeRecommendations";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export const PersonalizedChallenges = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: recommendations, isLoading } = useChallengeRecommendations(4);

  if (!user) return null;

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">For You</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <Skeleton className="h-4 w-full mb-2" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-16" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return null;
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">For You</h3>
        <Badge variant="secondary" className="text-xs ml-auto">
          Personalized
        </Badge>
      </div>
      <div className="space-y-3">
        {recommendations.map((challenge: any) => (
          <div
            key={challenge.id}
            className="cursor-pointer hover:bg-accent/50 p-2 rounded-lg transition-colors"
            onClick={() => navigate(`/challenge/${challenge.id}`)}
          >
            <p className="font-medium text-sm line-clamp-2 mb-2">
              {challenge.title}
            </p>
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="secondary" className="px-1.5 py-0">
                {challenge.difficulty}
              </Badge>
              <Badge variant="outline" className="px-1.5 py-0">
                {challenge.challenge_type}
              </Badge>
              <div className="flex items-center gap-1 text-muted-foreground ml-auto">
                <Trophy className="h-3 w-3" />
                <span>{challenge.points} pts</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
