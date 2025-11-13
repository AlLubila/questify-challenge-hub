import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const ProfileHeaderSkeleton = () => {
  return (
    <Card className="p-6">
      <div className="flex flex-col md:flex-row gap-6">
        <Skeleton className="h-24 w-24 rounded-full" />
        
        <div className="flex-1 space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-full max-w-md" />
          
          <div className="flex gap-4 pt-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-border">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="text-center">
            <Skeleton className="h-6 w-16 mx-auto mb-1" />
            <Skeleton className="h-4 w-20 mx-auto" />
          </div>
        ))}
      </div>
    </Card>
  );
};
