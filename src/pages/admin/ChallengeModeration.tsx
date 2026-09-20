import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Pencil, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

type UserRole = "admin" | "moderator" | "user";
type ChallengeRow = Database["public"]["Tables"]["challenges"]["Row"];

const emptyEditForm = {
  title: "",
  description: "",
  prize: "",
  points: "",
  difficulty: "medium" as "easy" | "medium" | "hard",
  publishStatus: "published" as "published" | "scheduled" | "draft",
  imageUrl: "",
};

export const ChallengeModeration = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingChallenge, setEditingChallenge] = useState<ChallengeRow | null>(null);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [deleteTarget, setDeleteTarget] = useState<{ ids: string[]; label: string } | null>(null);

  const { data: challenges, isLoading } = useQuery({
    queryKey: ["allChallenges"],
    queryFn: async () => {
      const { data: challengesData, error: challengesError } = await supabase
        .from("challenges")
        .select("*")
        .order("created_at", { ascending: false });

      if (challengesError) throw challengesError;

      const creatorIds = challengesData
        .map((c) => c.created_by)
        .filter((id) => id !== null);

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, display_name")
        .in("id", creatorIds);

      if (profilesError) throw profilesError;

      return challengesData.map((challenge) => ({
        ...challenge,
        profiles: profiles?.find((p) => p.id === challenge.created_by) || null,
      }));
    },
  });

  const logActivity = async (actionType: string, targetId: string, reason?: string) => {
    if (!user) return;
    
    await supabase.from("admin_activity_logs").insert({
      admin_id: user.id,
      action_type: actionType,
      target_type: "challenge",
      target_id: targetId,
      reason,
    });
  };

  const deleteChallenge = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("challenges").delete().in("id", ids);
      if (error) throw error;

      // Log activity for each challenge
      for (const id of ids) {
        await logActivity("delete_challenge", id, ids.length > 1 ? "Confirmed bulk deletion" : "Confirmed deletion");
      }
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ["allChallenges"] });
      setSelectedIds([]);
      setDeleteTarget(null);
      toast.success(`${ids.length} challenge(s) deleted successfully`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete challenge");
    },
  });

  const updateChallenge = useMutation({
    mutationFn: async () => {
      if (!editingChallenge) throw new Error("No challenge selected");
      const points = Number.parseInt(editForm.points, 10);
      if (!editForm.title.trim() || !editForm.description.trim() || !editForm.prize.trim()) {
        throw new Error("Title, description and prize are required");
      }
      if (!Number.isFinite(points) || points < 0) {
        throw new Error("Points must be zero or greater");
      }

      const { error } = await supabase
        .from("challenges")
        .update({
          title: editForm.title.trim(),
          description: editForm.description.trim(),
          prize: editForm.prize.trim(),
          points,
          difficulty: editForm.difficulty,
          publish_status: editForm.publishStatus,
          image_url: editForm.imageUrl.trim() || null,
        })
        .eq("id", editingChallenge.id);
      if (error) throw error;

      await logActivity("update_challenge", editingChallenge.id, "Challenge edited from admin panel");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allChallenges"] });
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
      setEditingChallenge(null);
      toast.success("Challenge updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update challenge");
    },
  });

  const openEditDialog = (challenge: ChallengeRow) => {
    const difficulty =
      challenge.difficulty === "easy" || challenge.difficulty === "hard"
        ? challenge.difficulty
        : "medium";
    const publishStatus =
      challenge.publish_status === "scheduled" || challenge.publish_status === "draft"
        ? challenge.publish_status
        : "published";

    setEditingChallenge(challenge);
    setEditForm({
      title: challenge.title,
      description: challenge.description,
      prize: challenge.prize,
      points: String(challenge.points),
      difficulty,
      publishStatus,
      imageUrl: challenge.image_url ?? "",
    });
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === (challenges?.length || 0)) {
      setSelectedIds([]);
    } else {
      setSelectedIds(challenges?.map((c) => c.id) || []);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Challenge Moderation</h1>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Challenge Moderation</h1>
        {selectedIds.length > 0 && (
          <Button
            variant="destructive"
            onClick={() => setDeleteTarget({
              ids: selectedIds,
              label: `${selectedIds.length} selected challenges`,
            })}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Selected ({selectedIds.length})
          </Button>
        )}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Challenges</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedIds.length === challenges?.length && challenges.length > 0}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Creator</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead>Participants</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {challenges?.map((challenge) => (
                <TableRow key={challenge.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(challenge.id)}
                      onCheckedChange={() => toggleSelection(challenge.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{challenge.title}</TableCell>
                  <TableCell>
                    {challenge.is_ai_generated ? (
                      <Badge variant="secondary">AI Generated</Badge>
                    ) : (
                      challenge.profiles?.display_name ||
                      challenge.profiles?.username ||
                      "Unknown"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{challenge.challenge_type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        challenge.difficulty === "hard"
                          ? "destructive"
                          : challenge.difficulty === "medium"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {challenge.difficulty}
                    </Badge>
                  </TableCell>
                  <TableCell>{challenge.participants_count || 0}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEditDialog(challenge)}>
                        <Pencil className="mr-1 h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setDeleteTarget({ ids: [challenge.id], label: challenge.title })}
                      >
                        <Trash2 className="mr-1 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={editingChallenge !== null}
        onOpenChange={(open) => {
          if (!open && !updateChallenge.isPending) setEditingChallenge(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit challenge</DialogTitle>
            <DialogDescription>
              Update the challenge details. AI-generated challenges remain marked as AI-generated.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-challenge-title">Title</Label>
              <Input id="edit-challenge-title" value={editForm.title} maxLength={100} onChange={(event) => setEditForm((current) => ({ ...current, title: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-challenge-description">Description</Label>
              <Textarea id="edit-challenge-description" value={editForm.description} rows={5} maxLength={500} onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-challenge-prize">Prize</Label>
                <Input id="edit-challenge-prize" value={editForm.prize} maxLength={50} onChange={(event) => setEditForm((current) => ({ ...current, prize: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-challenge-points">Points</Label>
                <Input id="edit-challenge-points" type="number" min="0" max="10000" value={editForm.points} onChange={(event) => setEditForm((current) => ({ ...current, points: event.target.value }))} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select value={editForm.difficulty} onValueChange={(value: "easy" | "medium" | "hard") => setEditForm((current) => ({ ...current, difficulty: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Publication status</Label>
                <Select value={editForm.publishStatus} onValueChange={(value: "published" | "scheduled" | "draft") => setEditForm((current) => ({ ...current, publishStatus: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-challenge-image">Image URL</Label>
              <Input id="edit-challenge-image" type="url" value={editForm.imageUrl} onChange={(event) => setEditForm((current) => ({ ...current, imageUrl: event.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingChallenge(null)} disabled={updateChallenge.isPending}>Cancel</Button>
            <Button onClick={() => updateChallenge.mutate()} disabled={updateChallenge.isPending}>
              {updateChallenge.isPending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deleteChallenge.isPending) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete challenge?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `Permanently delete ${deleteTarget.label}? This action cannot be undone.`
                : "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteChallenge.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!deleteTarget || deleteChallenge.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (deleteTarget) deleteChallenge.mutate(deleteTarget.ids);
              }}
            >
              {deleteChallenge.isPending ? "Deleting…" : "Yes, delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
