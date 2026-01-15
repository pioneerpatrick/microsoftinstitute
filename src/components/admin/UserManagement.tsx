import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Trash2, Shield, GraduationCap, Users, Loader2 } from "lucide-react";

interface User {
  id: string;
  email: string;
  full_name: string;
  roles: string[];
  created_at: string;
  last_sign_in_at: string | null;
}

const UserManagement = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "student" as string,
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await supabase.functions.invoke('manage-users', {
        body: { action: 'list_users' },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setUsers(response.data.users || []);
    } catch (error: any) {
      toast({
        title: "Error fetching users",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.full_name) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      const response = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'create_user',
          email: newUser.email,
          password: newUser.password,
          full_name: newUser.full_name,
          role: newUser.role,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      toast({
        title: "User created",
        description: `Successfully created account for ${newUser.email}`,
      });

      setNewUser({ email: "", password: "", full_name: "", role: "student" });
      setCreateDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error creating user",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleAssignRole = async (userId: string, role: string) => {
    try {
      const response = await supabase.functions.invoke('manage-users', {
        body: { action: 'assign_role', user_id: userId, role },
      });

      if (response.error || response.data.error) {
        throw new Error(response.error?.message || response.data.error);
      }

      toast({
        title: "Role assigned",
        description: `Successfully assigned ${role} role`,
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error assigning role",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveRole = async (userId: string, role: string) => {
    try {
      const response = await supabase.functions.invoke('manage-users', {
        body: { action: 'remove_role', user_id: userId, role },
      });

      if (response.error || response.data.error) {
        throw new Error(response.error?.message || response.data.error);
      }

      toast({
        title: "Role removed",
        description: `Successfully removed ${role} role`,
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error removing role",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to delete the user ${email}? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await supabase.functions.invoke('manage-users', {
        body: { action: 'delete_user', user_id: userId },
      });

      if (response.error || response.data.error) {
        throw new Error(response.error?.message || response.data.error);
      }

      toast({
        title: "User deleted",
        description: `Successfully deleted ${email}`,
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error deleting user",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'instructor': return 'default';
      case 'student': return 'secondary';
      default: return 'outline';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="h-3 w-3" />;
      case 'instructor': return <Users className="h-3 w-3" />;
      case 'student': return <GraduationCap className="h-3 w-3" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            Create and manage user accounts and assign roles
          </CardDescription>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Create User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Create a new user account with a specific role
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="user@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={newUser.role}
                  onValueChange={(value) => setNewUser({ ...newUser, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="instructor">Instructor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreateUser} disabled={creating} className="w-full">
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create User
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Sign In</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name || '-'}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles.length === 0 ? (
                          <Badge variant="outline">No role</Badge>
                        ) : (
                          user.roles.map((role) => (
                            <Badge
                              key={role}
                              variant={getRoleBadgeVariant(role)}
                              className="flex items-center gap-1 cursor-pointer"
                              onClick={() => handleRemoveRole(user.id, role)}
                              title="Click to remove role"
                            >
                              {getRoleIcon(role)}
                              {role}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {user.last_sign_in_at
                        ? new Date(user.last_sign_in_at).toLocaleDateString()
                        : 'Never'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Select onValueChange={(role) => handleAssignRole(user.id, role)}>
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="Add role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="student">Student</SelectItem>
                            <SelectItem value="instructor">Instructor</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteUser(user.id, user.email)}
                          title="Delete user"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserManagement;