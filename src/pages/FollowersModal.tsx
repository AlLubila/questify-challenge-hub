import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFollowers, useFollowing } from "@/hooks/useFollow";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FollowButton } from "@/components/FollowButton";
import { Link } from "react-router-dom";

interface FollowersModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "followers" | "following";
}

export const FollowersModal = ({
  userId,
  isOpen,
  onClose,
  defaultTab = "followers",
}: FollowersModalProps) => {
  const { data: followers, isLoading: followersLoading } = useFollowers(userId);
  const { data: following, isLoading: followingLoading } = useFollowing(userId);

  const UserItem = ({ profile, showFollowButton = false }: any) => (
    <div className="flex items-center justify-between py-3">
      <Link
        to={`/profile?userId=${profile.id}`}
        className="flex items-center gap-3 flex-1"
        onClick={onClose}
      >
        <Avatar className="h-10 w-10">
          <AvatarImage src={profile.avatar_url} />
          <AvatarFallback>
            {profile.display_name?.[0] || profile.username?.[0] || "U"}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{profile.display_name || profile.username}</p>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
        </div>
      </Link>
      {showFollowButton && <FollowButton userId={profile.id} size="sm" />}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Connections</DialogTitle>
          <DialogDescription>View followers and following</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="followers">
              Followers ({followers?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="following">
              Following ({following?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="followers" className="space-y-2">
            {followersLoading ? (
              Array(3)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))
            ) : followers && followers.length > 0 ? (
              followers.map((follower: any) => (
                <UserItem
                  key={follower.follower_id}
                  profile={follower.profiles}
                  showFollowButton
                />
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No followers yet
              </p>
            )}
          </TabsContent>

          <TabsContent value="following" className="space-y-2">
            {followingLoading ? (
              Array(3)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))
            ) : following && following.length > 0 ? (
              following.map((follow: any) => (
                <UserItem
                  key={follow.following_id}
                  profile={follow.profiles}
                  showFollowButton
                />
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Not following anyone yet
              </p>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};