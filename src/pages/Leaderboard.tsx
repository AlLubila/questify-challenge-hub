import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Medal, Award, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { LeaderboardItemSkeleton } from "@/components/skeletons/LeaderboardItemSkeleton";
import { SearchBar } from "@/components/SearchBar";
import { useDebounce } from "@/hooks/useDebounce";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PullToRefresh from "react-simple-pull-to-refresh";

const ITEMS_PER_PAGE = 20;

const Leaderboard = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  const {
    data: leaderboardData,
    isLoading: allTimeLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["leaderboard", "all-time", debouncedSearch],
    queryFn: async ({ pageParam = 0 }) => {
      // Use public_profiles view to access only non-sensitive profile data
      let query = supabase
        .from("public_profiles")
        .select("id, username, display_name, avatar_url, points, xp, level", { count: 'exact' })
        .order("points", { ascending: false })
        .range(pageParam, pageParam + ITEMS_PER_PAGE - 1);

      // Apply search filter
      if (debouncedSearch) {
        query = query.or(`username.ilike.%${debouncedSearch}%,display_name.ilike.%${debouncedSearch}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { data, count, nextPage: pageParam + ITEMS_PER_PAGE };
    },
    getNextPageParam: (lastPage, allPages) => {
      const totalFetched = allPages.reduce((acc, page) => acc + page.data.length, 0);
      return totalFetched < (lastPage.count || 0) ? lastPage.nextPage : undefined;
    },
    initialPageParam: 0,
  });

  const allTimeLeaders = leaderboardData?.pages.flatMap((page) => page.data) || [];

  const loadMoreRef = useInfiniteScroll({
    loading: isFetchingNextPage,
    hasMore: hasNextPage || false,
    onLoadMore: fetchNextPage,
  });

  const handleRefresh = async () => {
    await refetch();
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const renderLeaderboard = (leaders: any[] | undefined, loading: boolean) => {
    if (loading) {
      return (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <LeaderboardItemSkeleton key={i} />
          ))}
        </div>
      );
    }

    if (!leaders || leaders.length === 0) {
      return (
        <Card className="p-12 text-center">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-bold mb-2">
            {debouncedSearch ? "No results found" : t("leaderboard.noRankings")}
          </h3>
          <p className="text-muted-foreground">
            {debouncedSearch ? "Try adjusting your search" : t("leaderboard.beFirstToEarn")}
          </p>
        </Card>
      );
    }

    return (
      <div className="space-y-3">
        {leaders.map((profile, index) => {
          const rank = index + 1;
          const isTopThree = rank <= 3;

          return (
            <Card
              key={profile.id}
              className={`p-4 transition-all hover:shadow-lg cursor-pointer ${
                isTopThree ? "border-2 border-primary/50 bg-gradient-to-r from-primary/5 to-transparent" : ""
              }`}
              onClick={() => navigate(`/profile/${profile.id}`)}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 flex items-center justify-center">
                  {getRankIcon(rank)}
                </div>

                <Avatar className="h-12 w-12">
                  <AvatarImage src={profile.avatar_url} alt={profile.username} />
                  <AvatarFallback>{profile.username?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{profile.display_name || profile.username}</h3>
                  <p className="text-sm text-muted-foreground">@{profile.username}</p>
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-1 text-lg font-bold text-primary mb-1">
                    <Trophy className="w-5 h-5" />
                    {profile.points.toLocaleString()}
                  </div>
                  <Badge variant="secondary">Level {profile.level}</Badge>
                </div>
              </div>
            </Card>
          );
        })}

        {/* Infinite scroll trigger */}
        <div ref={loadMoreRef} className="py-4">
          {isFetchingNextPage && (
            <div className="flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <PullToRefresh onRefresh={handleRefresh} pullingContent="">
      <div className="min-h-screen bg-background">
        <Header />

        <div className="container py-8 space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold">Leaderboard</h1>
            <p className="text-muted-foreground text-lg">
              Top creators competing for glory and prizes
            </p>
          </div>

          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by username..."
            className="max-w-2xl mx-auto"
          />

          <Tabs defaultValue="all-time" className="w-full max-w-4xl mx-auto">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="all-time">All Time</TabsTrigger>
            </TabsList>

            <TabsContent value="daily" className="space-y-4 mt-6">
              <Card className="p-8 text-center">
                <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-bold mb-2">Coming Soon</h3>
                <p className="text-muted-foreground">
                  Daily rankings will be available soon!
                </p>
              </Card>
            </TabsContent>

            <TabsContent value="weekly" className="space-y-4 mt-6">
              <Card className="p-8 text-center">
                <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-bold mb-2">Coming Soon</h3>
                <p className="text-muted-foreground">
                  Weekly rankings will be available soon!
                </p>
              </Card>
            </TabsContent>

            <TabsContent value="all-time" className="space-y-4 mt-6">
              {renderLeaderboard(allTimeLeaders, allTimeLoading)}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </PullToRefresh>
  );
};

export default Leaderboard;