import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle, XCircle, Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const SubmissionModeration = () => {
  const queryClient = useQueryClient();

  const { data: submissions, isLoading } = useQuery({
    queryKey: ["adminSubmissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("submissions")
        .select(`
          *,
          profiles:user_id(username, display_name),
          challenges:challenge_id(title)
        `)
        .order("submitted_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({
      submissionId,
      status,
    }: {
      submissionId: string;
      status: string;
    }) => {
      const { error } = await supabase
        .from("submissions")
        .update({ status })
        .eq("id", submissionId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["adminSubmissions"] });
      toast.success(
        `Submission ${variables.status === "approved" ? "approved" : "rejected"}`
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update submission");
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Submission Moderation</h1>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const pendingSubmissions = submissions?.filter((s) => s.status === "pending") || [];
  const approvedSubmissions = submissions?.filter((s) => s.status === "approved") || [];
  const rejectedSubmissions = submissions?.filter((s) => s.status === "rejected") || [];

  const SubmissionCard = ({ submission }: { submission: any }) => (
    <Card key={submission.id}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">
              {submission.challenges?.title || "Unknown Challenge"}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              By {submission.profiles?.display_name || submission.profiles?.username}
            </p>
          </div>
          <Badge
            variant={
              submission.status === "approved"
                ? "default"
                : submission.status === "rejected"
                ? "destructive"
                : "secondary"
            }
          >
            {submission.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {submission.content_url && (
          <img
            src={submission.content_url}
            alt="Submission"
            className="w-full h-48 object-cover rounded-md"
          />
        )}
        {submission.caption && (
          <p className="text-sm">{submission.caption}</p>
        )}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Eye className="h-4 w-4" />
          <span>{submission.votes} votes</span>
          {submission.boost_level !== "none" && (
            <Badge variant="outline" className="ml-2">
              Boosted: {submission.boost_level}
            </Badge>
          )}
        </div>
        {submission.status === "pending" && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={() =>
                updateStatus.mutate({
                  submissionId: submission.id,
                  status: "approved",
                })
              }
              disabled={updateStatus.isPending}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() =>
                updateStatus.mutate({
                  submissionId: submission.id,
                  status: "rejected",
                })
              }
              disabled={updateStatus.isPending}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Reject
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Submission Moderation</h1>
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({pendingSubmissions.length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({approvedSubmissions.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({rejectedSubmissions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 mt-4">
          {pendingSubmissions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No pending submissions
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pendingSubmissions.map((submission) => (
                <SubmissionCard key={submission.id} submission={submission} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {approvedSubmissions.map((submission) => (
              <SubmissionCard key={submission.id} submission={submission} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rejectedSubmissions.map((submission) => (
              <SubmissionCard key={submission.id} submission={submission} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
