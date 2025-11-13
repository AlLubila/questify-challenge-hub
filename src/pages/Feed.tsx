import { Header } from "@/components/Header";
import { SubmissionCard } from "@/components/SubmissionCard";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { SubmissionCardSkeleton } from "@/components/skeletons/SubmissionCardSkeleton";
import { SearchBar } from "@/components/SearchBar";
import { useDebounce } from "@/hooks/useDebounce";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import PullToRefresh from "react-simple-pull-to-refresh";
import { UserRecommendations } from "@/components/UserRecommendations";
import { WeeklyTopPerformers } from "@/components/WeeklyTopPerformers";
import { AchievementsShowcase } from "@/components/AchievementsShowcase";

const ITEMS_PER_PAGE = 10;

const Feed = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  
  const boostSuccess = searchParams.get("boost_success");
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    const processPaymentSuccess = async () => {
      if (boostSuccess === "true" && sessionId) {
        try {
          const { error } = await supabase.functions.invoke("process-payment-success", {
            body: { sessionId },
          });
          
          if (error) throw error;
          
          toast.success("Boost Applied Successfully! ⚡", {
            description: "Your submission visibility has been increased!",
          });
        } catch (error) {
          console.error("Error processing payment:", error);
        } finally {
          // Clear the URL parameters
          searchParams.delete("boost_success");
          searchParams.delete("session_id");
          setSearchParams(searchParams);
        }
      }
    };

    processPaymentSuccess();
  }, [boostSuccess, sessionId, searchParams, setSearchParams]);
  
  // All submissions infinite query
  const {
    data: submissionsData,
    isLoading,
    fetchNextPage: fetchNextSubmissions,
    hasNextPage: hasMoreSubmissions,
    isFetchingNextPage: isFetchingMoreSubmissions,
    refetch: refetchSubmissions,
  } = useInfiniteQuery({
    queryKey: ["feed-submissions", debouncedSearch],
    queryFn: async ({ pageParam = 0 }) => {
      let query = supabase
        .from("submissions")
        .select(`
          *,
          profiles (
            id,
            username,
            display_name,
            avatar_url
          ),
          challenges (
            id,
            title,
            difficulty,
            points
          )
        `, { count: 'exact' })
        .eq("status", "approved")
        .order("submitted_at", { ascending: false })
        .range(pageParam, pageParam + ITEMS_PER_PAGE - 1);

      // Apply search filter
      if (debouncedSearch) {
        query = query.or(`caption.ilike.%${debouncedSearch}%,profiles.username.ilike.%${debouncedSearch}%,profiles.display_name.ilike.%${debouncedSearch}%,challenges.title.ilike.%${debouncedSearch}%`);
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

  // Following submissions infinite query
  const {
    data: followingData,
    isLoading: followingLoading,
    fetchNextPage: fetchNextFollowing,
    hasNextPage: hasMoreFollowing,
    isFetchingNextPage: isFetchingMoreFollowing,
    refetch: refetchFollowing,
  } = useInfiniteQuery({
    queryKey: ["following-submissions", user?.id, debouncedSearch],
    queryFn: async ({ pageParam = 0 }) => {
      if (!user) return { data: [], count: 0, nextPage: 0 };
      
      // First, get the list of users the current user follows
      const { data: follows, error: followsError } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);
      
      if (followsError) throw followsError;
      
      if (!follows || follows.length === 0) return { data: [], count: 0, nextPage: 0 };
      
      const followingIds = follows.map((f) => f.following_id);
      
      // Then get submissions from those users
      let query = supabase
        .from("submissions")
        .select(`
          *,
          profiles (
            id,
            username,
            display_name,
            avatar_url
          ),
          challenges (
            id,
            title,
            difficulty,
            points
          )
        `, { count: 'exact' })
        .eq("status", "approved")
        .in("user_id", followingIds)
        .order("submitted_at", { ascending: false })
        .range(pageParam, pageParam + ITEMS_PER_PAGE - 1);

      // Apply search filter
      if (debouncedSearch) {
        query = query.or(`caption.ilike.%${debouncedSearch}%,profiles.username.ilike.%${debouncedSearch}%,profiles.display_name.ilike.%${debouncedSearch}%,challenges.title.ilike.%${debouncedSearch}%`);
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
    enabled: !!user,
  });

  const submissions = submissionsData?.pages.flatMap((page) => page.data) || [];
  const followingSubmissions = followingData?.pages.flatMap((page) => page.data) || [];

  const loadMoreRefDiscover = useInfiniteScroll({
    loading: isFetchingMoreSubmissions,
    hasMore: hasMoreSubmissions || false,
    onLoadMore: fetchNextSubmissions,
  });

  const loadMoreRefFollowing = useInfiniteScroll({
    loading: isFetchingMoreFollowing,
    hasMore: hasMoreFollowing || false,
    onLoadMore: fetchNextFollowing,
  });

  const handleRefresh = async () => {
    await Promise.all([
      refetchSubmissions(),
      refetchFollowing(),
    ]);
  };

  return (
    <PullToRefresh onRefresh={handleRefresh} pullingContent="">
      <div className="min-h-screen bg-background">
        <Header />

        <div className="container py-8 space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold">Community Feed</h1>
            <p className="text-muted-foreground text-lg">
              Discover amazing creations from talented creators
            </p>
          </div>

          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by username, challenge, or caption..."
            className="max-w-2xl mx-auto"
          />

          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div>
              <Tabs defaultValue="discover" className="w-full">
                <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
                  <TabsTrigger value="discover">Discover</TabsTrigger>
                  <TabsTrigger value="following" disabled={!user}>
                    Following
                  </TabsTrigger>
                </TabsList>

            <TabsContent value="discover" className="space-y-6 mt-8">
              {isLoading ? (
                <div className="max-w-2xl mx-auto space-y-6">
                  {[1, 2, 3].map((i) => (
                    <SubmissionCardSkeleton key={i} />
                  ))}
                </div>
              ) : submissions && submissions.length > 0 ? (
                <div className="max-w-2xl mx-auto space-y-6">
                  {submissions.map((submission: any) => (
                    <SubmissionCard key={submission.id} submission={submission} />
                  ))}
                  
                  {/* Infinite scroll trigger */}
                  <div ref={loadMoreRefDiscover} className="py-4">
                    {isFetchingMoreSubmissions && (
                      <div className="flex justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="max-w-2xl mx-auto">
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Sparkles className="w-16 h-16 mb-4 text-muted-foreground" />
                    <h3 className="text-xl font-bold mb-2">
                      {debouncedSearch ? "No results found" : "No submissions yet"}
                    </h3>
                    <p className="text-muted-foreground">
                      {debouncedSearch
                        ? "Try adjusting your search"
                        : "Be the first to submit an entry to a challenge!"}
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="following" className="space-y-6 mt-8">
              {followingLoading ? (
                <div className="max-w-2xl mx-auto space-y-6">
                  {[1, 2, 3].map((i) => (
                    <SubmissionCardSkeleton key={i} />
                  ))}
                </div>
              ) : followingSubmissions && followingSubmissions.length > 0 ? (
                <div className="max-w-2xl mx-auto space-y-6">
                  {followingSubmissions.map((submission: any) => (
                    <SubmissionCard key={submission.id} submission={submission} />
                  ))}
                  
                  {/* Infinite scroll trigger */}
                  <div ref={loadMoreRefFollowing} className="py-4">
                    {isFetchingMoreFollowing && (
                      <div className="flex justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="max-w-2xl mx-auto">
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Sparkles className="w-16 h-16 mb-4 text-muted-foreground" />
                    <h3 className="text-xl font-bold mb-2">
                      {debouncedSearch ? "No results found" : "No submissions from followed users"}
                    </h3>
                    <p className="text-muted-foreground">
                      {debouncedSearch
                        ? "Try adjusting your search"
                        : "Follow creators to see their latest submissions here!"}
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

            <div className="hidden lg:block space-y-6 sticky top-6 h-fit">
          <WeeklyTopPerformers />
          <AchievementsShowcase />
          <UserRecommendations />
        </div>
      </div>
        </div>
      </div>
    </PullToRefresh>
  );
};

export default Feed;