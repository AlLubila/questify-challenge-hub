import { Button } from "@/components/ui/button";
import { useFollow } from "@/hooks/useFollow";
import { UserPlus, UserMinus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface FollowButtonProps {
  userId: string;
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
}

export const FollowButton = ({ userId, variant = "default", size = "default" }: FollowButtonProps) => {
  const { user } = useAuth();
  const { isFollowing, follow, unfollow, isPending, isLoading } = useFollow(userId);

  if (!user || user.id === userId) return null;

  if (isLoading) {
    return (
      <Button variant={variant} size={size} disabled>
        Loading...
      </Button>
    );
  }

  return (
    <Button
      variant={isFollowing ? "outline" : variant}
      size={size}
      onClick={() => (isFollowing ? unfollow() : follow())}
      disabled={isPending}
    >
      {isFollowing ? (
        <>
          <UserMinus className="h-4 w-4 mr-2" />
          Unfollow
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4 mr-2" />
          Follow
        </>
      )}
    </Button>
  );
};