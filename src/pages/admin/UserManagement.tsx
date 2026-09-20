import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MailPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
type ManagedUser = {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  createdAt: string;
  emailConfirmedAt: string | null;
  invitedAt: string | null;
  roles: UserRole[];
};

const emailSchema = z.string().trim().email("Enter a valid email address");

async function invokeUserManagement<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("manage-users", { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export const UserManagement = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("user");
  const [roleToRemove, setRoleToRemove] = useState<{
    userId: string;
    username: string;
    role: UserRole;
  } | null>(null);
  const [userToDelete, setUserToDelete] = useState<ManagedUser | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ["adminUsers"],
    queryFn: async () => {
      const data = await invokeUserManagement<{ users: ManagedUser[] }>({ action: "list" });
      return data.users;
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

  const inviteUser = useMutation({
    mutationFn: async () => {
      const email = emailSchema.parse(inviteEmail);
      return invokeUserManagement<{ userId: string }>({
        action: "invite",
        email,
        role: inviteRole,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      setInviteEmail("");
      setInviteRole("user");
      toast.success("Invitation sent. The user can now confirm their email and create a password.");
    },
    onError: (error: Error) => {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || "Failed to invite user");
      }
    },
  });

  const assignRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: UserRole }) => {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) throw error;
      await logActivity("assign_role", userId, role);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      toast.success("Role assigned successfully");
      setSelectedUserId(null);
    },
    onError: (error: Error) => toast.error(error.message || "Failed to assign role"),
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
    onError: (error: Error) => toast.error(error.message || "Failed to remove role"),
  });

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      if (userId === user?.id) throw new Error("You cannot delete your own administrator account");
      return invokeUserManagement<{ deleted: true }>({ action: "delete", userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      setUserToDelete(null);
      toast.success("User account deleted successfully");
    },
    onError: (error: Error) => toast.error(error.message || "Failed to delete user"),
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
          <CardTitle>Invite a user</CardTitle>
          <CardDescription>
            Choose a role and send a secure email link so the user can confirm the invitation and create a password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px_auto] md:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              inviteUser.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email address</Label>
              <Input
                id="invite-email"
                type="email"
                autoComplete="email"
                placeholder="person@example.com"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={(value: UserRole) => setInviteRole(value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={inviteUser.isPending}>
              <MailPlus className="mr-2 h-4 w-4" />
              {inviteUser.isPending ? "Sending…" : "Send invitation"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>All Users</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((managedUser) => (
                <TableRow key={managedUser.id}>
                  <TableCell>
                    <div className="font-medium">{managedUser.username}</div>
                    <div className="text-xs text-muted-foreground">{managedUser.displayName || "—"}</div>
                  </TableCell>
                  <TableCell>{managedUser.email}</TableCell>
                  <TableCell>
                    <Badge variant={managedUser.emailConfirmedAt ? "secondary" : "outline"}>
                      {managedUser.emailConfirmedAt ? "Active" : "Invitation pending"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      {managedUser.roles.length === 0 ? (
                        <Badge variant="outline">user</Badge>
                      ) : managedUser.roles.map((role) => {
                        const isProtectedRole = role === "admin" && managedUser.id === user?.id;
                        return (
                          <div key={role} className="flex items-center gap-2">
                            <Badge variant={role === "admin" ? "default" : "secondary"}>{role}</Badge>
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
                      })}
                    </div>
                  </TableCell>
                  <TableCell>{new Date(managedUser.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      {selectedUserId === managedUser.id ? (
                        <>
                          <Select onValueChange={(role) => assignRole.mutate({ userId: managedUser.id, role: role as UserRole })}>
                            <SelectTrigger className="w-32"><SelectValue placeholder="Add role" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="moderator">Moderator</SelectItem>
                              <SelectItem value="user">User</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button variant="ghost" size="sm" onClick={() => setSelectedUserId(null)}>Cancel</Button>
                        </>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => setSelectedUserId(managedUser.id)}>
                          Assign Role
                        </Button>
                      )}
                      {managedUser.id === user?.id ? (
                        <span className="self-center text-xs font-medium text-muted-foreground">Your account is protected</span>
                      ) : (
                        <Button variant="destructive" size="sm" onClick={() => setUserToDelete(managedUser)}>
                          <Trash2 className="mr-1 h-4 w-4" />
                          Delete user
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={roleToRemove !== null} onOpenChange={(open) => {
        if (!open && !removeRole.isPending) setRoleToRemove(null);
      }}>
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
                if (roleToRemove) removeRole.mutate(roleToRemove);
              }}
            >
              {removeRole.isPending ? "Removing…" : "Yes, remove role"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={userToDelete !== null} onOpenChange={(open) => {
        if (!open && !deleteUser.isPending) setUserToDelete(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this user account?</AlertDialogTitle>
            <AlertDialogDescription>
              {userToDelete
                ? `Permanently delete ${userToDelete.email} and their associated account data? This action cannot be undone.`
                : "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteUser.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!userToDelete || deleteUser.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (userToDelete) deleteUser.mutate(userToDelete.id);
              }}
            >
              {deleteUser.isPending ? "Deleting…" : "Yes, permanently delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
