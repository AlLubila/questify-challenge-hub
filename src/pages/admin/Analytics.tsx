import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, FileText, Trophy, DollarSign } from "lucide-react";
import { StatsCard } from "@/components/StatsCard";

export const Analytics = () => {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["adminAnalytics"],
    queryFn: async () => {
      // Get daily active users (users created in last 24 hours)
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      const { count: dailyUsers, error: usersError } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", oneDayAgo.toISOString());

      if (usersError) throw usersError;

      // Get submission stats
      const { data: submissions, error: submissionsError } = await supabase
        .from("submissions")
        .select("id, votes, submitted_at");

      if (submissionsError) throw submissionsError;

      // Get submissions in last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const weeklySubmissions = submissions?.filter(
        (s) => new Date(s.submitted_at) >= sevenDaysAgo
      ).length || 0;

      // Get challenge participation
      const { data: challenges, error: challengesError } = await supabase
        .from("challenges")
        .select("participants_count");

      if (challengesError) throw challengesError;

      const totalParticipation = challenges?.reduce(
        (sum, c) => sum + (c.participants_count || 0),
        0
      ) || 0;

      // Get revenue from boosts
      const { data: boosts, error: boostsError } = await supabase
        .from("boost_purchases")
        .select("price_id, amount");

      if (boostsError) throw boostsError;

      const boostRevenue = boosts?.reduce((sum, b) => sum + (b.amount || 0), 0) || 0;

      // Get active subscriptions
      const { count: subscriptions, error: subsError } = await supabase
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true);

      if (subsError) throw subsError;

      // Estimate monthly subscription revenue ($5 per active subscription)
      const subscriptionRevenue = (subscriptions || 0) * 5;

      return {
        dailyActiveUsers: dailyUsers || 0,
        weeklySubmissions,
        totalParticipation,
        totalRevenue: (boostRevenue / 100) + subscriptionRevenue, // Convert cents to dollars
        activeSubscriptions: subscriptions || 0,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Analytics</h1>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Daily Active Users"
          value={analytics?.dailyActiveUsers.toString() || "0"}
          icon={Users}
          subtitle="New users in last 24h"
        />
        <StatsCard
          title="Weekly Submissions"
          value={analytics?.weeklySubmissions.toString() || "0"}
          icon={FileText}
          subtitle="Submissions in last 7 days"
        />
        <StatsCard
          title="Total Participation"
          value={analytics?.totalParticipation.toString() || "0"}
          icon={Trophy}
          subtitle="All-time challenge entries"
        />
        <StatsCard
          title="Total Revenue"
          value={`$${analytics?.totalRevenue.toFixed(2) || "0.00"}`}
          icon={DollarSign}
          subtitle={`${analytics?.activeSubscriptions || 0} active subscriptions`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Boost Tickets</span>
              <span className="font-semibold">Coming soon</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Creator Pass Subscriptions</span>
              <span className="font-semibold">
                {analytics?.activeSubscriptions || 0} active
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};