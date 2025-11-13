import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const ChallengeCardSkeleton = () => {
  return (
    <Card className="overflow-hidden bg-card border-border">
      <Skeleton className="w-full h-48" />
      
      <div className="p-5 space-y-4">
        <div>
          <Skeleton className="h-7 w-3/4 mb-2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3 mt-1" />
        </div>

        <div className="flex items-center gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    </Card>
  );
};
