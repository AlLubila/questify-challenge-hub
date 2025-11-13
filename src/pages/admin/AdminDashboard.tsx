import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Trophy, FileCheck, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const AdminDashboard = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["adminStats"],
    queryFn: async () => {
      const [
        { count: totalUsers },
        { count: totalChallenges },
        { count: totalSubmissions },
        { count: pendingSubmissions },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("challenges").select("*", { count: "exact", head: true }),
        supabase.from("submissions").select("*", { count: "exact", head: true }),
        supabase
          .from("submissions")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),
      ]);

      return {
        totalUsers: totalUsers || 0,
        totalChallenges: totalChallenges || 0,
        totalSubmissions: totalSubmissions || 0,
        pendingSubmissions: pendingSubmissions || 0,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Users",
      value: stats?.totalUsers || 0,
      icon: Users,
      color: "text-blue-500",
    },
    {
      title: "Total Challenges",
      value: stats?.totalChallenges || 0,
      icon: Trophy,
      color: "text-yellow-500",
    },
    {
      title: "Total Submissions",
      value: stats?.totalSubmissions || 0,
      icon: FileCheck,
      color: "text-green-500",
    },
    {
      title: "Pending Submissions",
      value: stats?.pendingSubmissions || 0,
      icon: TrendingUp,
      color: "text-orange-500",
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
