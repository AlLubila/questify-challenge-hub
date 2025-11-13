import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

export const ActivityLogs = () => {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["adminActivityLogs"],
    queryFn: async () => {
      // First get the logs
      const { data: logsData, error: logsError } = await supabase
        .from("admin_activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (logsError) throw logsError;

      // Then get the profiles for admin_ids
      const adminIds = [...new Set(logsData.map(log => log.admin_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, display_name")
        .in("id", adminIds);

      if (profilesError) throw profilesError;

      // Merge profiles with logs
      return logsData.map(log => ({
        ...log,
        profiles: profiles?.find(p => p.id === log.admin_id) || null
      }));
    },
  });

  const getActionBadgeColor = (actionType: string) => {
    if (actionType.includes("approve")) return "default";
    if (actionType.includes("reject") || actionType.includes("delete")) return "destructive";
    if (actionType.includes("assign")) return "secondary";
    return "outline";
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Activity Logs</h1>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Activity Logs</h1>
      <Card>
        <CardHeader>
          <CardTitle>Recent Admin Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Admin</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs?.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">
                    {log.profiles?.display_name || log.profiles?.username || "Unknown"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getActionBadgeColor(log.action_type)}>
                      {log.action_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium">{log.target_type}</div>
                      <div className="text-muted-foreground text-xs">
                        {log.target_id?.slice(0, 8)}...
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {log.reason || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};