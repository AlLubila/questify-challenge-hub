import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Trophy, Plus, Loader2, UserPlus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const RewardsManagement = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedBadgeId, setSelectedBadgeId] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [newBadge, setNewBadge] = useState({
    name: "",
    description: "",
    criteria: "",
    icon: "",
  });

  // Fetch existing badges
  const { data: badges, isLoading } = useQuery({
    queryKey: ["admin-badges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("badges")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch users for badge assignment
  const { data: users } = useQuery({
    queryKey: ["admin-users-for-badges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name")
        .order("username");
      
      if (error) throw error;
      return data;
    },
  });

  // Create badge mutation
  const createBadge = useMutation({
    mutationFn: async () => {
      if (!newBadge.name || !newBadge.description || !newBadge.criteria) {
        throw new Error("Please fill in all required fields");
      }

      const { error } = await supabase.from("badges").insert({
        name: newBadge.name,
        description: newBadge.description,
        criteria: newBadge.criteria,
        icon: newBadge.icon || "🏆",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-badges"] });
      toast.success("Badge created successfully!");
      setIsDialogOpen(false);
      setNewBadge({ name: "", description: "", criteria: "", icon: "" });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Assign badge mutation
  const assignBadge = useMutation({
    mutationFn: async () => {
      if (!selectedBadgeId || !selectedUserId) {
        throw new Error("Please select both a badge and a user");
      }

      const { error } = await supabase.from("user_badges").insert({
        badge_id: selectedBadgeId,
        user_id: selectedUserId,
      });

      if (error) {
        if (error.code === "23505") {
          throw new Error("User already has this badge");
        }
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("Badge assigned successfully!");
      setIsAssignDialogOpen(false);
      setSelectedBadgeId("");
      setSelectedUserId("");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Popular reward templates
  const rewardTemplates = [
    { name: "Viral Star Badge", description: "Exclusive badge for trending creators", icon: "⭐" },
    { name: "Legend Title", description: "Legendary status with special profile highlight", icon: "🏆" },
    { name: "2x XP Boost", description: "Double XP for 7 days", icon: "⚡" },
    { name: "Gold Frame", description: "Golden profile frame effect", icon: "🌟" },
    { name: "Rainbow Effect", description: "Animated rainbow username effect", icon: "🌈" },
    { name: "Top Creator Spotlight", description: "Featured on homepage for 24 hours", icon: "🚀" },
  ];

  const useTemplate = (template: typeof rewardTemplates[0]) => {
    setNewBadge({
      name: template.name,
      description: template.description,
      criteria: "Awarded through challenge completion",
      icon: template.icon,
    });
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Rewards Management</h1>
          <p className="text-muted-foreground mt-1">Create and manage badges, titles, and profile effects</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <UserPlus className="w-4 h-4 mr-2" />
                Assign Badge
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Badge to User</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="badge">Select Badge *</Label>
                  <Select value={selectedBadgeId} onValueChange={setSelectedBadgeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a badge..." />
                    </SelectTrigger>
                    <SelectContent>
                      {badges?.map((badge) => (
                        <SelectItem key={badge.id} value={badge.id}>
                          {badge.icon} {badge.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="user">Select User *</Label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a user..." />
                    </SelectTrigger>
                    <SelectContent>
                      {users?.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.display_name || user.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => assignBadge.mutate()}
                  disabled={assignBadge.isPending}
                  className="w-full"
                >
                  {assignBadge.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Assign Badge
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary">
                <Plus className="w-4 h-4 mr-2" />
                Create Reward
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Reward</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Reward Name *</Label>
                  <Input
                    id="name"
                    value={newBadge.name}
                    onChange={(e) => setNewBadge({ ...newBadge, name: e.target.value })}
                    placeholder="e.g., Viral Star Badge"
                    maxLength={50}
                  />
                </div>
                <div>
                  <Label htmlFor="icon">Icon/Emoji</Label>
                  <Input
                    id="icon"
                    value={newBadge.icon}
                    onChange={(e) => setNewBadge({ ...newBadge, icon: e.target.value })}
                    placeholder="🏆"
                    maxLength={10}
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={newBadge.description}
                    onChange={(e) => setNewBadge({ ...newBadge, description: e.target.value })}
                    placeholder="Exclusive badge for trending creators"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="criteria">Award Criteria *</Label>
                  <Textarea
                    id="criteria"
                    value={newBadge.criteria}
                    onChange={(e) => setNewBadge({ ...newBadge, criteria: e.target.value })}
                    placeholder="e.g., Complete 5 viral challenges"
                    rows={2}
                  />
                </div>
                <Button
                  onClick={() => createBadge.mutate()}
                  disabled={createBadge.isPending}
                  className="w-full"
                >
                  {createBadge.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Reward
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Reward Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Popular Reward Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rewardTemplates.map((template, index) => (
              <Card key={index} className="border-border hover:shadow-glow transition-all">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-3xl">{template.icon}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => useTemplate(template)}
                    >
                      Use Template
                    </Button>
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{template.name}</h3>
                  <p className="text-sm text-muted-foreground">{template.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Existing Rewards */}
      <Card>
        <CardHeader>
          <CardTitle>Existing Rewards ({badges?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {badges && badges.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              {badges.map((badge) => (
                <Card key={badge.id} className="border-border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <span className="text-3xl">{badge.icon || "🏆"}</span>
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground mb-1">{badge.name}</h3>
                          <p className="text-sm text-muted-foreground mb-2">{badge.description}</p>
                          <p className="text-xs text-muted-foreground">
                            <strong>Criteria:</strong> {badge.criteria}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Trophy className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No rewards created yet. Start by creating your first reward!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
