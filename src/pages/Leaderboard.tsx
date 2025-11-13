import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Medal, Award } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const Leaderboard = () => {
  const { t } = useLanguage();
  const { data: allTimeLeaders, isLoading: allTimeLoading } = useQuery({
    queryKey: ["leaderboard", "all-time"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, points, xp, level")
        .order("points", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

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
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (!leaders || leaders.length === 0) {
      return (
        <Card className="p-12 text-center">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-bold mb-2">{t("leaderboard.noRankings")}</h3>
          <p className="text-muted-foreground">{t("leaderboard.beFirstToEarn")}</p>
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
              className={`p-4 transition-all hover:shadow-lg ${
                isTopThree ? "border-2 border-primary/50 bg-gradient-to-r from-primary/5 to-transparent" : ""
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 flex items-center justify-center">
                  {getRankIcon(rank)}
                </div>

                <Avatar className="h-12 w-12">
                  <AvatarImage src={profile.avatar_url || undefined} alt={profile.username} />
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                    {profile.username.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">
                    {profile.display_name || profile.username}
                  </p>
                  <p className="text-sm text-muted-foreground">@{profile.username}</p>
                </div>

                <div className="text-right space-y-1">
                  <Badge variant="secondary" className="font-bold">
                    {profile.points.toLocaleString()} {t("leaderboard.pts")}
                  </Badge>
                  <p className="text-xs text-muted-foreground">{t("profile.level")} {profile.level}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container py-8 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Leaderboard</h1>
          <p className="text-muted-foreground text-lg">
            Top creators competing for glory and prizes
          </p>
        </div>

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
  );
};

export default Leaderboard;