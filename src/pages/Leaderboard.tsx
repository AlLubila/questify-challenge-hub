import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Medal, Award, Heart, MessageCircle, Crown, Users } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { LeaderboardItemSkeleton } from "@/components/skeletons/LeaderboardItemSkeleton";
import { SearchBar } from "@/components/SearchBar";
import { useDebounce } from "@/hooks/useDebounce";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PullToRefresh from "react-simple-pull-to-refresh";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ChallengeLeaderEntry {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  total_votes: number;
  total_comments: number;
  score: number;
}

const Leaderboard = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChallenge, setSelectedChallenge] = useState<string>("all");
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Fetch completed challenges (end_date < now)
  const { data: completedChallenges } = useQuery({
    queryKey: ["completed-challenges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select("id, title, end_date")
        .lt("end_date", new Date().toISOString())
        .order("end_date", { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch leaderboard based on votes and comments for completed challenges
  const {
    data: leaderboardData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["challenge-leaderboard", selectedChallenge, debouncedSearch],
    queryFn: async () => {
      // Build base query to get submissions with their votes and comments count
      let query = supabase
        .from("submissions")
        .select(`
          id,
          user_id,
          votes,
          challenge_id,
          profiles!inner (
            id,
            username,
            display_name,
            avatar_url
          ),
          challenges!inner (
            id,
            title,
            end_date
          )
        `)
        .eq("status", "approved")
        .lt("challenges.end_date", new Date().toISOString());

      // Filter by specific challenge if selected
      if (selectedChallenge !== "all") {
        query = query.eq("challenge_id", selectedChallenge);
      }

      const { data: submissions, error } = await query;
      if (error) throw error;

      // Get comment counts for each submission
      const submissionIds = submissions?.map(s => s.id) || [];
      const { data: commentCounts } = await supabase
        .from("comments")
        .select("submission_id")
        .in("submission_id", submissionIds);

      // Count comments per submission
      const commentCountMap: Record<string, number> = {};
      commentCounts?.forEach(c => {
        commentCountMap[c.submission_id] = (commentCountMap[c.submission_id] || 0) + 1;
      });

      // Aggregate by user
      const userScores: Record<string, ChallengeLeaderEntry> = {};
      
      submissions?.forEach((sub: any) => {
        const userId = sub.user_id;
        const votes = sub.votes || 0;
        const comments = commentCountMap[sub.id] || 0;
        
        if (!userScores[userId]) {
          userScores[userId] = {
            user_id: userId,
            username: sub.profiles.username,
            display_name: sub.profiles.display_name,
            avatar_url: sub.profiles.avatar_url,
            total_votes: 0,
            total_comments: 0,
            score: 0,
          };
        }
        
        userScores[userId].total_votes += votes;
        userScores[userId].total_comments += comments;
        // Score = votes * 2 + comments (votes weighted more)
        userScores[userId].score += (votes * 2) + comments;
      });

      // Convert to array and sort by score
      let leaderboard = Object.values(userScores)
        .sort((a, b) => b.score - a.score);

      // Apply search filter
      if (debouncedSearch) {
        const searchLower = debouncedSearch.toLowerCase();
        leaderboard = leaderboard.filter(entry =>
          entry.username?.toLowerCase().includes(searchLower) ||
          entry.display_name?.toLowerCase().includes(searchLower)
        );
      }

      return leaderboard;
    },
  });

  // Find current user's rank
  const currentUserRank = leaderboardData?.findIndex(entry => entry.user_id === user?.id);
  const currentUserEntry = currentUserRank !== undefined && currentUserRank >= 0 
    ? leaderboardData?.[currentUserRank] 
    : null;
  const totalParticipants = leaderboardData?.length || 0;

  const handleRefresh = async () => {
    await refetch();
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const renderLeaderboard = () => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <LeaderboardItemSkeleton key={i} />
          ))}
        </div>
      );
    }

    const top10 = leaderboardData?.slice(0, 10) || [];

    if (top10.length === 0) {
      return (
        <Card className="p-12 text-center">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-bold mb-2">
            {debouncedSearch ? "No results found" : "No rankings yet"}
          </h3>
          <p className="text-muted-foreground">
            {debouncedSearch 
              ? "Try adjusting your search" 
              : "Complete challenges to appear on the leaderboard!"}
          </p>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {/* Current user rank card (if not in top 10) */}
        {user && currentUserEntry && currentUserRank !== undefined && currentUserRank >= 10 && (
          <Card className="p-4 bg-primary/10 border-primary/30 mb-6">
            <div className="text-center mb-3">
              <Badge variant="secondary" className="mb-2">Your Ranking</Badge>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 flex items-center justify-center">
                <span className="text-lg font-bold text-primary">#{currentUserRank + 1}</span>
              </div>
              <Avatar className="h-12 w-12">
                <AvatarImage src={currentUserEntry.avatar_url || undefined} alt={currentUserEntry.username} />
                <AvatarFallback>{currentUserEntry.username?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-semibold">{currentUserEntry.display_name || currentUserEntry.username}</h3>
                <p className="text-sm text-muted-foreground">@{currentUserEntry.username}</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex items-center gap-1">
                    <Heart className="w-4 h-4 text-red-500" />
                    {currentUserEntry.total_votes}
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageCircle className="w-4 h-4 text-blue-500" />
                    {currentUserEntry.total_comments}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  on {totalParticipants} participants
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Top 10 header */}
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-lg">Top 10</h3>
          <Badge variant="outline" className="ml-auto">
            <Users className="w-3 h-3 mr-1" />
            {totalParticipants} participants
          </Badge>
        </div>

        {/* Top 10 list */}
        {top10.map((entry, index) => {
          const rank = index + 1;
          const isTopThree = rank <= 3;
          const isCurrentUser = entry.user_id === user?.id;

          return (
            <Card
              key={entry.user_id}
              className={`p-4 transition-all hover:shadow-lg cursor-pointer ${
                isTopThree ? "border-2 border-primary/50 bg-gradient-to-r from-primary/5 to-transparent" : ""
              } ${isCurrentUser ? "ring-2 ring-primary" : ""}`}
              onClick={() => navigate(`/profile?userId=${entry.user_id}`)}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 flex items-center justify-center">
                  {getRankIcon(rank)}
                </div>

                <Avatar className="h-12 w-12">
                  <AvatarImage src={entry.avatar_url || undefined} alt={entry.username} />
                  <AvatarFallback>{entry.username?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">{entry.display_name || entry.username}</h3>
                    {isCurrentUser && <Badge variant="secondary" className="text-xs">You</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">@{entry.username}</p>
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="flex items-center gap-1 text-red-500">
                      <Heart className="w-4 h-4 fill-current" />
                      <span className="font-bold">{entry.total_votes}</span>
                    </div>
                    <div className="flex items-center gap-1 text-blue-500">
                      <MessageCircle className="w-4 h-4" />
                      <span className="font-bold">{entry.total_comments}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Score: {entry.score}
                  </Badge>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <PullToRefresh onRefresh={handleRefresh} pullingContent="">
      <div className="min-h-screen bg-background">
        <Header />

        <div className="container py-8 space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold">Challenge Leaderboard</h1>
            <p className="text-muted-foreground text-lg">
              Top performers based on votes and engagement
            </p>
          </div>

          <div className="max-w-2xl mx-auto space-y-4">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search by username..."
            />

            <Select value={selectedChallenge} onValueChange={setSelectedChallenge}>
              <SelectTrigger>
                <SelectValue placeholder="Select a challenge" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Completed Challenges</SelectItem>
                {completedChallenges?.map((challenge) => (
                  <SelectItem key={challenge.id} value={challenge.id}>
                    {challenge.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="max-w-4xl mx-auto">
            {renderLeaderboard()}
          </div>

          {/* Explanation card */}
          <Card className="max-w-2xl mx-auto p-6 bg-muted/50">
            <h4 className="font-bold mb-2 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              How the Leaderboard Works
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Rankings are based on completed challenges only</li>
              <li>• Score = (Likes × 2) + Comments</li>
              <li>• Only the Top 10 are displayed publicly</li>
              <li>• Your personal rank shows your position among all participants</li>
            </ul>
          </Card>
        </div>
      </div>
    </PullToRefresh>
  );
};

export default Leaderboard;
