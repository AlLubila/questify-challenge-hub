import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
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

type UserRole = "admin" | "moderator" | "user";

export const UserManagement = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [roleToRemove, setRoleToRemove] = useState<{
    userId: string;
    username: string;
    role: UserRole;
  } | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ["adminUsers"],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, display_name, created_at");

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      return profiles.map((profile) => ({
        ...profile,
        roles: roles
          .filter((r) => r.user_id === profile.id)
          .map((r) => r.role as UserRole),
      }));
    },
  });

  const logActivity = async (actionType: string, targetId: string, role: string) => {
    if (!user) return;
    
    await supabase.from("admin_activity_logs").insert({
      admin_id: user.id,
      action_type: actionType,
      target_type: "user",
      target_id: targetId,
      reason: `Role: ${role}`,
    });
  };

  const assignRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: UserRole }) => {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role });
      if (error) throw error;

      await logActivity("assign_role", userId, role);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      toast.success("Role assigned successfully");
      setSelectedUserId(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to assign role");
    },
  });

  const removeRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: UserRole }) => {
      if (userId === user?.id && role === "admin") {
        throw new Error("Your own administrator role is protected");
      }

      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);
      if (error) throw error;

      await logActivity("remove_role", userId, role);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      toast.success("Role removed successfully");
      setRoleToRemove(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to remove role");
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">User Management</h1>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">User Management</h1>
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Display Name</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((managedUser) => (
                <TableRow key={managedUser.id}>
                  <TableCell className="font-medium">{managedUser.username}</TableCell>
                  <TableCell>{managedUser.display_name || "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      {managedUser.roles.length === 0 ? (
                        <Badge variant="outline">user</Badge>
                      ) : (
                        managedUser.roles.map((role) => {
                          const isProtectedRole = role === "admin" && managedUser.id === user?.id;
                          return (
                            <div key={role} className="flex items-center gap-2">
                              <Badge variant={role === "admin" ? "default" : "secondary"}>
                                {role}
                              </Badge>
                              {isProtectedRole ? (
                                <span className="text-xs font-medium text-muted-foreground">Protected</span>
                              ) : (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setRoleToRemove({
                                    userId: managedUser.id,
                                    username: managedUser.username,
                                    role,
                                  })}
                                >
                                  Remove {role}
                                </Button>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(managedUser.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {selectedUserId === managedUser.id ? (
                      <div className="flex gap-2">
                        <Select
                          onValueChange={(role) =>
                            assignRole.mutate({ userId: managedUser.id, role: role as UserRole })
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="Add role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="moderator">Moderator</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedUserId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedUserId(managedUser.id)}
                      >
                        Assign Role
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <AlertDialog
        open={roleToRemove !== null}
        onOpenChange={(open) => {
          if (!open && !removeRole.isPending) setRoleToRemove(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this role?</AlertDialogTitle>
            <AlertDialogDescription>
              {roleToRemove
                ? `Remove the ${roleToRemove.role} role from ${roleToRemove.username}? Their permissions will change immediately.`
                : "This user's permissions will change immediately."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeRole.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!roleToRemove || removeRole.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (roleToRemove) {
                  removeRole.mutate({ userId: roleToRemove.userId, role: roleToRemove.role });
                }
              }}
            >
              {removeRole.isPending ? "Removing…" : "Yes, remove role"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
