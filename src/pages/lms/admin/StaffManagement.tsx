import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Users, 
  Loader2, 
  FileText,
  DollarSign,
  Plus,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import LMSLayout from '@/components/lms/LMSLayout';
import { format, addYears } from 'date-fns';

interface StaffMember {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  contract?: {
    id: string;
    start_date: string;
    end_date: string;
    salary_amount: number;
    salary_currency: string;
    status: string;
    position: string;
    department: string;
  };
}

const StaffManagement = () => {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Contract dialog
  const [contractDialog, setContractDialog] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [contractData, setContractData] = useState({
    position: '',
    department: '',
    salary_amount: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/lms/login');
    } else if (!loading && user && !isAdmin) {
      navigate('/lms/dashboard');
      toast.error('Only administrators can access this page');
    }
  }, [user, loading, isAdmin, navigate]);

  useEffect(() => {
    if (user && isAdmin) {
      fetchStaff();
    }
  }, [user, isAdmin]);

  const fetchStaff = async () => {
    setIsLoading(true);

    // Get staff roles
    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .in('role', ['admin', 'instructor']);

    if (!roles?.length) {
      setStaff([]);
      setIsLoading(false);
      return;
    }

    // Get profiles
    const userIds = [...new Set(roles.map(r => r.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds);

    // Get contracts
    const { data: contracts } = await supabase
      .from('staff_contracts')
      .select('*')
      .in('user_id', userIds)
      .eq('status', 'active');

    const staffData: StaffMember[] = userIds.map(userId => {
      const profile = profiles?.find(p => p.id === userId);
      const role = roles.find(r => r.user_id === userId)?.role;
      const contract = contracts?.find(c => c.user_id === userId);

      return {
        id: userId,
        full_name: profile?.full_name || null,
        email: profile?.email || null,
        role: role || 'staff',
        contract: contract ? {
          id: contract.id,
          start_date: contract.start_date,
          end_date: contract.end_date,
          salary_amount: contract.salary_amount,
          salary_currency: contract.salary_currency,
          status: contract.status,
          position: contract.position || '',
          department: contract.department || '',
        } : undefined,
      };
    });

    setStaff(staffData);
    setIsLoading(false);
  };

  const openContractDialog = (staffMember: StaffMember) => {
    setSelectedStaff(staffMember);
    if (staffMember.contract) {
      setContractData({
        position: staffMember.contract.position,
        department: staffMember.contract.department,
        salary_amount: staffMember.contract.salary_amount.toString(),
        start_date: staffMember.contract.start_date,
      });
    } else {
      setContractData({
        position: '',
        department: '',
        salary_amount: '',
        start_date: format(new Date(), 'yyyy-MM-dd'),
      });
    }
    setContractDialog(true);
  };

  const saveContract = async () => {
    if (!selectedStaff || !contractData.position || !contractData.salary_amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSaving(true);

    try {
      const startDate = new Date(contractData.start_date);
      const endDate = addYears(startDate, 2); // 2-year contract

      if (selectedStaff.contract) {
        // Update existing contract
        const { error } = await supabase
          .from('staff_contracts')
          .update({
            position: contractData.position,
            department: contractData.department,
            salary_amount: parseFloat(contractData.salary_amount),
            start_date: contractData.start_date,
            end_date: format(endDate, 'yyyy-MM-dd'),
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedStaff.contract.id);

        if (error) throw error;
        toast.success('Contract updated successfully');
      } else {
        // Create new contract
        const { error } = await supabase
          .from('staff_contracts')
          .insert({
            user_id: selectedStaff.id,
            position: contractData.position,
            department: contractData.department,
            salary_amount: parseFloat(contractData.salary_amount),
            salary_currency: 'KES',
            start_date: contractData.start_date,
            end_date: format(endDate, 'yyyy-MM-dd'),
            status: 'active',
            contract_type: 'full_time',
            created_by: user?.id,
          });

        if (error) throw error;
        toast.success('Contract created successfully');
      }

      setContractDialog(false);
      fetchStaff();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save contract');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || isLoading) {
    return (
      <LMSLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </LMSLayout>
    );
  }

  const instructors = staff.filter(s => s.role === 'instructor');
  const admins = staff.filter(s => s.role === 'admin');

  return (
    <LMSLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Staff & HR Management</h1>
            <p className="text-muted-foreground">Manage contracts, salaries, and staff activities</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Staff</p>
                  <p className="text-2xl font-bold">{staff.length}</p>
                </div>
                <Users className="h-8 w-8 text-primary opacity-80" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Instructors</p>
                  <p className="text-2xl font-bold">{instructors.length}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">With Contracts</p>
                  <p className="text-2xl font-bold">{staff.filter(s => s.contract).length}</p>
                </div>
                <FileText className="h-8 w-8 text-green-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Monthly Payroll</p>
                  <p className="text-2xl font-bold">
                    KES {staff.reduce((sum, s) => sum + (s.contract?.salary_amount || 0), 0).toLocaleString()}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-amber-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Staff Table */}
        <Card>
          <CardHeader>
            <CardTitle>Staff Directory</CardTitle>
            <CardDescription>Manage staff contracts and compensation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Contract End</TableHead>
                    <TableHead>Salary</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No staff members found
                      </TableCell>
                    </TableRow>
                  ) : (
                    staff.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-semibold">
                              {member.full_name?.charAt(0) || 'S'}
                            </div>
                            <div>
                              <p className="font-medium">{member.full_name || 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground">{member.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                            {member.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{member.contract?.position || '-'}</TableCell>
                        <TableCell>{member.contract?.department || '-'}</TableCell>
                        <TableCell>
                          {member.contract ? (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              {format(new Date(member.contract.end_date), 'MMM d, yyyy')}
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {member.contract ? (
                            <span className="font-medium">
                              KES {member.contract.salary_amount.toLocaleString()}
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant={member.contract ? 'outline' : 'default'}
                            onClick={() => openContractDialog(member)}
                          >
                            {member.contract ? 'Edit Contract' : 'Add Contract'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Contract Dialog */}
        <Dialog open={contractDialog} onOpenChange={setContractDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedStaff?.contract ? 'Edit Contract' : 'Create Contract'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium">{selectedStaff?.full_name}</p>
                <p className="text-sm text-muted-foreground">{selectedStaff?.email}</p>
                <Badge className="mt-2">{selectedStaff?.role}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Position *</Label>
                  <Input
                    placeholder="e.g., Senior Instructor"
                    value={contractData.position}
                    onChange={(e) => setContractData({ ...contractData, position: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Input
                    placeholder="e.g., IT Department"
                    value={contractData.department}
                    onChange={(e) => setContractData({ ...contractData, department: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Monthly Salary (KES) *</Label>
                  <Input
                    type="number"
                    placeholder="50000"
                    value={contractData.salary_amount}
                    onChange={(e) => setContractData({ ...contractData, salary_amount: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={contractData.start_date}
                    onChange={(e) => setContractData({ ...contractData, start_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm text-blue-700 dark:text-blue-300">
                <strong>Note:</strong> Contracts are automatically set to 2 years from the start date.
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setContractDialog(false)}>
                Cancel
              </Button>
              <Button onClick={saveContract} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Contract'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </LMSLayout>
  );
};

export default StaffManagement;
