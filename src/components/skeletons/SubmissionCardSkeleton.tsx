import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const SubmissionCardSkeleton = () => {
  return (
    <Card className="overflow-hidden bg-card border-border">
      <div className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-32 mb-1" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>

        <Skeleton className="w-full h-64 mb-4" />

        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4 mb-4" />

        <div className="flex items-center gap-4 pt-3 border-t border-border">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-20 ml-auto" />
        </div>
      </div>
    </Card>
  );
};
