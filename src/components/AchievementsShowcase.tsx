import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useRecentAchievements } from "@/hooks/useRecentAchievements";
import { Skeleton } from "@/components/ui/skeleton";
import { Award, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

export const AchievementsShowcase = () => {
  const navigate = useNavigate();
  const { data: achievements, isLoading } = useRecentAchievements(5);

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Award className="h-5 w-5 text-purple-500" />
          <h3 className="font-semibold">Recent Achievements</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <div className="flex items-center gap-2 mb-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (!achievements || achievements.length === 0) {
    return null;
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Award className="h-5 w-5 text-purple-500" />
        <h3 className="font-semibold">Recent Achievements</h3>
        <Sparkles className="h-4 w-4 text-yellow-500 ml-auto" />
      </div>
      <div className="space-y-4">
        {achievements.map((achievement) => (
          <div
            key={achievement.id}
            className="space-y-2"
          >
            <div 
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => navigate(`/profile/${achievement.profiles.id}`)}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={achievement.profiles.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {achievement.profiles.display_name?.[0] || achievement.profiles.username[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {achievement.profiles.display_name || achievement.profiles.username}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(achievement.earned_at), { addSuffix: true })}
                </p>
              </div>
            </div>
            <div className="pl-10">
              <Badge 
                variant="secondary" 
                className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20 text-sm"
              >
                {achievement.badges.icon && (
                  <span className="mr-1.5">{achievement.badges.icon}</span>
                )}
                {achievement.badges.name}
              </Badge>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {achievement.badges.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
