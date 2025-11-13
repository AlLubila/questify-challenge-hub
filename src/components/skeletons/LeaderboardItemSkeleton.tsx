import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const LeaderboardItemSkeleton = () => {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-4">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-12 w-12 rounded-full" />
        
        <div className="flex-1">
          <Skeleton className="h-5 w-32 mb-1" />
          <Skeleton className="h-4 w-24" />
        </div>

        <div className="text-right">
          <Skeleton className="h-6 w-20 mb-1" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    </Card>
  );
};
