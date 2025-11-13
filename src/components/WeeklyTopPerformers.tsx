import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useWeeklyTopPerformers } from "@/hooks/useWeeklyTopPerformers";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Zap, Medal } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const WeeklyTopPerformers = () => {
  const navigate = useNavigate();
  const { data: topPerformers, isLoading } = useWeeklyTopPerformers(5);

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <h3 className="font-semibold">Top of the Week</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-6 w-12" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (!topPerformers || topPerformers.length === 0) {
    return null;
  }

  const getMedalColor = (index: number) => {
    switch (index) {
      case 0:
        return "text-yellow-500";
      case 1:
        return "text-gray-400";
      case 2:
        return "text-amber-600";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="h-5 w-5 text-yellow-500" />
        <h3 className="font-semibold">Top of the Week</h3>
        <Badge variant="secondary" className="text-xs ml-auto">
          This Week
        </Badge>
      </div>
      <div className="space-y-3">
        {topPerformers.map((performer, index) => (
          <div
            key={performer.id}
            className="flex items-center gap-3 cursor-pointer hover:bg-accent/50 p-2 rounded-lg transition-colors"
            onClick={() => navigate(`/profile/${performer.id}`)}
          >
            <div className="relative">
              <Avatar className="h-10 w-10">
                <AvatarImage src={performer.avatar_url || undefined} />
                <AvatarFallback>
                  {performer.display_name?.[0] || performer.username[0]}
                </AvatarFallback>
              </Avatar>
              {index < 3 && (
                <div className={`absolute -bottom-1 -right-1 ${getMedalColor(index)}`}>
                  {index === 0 ? (
                    <Trophy className="h-4 w-4 fill-current" />
                  ) : (
                    <Medal className="h-4 w-4 fill-current" />
                  )}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">
                {performer.display_name || performer.username}
              </p>
              <p className="text-xs text-muted-foreground">
                Level {performer.level}
              </p>
            </div>
            <div className="flex items-center gap-1 text-primary">
              <Zap className="h-3 w-3" />
              <span className="text-sm font-bold">
                +{performer.weeklyPoints}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
