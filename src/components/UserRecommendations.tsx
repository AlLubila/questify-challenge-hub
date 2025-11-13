import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FollowButton } from "@/components/FollowButton";
import { useRecommendations } from "@/hooks/useRecommendations";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const UserRecommendations = () => {
  const { data: recommendations, isLoading } = useRecommendations(5);
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Suggested for you</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-8 w-20" />
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
        <Users className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Suggested for you</h3>
      </div>
      <div className="space-y-3">
        {recommendations.map((user) => (
          <div key={user.id} className="flex items-center gap-3">
            <Avatar 
              className="h-10 w-10 cursor-pointer" 
              onClick={() => navigate(`/profile/${user.id}`)}
            >
              <AvatarImage src={user.avatar_url || undefined} />
              <AvatarFallback>
                {user.display_name?.[0] || user.username[0]}
              </AvatarFallback>
            </Avatar>
            <div 
              className="flex-1 min-w-0 cursor-pointer" 
              onClick={() => navigate(`/profile/${user.id}`)}
            >
              <p className="font-medium text-sm truncate">
                {user.display_name || user.username}
              </p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                <span>Level {user.level}</span>
              </div>
            </div>
            <FollowButton userId={user.id} size="sm" variant="outline" />
          </div>
        ))}
      </div>
    </Card>
  );
};
