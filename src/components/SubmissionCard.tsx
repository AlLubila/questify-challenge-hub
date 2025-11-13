import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Heart, MessageCircle, Send } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface SubmissionCardProps {
  submission: any;
}

export const SubmissionCard = ({ submission }: SubmissionCardProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");

  // Check if user has voted
  const { data: userVote } = useQuery({
    queryKey: ["user-vote", submission.id, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("submission_votes")
        .select("id")
        .eq("submission_id", submission.id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch comments
  const { data: comments } = useQuery({
    queryKey: ["comments", submission.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select(`
          *,
          profiles (
            username,
            display_name,
            avatar_url
          )
        `)
        .eq("submission_id", submission.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error("Must be logged in to vote");
      }

      if (userVote) {
        // Remove vote
        const { error } = await supabase
          .from("submission_votes")
          .delete()
          .eq("id", userVote.id);
        if (error) throw error;
      } else {
        // Add vote
        const { error } = await supabase
          .from("submission_votes")
          .insert({
            submission_id: submission.id,
            user_id: user.id,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-vote"] });
      queryClient.invalidateQueries({ queryKey: ["feed-submissions"] });
    },
    onError: (error: any) => {
      if (error.message.includes("logged in")) {
        toast.error("Sign in to vote on submissions");
        navigate("/auth");
      } else {
        toast.error("Failed to vote");
      }
    },
  });

  // Comment mutation
  const commentMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error("Must be logged in to comment");
      }

      const { error } = await supabase.from("comments").insert({
        submission_id: submission.id,
        user_id: user.id,
        content: commentText.trim(),
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments"] });
      setCommentText("");
      toast.success("Comment added!");
    },
    onError: (error: any) => {
      if (error.message.includes("logged in")) {
        toast.error("Sign in to comment");
        navigate("/auth");
      } else {
        toast.error("Failed to add comment");
      }
    },
  });

  const handleVote = () => {
    voteMutation.mutate();
  };

  const handleComment = () => {
    if (!commentText.trim()) {
      toast.error("Comment cannot be empty");
      return;
    }
    if (commentText.length > 500) {
      toast.error("Comment is too long (max 500 characters)");
      return;
    }
    commentMutation.mutate();
  };

  const difficultyColors = {
    easy: "bg-success text-success-foreground",
    medium: "bg-accent text-accent-foreground",
    hard: "bg-secondary text-secondary-foreground",
  };

  return (
    <Card className="overflow-hidden">
      {/* User Info Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage
              src={submission.profiles.avatar_url || undefined}
              alt={submission.profiles.username}
            />
            <AvatarFallback className="bg-gradient-primary text-primary-foreground">
              {submission.profiles.username.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-bold">
              {submission.profiles.display_name || submission.profiles.username}
            </p>
            <p className="text-sm text-muted-foreground">
              @{submission.profiles.username}
            </p>
          </div>
        </div>
        <Badge
          className={difficultyColors[submission.challenges.difficulty as keyof typeof difficultyColors]}
        >
          {submission.challenges.title}
        </Badge>
      </div>

      {/* Submission Content */}
      <div className="aspect-video bg-muted relative">
        {submission.content_url.match(/\.(mp4|webm|ogg)$/i) ? (
          <video
            src={submission.content_url}
            controls
            className="w-full h-full object-cover"
          />
        ) : (
          <img
            src={submission.content_url}
            alt="Submission"
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Caption */}
      {submission.caption && (
        <div className="p-4">
          <p className="text-foreground">{submission.caption}</p>
        </div>
      )}

      {/* Actions */}
      <div className="px-4 py-3 flex items-center gap-4 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          className={`gap-2 ${userVote ? "text-red-500" : ""}`}
          onClick={handleVote}
          disabled={voteMutation.isPending}
        >
          <Heart className={`w-5 h-5 ${userVote ? "fill-current" : ""}`} />
          <span className="font-bold">{submission.votes}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={() => setShowComments(!showComments)}
        >
          <MessageCircle className="w-5 h-5" />
          <span className="font-bold">{comments?.length || 0}</span>
        </Button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="border-t border-border">
          <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
            {comments && comments.length > 0 ? (
              comments.map((comment: any) => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={comment.profiles.avatar_url || undefined}
                      alt={comment.profiles.username}
                    />
                    <AvatarFallback className="text-xs bg-gradient-primary text-primary-foreground">
                      {comment.profiles.username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-bold">
                        {comment.profiles.display_name || comment.profiles.username}
                      </span>{" "}
                      <span className="text-muted-foreground">{comment.content}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(comment.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No comments yet. Be the first to comment!
              </p>
            )}
          </div>

          {/* Comment Input */}
          {user ? (
            <div className="p-4 border-t border-border flex gap-2">
              <Input
                placeholder="Add a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleComment()}
                maxLength={500}
              />
              <Button
                size="icon"
                onClick={handleComment}
                disabled={!commentText.trim() || commentMutation.isPending}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="p-4 border-t border-border text-center">
              <Button variant="outline" onClick={() => navigate("/auth")}>
                Sign in to comment
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Metadata */}
      <div className="px-4 py-3 border-t border-border text-sm text-muted-foreground">
        {new Date(submission.submitted_at).toLocaleString()}
      </div>
    </Card>
  );
};