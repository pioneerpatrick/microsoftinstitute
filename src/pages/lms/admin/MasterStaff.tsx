import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import LMSLayout from '@/components/lms/LMSLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Search, Users, Download, Eye, Shield, UserPlus, Briefcase,
  ArrowUpRight, Clock, DollarSign, Trash2, Loader2, BookOpen
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface StaffMember {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
  role: 'admin' | 'instructor' | 'student';
  contract?: {
    position: string | null;
    department: string | null;
    salary_amount: number;
    salary_currency: string;
    contract_type: string;
    status: string | null;
    start_date: string;
    end_date: string;
  } | null;
  courses_count: number;
  reports_count: number;
  assigned_courses?: string[];
}

interface Course {
  id: string;
  title: string;
  instructor_id: string | null;
}

const MasterStaff = () => {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [allUsers, setAllUsers] = useState<Array<{ id: string; full_name: string | null; email: string | null }>>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [staffToDelete, setStaffToDelete] = useState<StaffMember | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false);
  const [courseAssignDialogOpen, setCourseAssignDialogOpen] = useState(false);
  const [staffForCourseAssign, setStaffForCourseAssign] = useState<StaffMember | null>(null);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [promoteForm, setPromoteForm] = useState({
    user_id: '',
    role: 'instructor' as 'admin' | 'instructor',
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/lms/login');
    } else if (!loading && !isAdmin) {
      toast.error('Access denied. Admin only.');
      navigate('/lms/dashboard');
    }
  }, [user, loading, isAdmin, navigate]);

  useEffect(() => {
    if (user && isAdmin) {
      fetchData();
    }
  }, [user, isAdmin]);

  const fetchData = async () => {
    // Get all staff (admins and instructors)
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .in('role', ['admin', 'instructor']);

    const staffIds = rolesData?.map(r => r.user_id) || [];
    const roleMap = new Map(rolesData?.map(r => [r.user_id, r.role]) || []);

    if (staffIds.length === 0) {
      setStaff([]);
      setIsLoading(false);
      return;
    }

    // Get profiles
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name, email, created_at')
      .in('id', staffIds);

    // Get contracts
    const { data: contractsData } = await supabase
      .from('staff_contracts')
      .select('*')
      .in('user_id', staffIds)
      .eq('status', 'active');

    // Get course counts
    const { data: coursesData } = await supabase
      .from('courses')
      .select('instructor_id')
      .in('instructor_id', staffIds);

    // Get report counts
    const { data: reportsData } = await supabase
      .from('instructor_reports')
      .select('instructor_id')
      .in('instructor_id', staffIds);

    const contractMap = new Map(contractsData?.map(c => [c.user_id, c]) || []);
    const courseCountMap = new Map<string, number>();
    const reportCountMap = new Map<string, number>();

    coursesData?.forEach(c => {
      if (c.instructor_id) {
        courseCountMap.set(c.instructor_id, (courseCountMap.get(c.instructor_id) || 0) + 1);
      }
    });

    reportsData?.forEach(r => {
      reportCountMap.set(r.instructor_id, (reportCountMap.get(r.instructor_id) || 0) + 1);
    });

    const staffData: StaffMember[] = (profilesData || []).map(profile => {
      const contract = contractMap.get(profile.id);
      return {
        ...profile,
        role: roleMap.get(profile.id) as 'admin' | 'instructor',
        contract: contract ? {
          position: contract.position,
          department: contract.department,
          salary_amount: contract.salary_amount,
          salary_currency: contract.salary_currency,
          contract_type: contract.contract_type,
          status: contract.status,
          start_date: contract.start_date,
          end_date: contract.end_date,
        } : null,
        courses_count: courseCountMap.get(profile.id) || 0,
        reports_count: reportCountMap.get(profile.id) || 0,
      };
    });

    setStaff(staffData);

    // Get all users for promotion
    const { data: allProfilesData } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .order('full_name');

    setAllUsers(allProfilesData || []);

    // Get all courses for assignment
    const { data: allCoursesData } = await supabase
      .from('courses')
      .select('id, title, instructor_id')
      .order('title');

    setCourses(allCoursesData || []);
    setIsLoading(false);
  };

  const handlePromote = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!promoteForm.user_id) {
      toast.error('Please select a user');
      return;
    }

    // Check if user already has this role
    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', promoteForm.user_id)
      .eq('role', promoteForm.role)
      .single();

    if (existingRole) {
      toast.error('User already has this role');
      return;
    }

    const { error } = await supabase
      .from('user_roles')
      .insert({
        user_id: promoteForm.user_id,
        role: promoteForm.role,
      });

    if (error) {
      toast.error('Failed to promote user');
      console.error(error);
    } else {
      toast.success(`User promoted to ${promoteForm.role}`);
      setPromoteDialogOpen(false);
      setPromoteForm({ user_id: '', role: 'instructor' });
      fetchData();

      // Send welcome email
      const selectedUser = allUsers.find(u => u.id === promoteForm.user_id);
      if (selectedUser?.email) {
        await supabase.functions.invoke('send-staff-welcome', {
          body: {
            email: selectedUser.email,
            name: selectedUser.full_name || 'Staff Member',
            role: promoteForm.role,
          },
        });
      }
    }
  };

  const openCourseAssignDialog = (member: StaffMember) => {
    setStaffForCourseAssign(member);
    const assignedCourseIds = courses
      .filter(c => c.instructor_id === member.id)
      .map(c => c.id);
    setSelectedCourses(assignedCourseIds);
    setCourseAssignDialogOpen(true);
  };

  const handleCourseAssignment = async () => {
    if (!staffForCourseAssign) return;

    try {
      // Get currently assigned courses
      const currentlyAssigned = courses
        .filter(c => c.instructor_id === staffForCourseAssign.id)
        .map(c => c.id);

      // Courses to unassign (were assigned, now not selected)
      const toUnassign = currentlyAssigned.filter(id => !selectedCourses.includes(id));
      
      // Courses to assign (now selected, were not assigned)
      const toAssign = selectedCourses.filter(id => !currentlyAssigned.includes(id));

      // Unassign courses
      if (toUnassign.length > 0) {
        await supabase
          .from('courses')
          .update({ instructor_id: null })
          .in('id', toUnassign);
      }

      // Assign courses
      if (toAssign.length > 0) {
        await supabase
          .from('courses')
          .update({ instructor_id: staffForCourseAssign.id })
          .in('id', toAssign);
      }

      toast.success('Courses updated successfully');
      setCourseAssignDialogOpen(false);
      setStaffForCourseAssign(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to update courses');
    }
  };

  const handleDemote = async (userId: string, role: string) => {
    if (!confirm('Are you sure you want to remove this role?')) return;

    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role', role as 'admin' | 'instructor' | 'student');

    if (error) {
      toast.error('Failed to remove role');
    } else {
      toast.success('Role removed');
      fetchData();
    }
  };

  const deleteStaffMember = async () => {
    if (!staffToDelete) return;
    
    setIsDeleting(true);
    
    try {
      // Delete in order of dependencies (cascade manually)
      // 1. Delete instructor reports
      await supabase
        .from('instructor_reports')
        .delete()
        .eq('instructor_id', staffToDelete.id);
      
      // 2. Delete instructor attendance
      await supabase
        .from('instructor_attendance')
        .delete()
        .eq('instructor_id', staffToDelete.id);
      
      // 3. Delete salary payments
      await supabase
        .from('salary_payments')
        .delete()
        .eq('user_id', staffToDelete.id);
      
      // 4. Delete staff contracts
      await supabase
        .from('staff_contracts')
        .delete()
        .eq('user_id', staffToDelete.id);
      
      // 5. Delete live sessions (as instructor)
      await supabase
        .from('live_sessions')
        .delete()
        .eq('instructor_id', staffToDelete.id);
      
      // 6. Update courses to remove instructor
      await supabase
        .from('courses')
        .update({ instructor_id: null })
        .eq('instructor_id', staffToDelete.id);
      
      // 7. Delete messages
      await supabase
        .from('messages')
        .delete()
        .or(`sender_id.eq.${staffToDelete.id},recipient_id.eq.${staffToDelete.id}`);
      
      // 8. Delete user role
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', staffToDelete.id);
      
      // 9. Delete profile
      await supabase
        .from('profiles')
        .delete()
        .eq('id', staffToDelete.id);
      
      // 10. Delete auth user via edge function
      await supabase.functions.invoke('manage-users', {
        body: {
          action: 'delete_user',
          user_id: staffToDelete.id,
        },
      });
      
      toast.success('Staff member and all related data deleted successfully');
      setStaffToDelete(null);
      fetchData();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error('Failed to delete staff: ' + (error.message || 'Unknown error'));
    } finally {
      setIsDeleting(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, 'default' | 'secondary'> = {
      admin: 'default',
      instructor: 'secondary',
    };
    return <Badge variant={variants[role]}>{role}</Badge>;
  };

  const formatCurrency = (amount: number, currency = 'KES') => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const filteredStaff = staff.filter(s => {
    const matchesSearch = 
      s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || s.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const exportToCSV = () => {
    const csv = [
      'Name,Email,Role,Position,Department,Salary,Courses,Reports,Joined',
      ...filteredStaff.map(s => 
        `"${s.full_name || ''}","${s.email || ''}","${s.role}","${s.contract?.position || ''}","${s.contract?.department || ''}","${s.contract ? formatCurrency(s.contract.salary_amount, s.contract.salary_currency) : ''}",${s.courses_count},${s.reports_count},"${format(new Date(s.created_at), 'yyyy-MM-dd')}"`
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `master-staff-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Staff data exported');
  };

  const adminsCount = staff.filter(s => s.role === 'admin').length;
  const instructorsCount = staff.filter(s => s.role === 'instructor').length;
  const totalSalary = staff.reduce((sum, s) => sum + (s.contract?.salary_amount || 0), 0);

  if (loading || isLoading) {
    return (
      <LMSLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </LMSLayout>
    );
  }

  return (
    <LMSLayout>
      <div className="space-y-6 w-full min-w-0 overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Briefcase className="h-6 w-6" />
              Master Staff Table
            </h1>
            <p className="text-muted-foreground">Manage all staff members and promotions</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setPromoteDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Staff
            </Button>
            <Button onClick={exportToCSV} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="overflow-hidden">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 bg-purple-100 rounded-lg flex-shrink-0">
                  <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg sm:text-2xl font-bold truncate">{adminsCount}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Admins</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg sm:text-2xl font-bold truncate">{instructorsCount}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Instructors</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm sm:text-lg lg:text-xl font-bold break-all">{formatCurrency(totalSalary)}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Total Salaries</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 bg-orange-100 rounded-lg flex-shrink-0">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg sm:text-2xl font-bold truncate">{staff.filter(s => s.contract).length}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">With Contracts</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="instructor">Instructor</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Staff ({filteredStaff.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredStaff.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No staff members found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff Member</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Salary</TableHead>
                      <TableHead>Courses</TableHead>
                      <TableHead>Reports</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStaff.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{member.full_name || 'Unnamed'}</div>
                            <div className="text-sm text-muted-foreground">{member.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>{getRoleBadge(member.role)}</TableCell>
                        <TableCell>
                          {member.contract?.position || '-'}
                          {member.contract?.department && (
                            <div className="text-sm text-muted-foreground">
                              {member.contract.department}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {member.contract
                            ? formatCurrency(member.contract.salary_amount, member.contract.salary_currency)
                            : '-'}
                        </TableCell>
                        <TableCell>{member.courses_count}</TableCell>
                        <TableCell>{member.reports_count}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openCourseAssignDialog(member)}
                              title="Assign Courses"
                            >
                              <BookOpen className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedStaff(member)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setStaffToDelete(member)}
                            >
                              <Trash2 className="h-4 w-4" />
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

        {/* Promote User Dialog */}
        <Dialog open={promoteDialogOpen} onOpenChange={setPromoteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Promote User to Staff</DialogTitle>
            </DialogHeader>
            <form onSubmit={handlePromote} className="space-y-4">
              <div className="space-y-2">
                <Label>Select User</Label>
                <Select
                  value={promoteForm.user_id}
                  onValueChange={(v) => setPromoteForm({ ...promoteForm, user_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {allUsers
                      .filter(u => !staff.some(s => s.id === u.id && s.role === promoteForm.role))
                      .map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.full_name || u.email}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={promoteForm.role}
                  onValueChange={(v) => setPromoteForm({ ...promoteForm, role: v as 'admin' | 'instructor' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instructor">Instructor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">
                <ArrowUpRight className="h-4 w-4 mr-2" />
                Promote User
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Staff Details Dialog */}
        <Dialog open={!!selectedStaff} onOpenChange={() => setSelectedStaff(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Staff Details</DialogTitle>
            </DialogHeader>
            {selectedStaff && (
              <Tabs defaultValue="info" className="w-full">
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="info">Information</TabsTrigger>
                  <TabsTrigger value="contract">Contract</TabsTrigger>
                </TabsList>
                <TabsContent value="info" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="font-medium">{selectedStaff.full_name || 'Unnamed'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{selectedStaff.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Role</p>
                      <div className="mt-1">{getRoleBadge(selectedStaff.role)}</div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Joined</p>
                      <p className="font-medium">
                        {format(new Date(selectedStaff.created_at), 'MMMM d, yyyy')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Courses Assigned</p>
                      <p className="font-medium">{selectedStaff.courses_count}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Reports Submitted</p>
                      <p className="font-medium">{selectedStaff.reports_count}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        handleDemote(selectedStaff.id, selectedStaff.role);
                        setSelectedStaff(null);
                      }}
                    >
                      Remove Role
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedStaff(null);
                        navigate('/lms/admin/staff');
                      }}
                    >
                      Manage Contract
                    </Button>
                  </div>
                </TabsContent>
                <TabsContent value="contract" className="space-y-4 mt-4">
                  {selectedStaff.contract ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Position</p>
                        <p className="font-medium">{selectedStaff.contract.position || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Department</p>
                        <p className="font-medium">{selectedStaff.contract.department || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Salary</p>
                        <p className="font-medium">
                          {formatCurrency(selectedStaff.contract.salary_amount, selectedStaff.contract.salary_currency)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Contract Type</p>
                        <p className="font-medium capitalize">{selectedStaff.contract.contract_type.replace('_', ' ')}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Start Date</p>
                        <p className="font-medium">
                          {format(new Date(selectedStaff.contract.start_date), 'MMMM d, yyyy')}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">End Date</p>
                        <p className="font-medium">
                          {format(new Date(selectedStaff.contract.end_date), 'MMMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No contract assigned. Go to Staff Management to create one.
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Staff Confirmation */}
        <AlertDialog open={!!staffToDelete} onOpenChange={() => setStaffToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive">Delete Staff Member</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <strong>{staffToDelete?.full_name || staffToDelete?.email}</strong>? 
                This will permanently remove all their data including:
                <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
                  <li>Staff contracts and salary payments</li>
                  <li>Instructor reports and attendance records</li>
                  <li>All messages sent and received</li>
                  <li>Course assignments (courses will remain unassigned)</li>
                </ul>
                <p className="mt-3 font-semibold text-destructive">This action cannot be undone.</p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={deleteStaffMember}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Permanently'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Course Assignment Dialog */}
        <Dialog open={courseAssignDialogOpen} onOpenChange={setCourseAssignDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Assign Courses
              </DialogTitle>
            </DialogHeader>
            {staffForCourseAssign && (
              <div className="space-y-4 pt-2">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">{staffForCourseAssign.full_name || 'Staff Member'}</p>
                  <p className="text-sm text-muted-foreground">{staffForCourseAssign.email}</p>
                </div>
                
                <div className="space-y-2">
                  <Label>Select Courses to Assign</Label>
                  <div className="border rounded-lg max-h-64 overflow-y-auto">
                    {courses.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        No courses available
                      </div>
                    ) : (
                      courses.map((course) => {
                        const isAssignedToOther = course.instructor_id && course.instructor_id !== staffForCourseAssign.id;
                        const otherInstructor = isAssignedToOther 
                          ? staff.find(s => s.id === course.instructor_id)?.full_name 
                          : null;
                        
                        return (
                          <div 
                            key={course.id} 
                            className="flex items-center gap-3 p-3 border-b last:border-b-0 hover:bg-muted/50"
                          >
                            <Checkbox
                              id={course.id}
                              checked={selectedCourses.includes(course.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedCourses([...selectedCourses, course.id]);
                                } else {
                                  setSelectedCourses(selectedCourses.filter(id => id !== course.id));
                                }
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <label 
                                htmlFor={course.id} 
                                className="font-medium cursor-pointer block truncate"
                              >
                                {course.title}
                              </label>
                              {isAssignedToOther && (
                                <p className="text-xs text-amber-600">
                                  Currently assigned to: {otherInstructor || 'Another instructor'}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {selectedCourses.length} course(s) selected
                  </p>
                </div>

                <Button onClick={handleCourseAssignment} className="w-full">
                  Save Assignments
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </LMSLayout>
  );
};

export default MasterStaff;
