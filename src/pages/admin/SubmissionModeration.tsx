import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import type { Json } from "@/integrations/supabase/types";

export const SubmissionModeration = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: submissions, isLoading } = useQuery({
    queryKey: ["pendingSubmissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("submissions")
        .select(`
          *,
          profiles:user_id (username, display_name),
          challenges (title)
        `)
        .in("status", ["pending"])
        .order("submitted_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: flaggedSubmissions, isLoading: flaggedLoading } = useQuery({
    queryKey: ["flaggedSubmissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("submissions")
        .select(`
          *,
          profiles:user_id (username, display_name),
          challenges (title)
        `)
        .eq("moderation_status", "flagged")
        .order("submitted_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const logActivity = async (actionType: string, targetId: string, reason?: string) => {
    if (!user) return;
    
    await supabase.from("admin_activity_logs").insert({
      admin_id: user.id,
      action_type: actionType,
      target_type: "submission",
      target_id: targetId,
      reason,
    });
  };

  const updateStatus = useMutation({
    mutationFn: async ({ ids, status, reason }: { ids: string[]; status: string; reason?: string }) => {
      const reviewSnapshots = [...(submissions || []), ...(flaggedSubmissions || [])];
      const reviews = ids.map((id) => {
        const snapshot = reviewSnapshots.find((submission) => submission.id === id);
        if (!snapshot) {
          throw new Error("Submission is no longer in the review queue. Refresh and try again.");
        }
        return {
          id: snapshot.id,
          content_url: snapshot.content_url,
          caption: snapshot.caption,
          moderation_status: snapshot.moderation_status,
          moderation_flags: snapshot.moderation_flags,
        };
      });

      const { data: reviewedCount, error } = await supabase.rpc("moderate_submission_batch", {
        p_reviews: reviews as Json,
        p_status: status,
      });
      if (error) throw error;
      if (reviewedCount !== ids.length) {
        throw new Error("Not all submissions were moderated. Refresh and review the latest content.");
      }

      for (const id of ids) {
        await logActivity(
          status === "approved" ? "approve_submission" : "reject_submission",
          id,
          reason
        );
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pendingSubmissions"] });
      queryClient.invalidateQueries({ queryKey: ["flaggedSubmissions"] });
      setSelectedIds([]);
      toast.success(`${variables.ids.length} submission(s) updated successfully`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update submission");
    },
  });

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleAll = (items: any[]) => {
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map((i) => i.id));
    }
  };

  const renderSubmissionsTable = (items: any[], showFlags = false) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">
            <Checkbox
              checked={selectedIds.length === items.length && items.length > 0}
              onCheckedChange={() => toggleAll(items)}
            />
          </TableHead>
          <TableHead>User</TableHead>
          <TableHead>Challenge</TableHead>
          <TableHead>Caption</TableHead>
          {showFlags && <TableHead>Flags</TableHead>}
          <TableHead>Submitted</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items?.map((submission) => (
          <TableRow key={submission.id}>
            <TableCell>
              <Checkbox
                checked={selectedIds.includes(submission.id)}
                onCheckedChange={() => toggleSelection(submission.id)}
              />
            </TableCell>
            <TableCell className="font-medium">
              {submission.profiles?.display_name ||
                submission.profiles?.username ||
                "Unknown"}
            </TableCell>
            <TableCell>{submission.challenges?.title || "Unknown"}</TableCell>
            <TableCell className="max-w-xs truncate">
              {submission.caption || "—"}
            </TableCell>
            {showFlags && (
              <TableCell>
                {submission.moderation_flags && (
                  <div className="space-y-1">
                    <Badge variant="destructive" className="text-xs">
                      {Math.round((submission.moderation_flags as any).confidence * 100)}% confidence
                    </Badge>
                    <div className="text-xs text-muted-foreground">
                      {(submission.moderation_flags as any).categories?.join(", ")}
                    </div>
                  </div>
                )}
              </TableCell>
            )}
            <TableCell>
              {new Date(submission.submitted_at).toLocaleDateString()}
            </TableCell>
            <TableCell>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() =>
                    updateStatus.mutate({ ids: [submission.id], status: "approved" })
                  }
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() =>
                    updateStatus.mutate({ ids: [submission.id], status: "rejected" })
                  }
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  if (isLoading || flaggedLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Submission Moderation</h1>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Submission Moderation</h1>
        {selectedIds.length > 0 && (
          <div className="flex gap-2">
            <Button
              variant="default"
              onClick={() =>
                updateStatus.mutate({ ids: selectedIds, status: "approved" })
              }
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve Selected ({selectedIds.length})
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                updateStatus.mutate({ ids: selectedIds, status: "rejected" })
              }
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject Selected ({selectedIds.length})
            </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({submissions?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="flagged">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Flagged ({flaggedSubmissions?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Submissions</CardTitle>
            </CardHeader>
            <CardContent>
              {renderSubmissionsTable(submissions || [])}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="flagged">
          <Card>
            <CardHeader>
              <CardTitle>AI-Flagged Submissions</CardTitle>
            </CardHeader>
            <CardContent>
              {renderSubmissionsTable(flaggedSubmissions || [], true)}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
