import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import LMSLayout from '@/components/lms/LMSLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2, DollarSign, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

interface FeeStructure {
  id: string;
  course_id: string | null;
  name: string;
  amount: number;
  currency: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  payment_frequency: string | null;
  courses?: { title: string } | null;
}

interface Course {
  id: string;
  title: string;
}

const FeeStructures = () => {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [fees, setFees] = useState<FeeStructure[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFee, setEditingFee] = useState<FeeStructure | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    course_id: '',
    amount: '',
    currency: 'KES',
    description: '',
    is_active: true,
    payment_frequency: 'per_term',
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
      fetchFees();
      fetchCourses();
    }
  }, [user, isAdmin]);

  const fetchFees = async () => {
    const { data, error } = await supabase
      .from('fee_structures')
      .select('*, courses(title)')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setFees(data as FeeStructure[]);
    }
    setIsLoading(false);
  };

  const fetchCourses = async () => {
    const { data } = await supabase
      .from('courses')
      .select('id, title')
      .order('title');
    
    if (data) {
      setCourses(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const payload = {
      name: formData.name,
      course_id: formData.course_id || null,
      amount: parseFloat(formData.amount),
      currency: formData.currency,
      description: formData.description || null,
      is_active: formData.is_active,
      payment_frequency: formData.payment_frequency,
    };

    if (editingFee) {
      const { error } = await supabase
        .from('fee_structures')
        .update(payload)
        .eq('id', editingFee.id);

      if (error) {
        toast.error('Failed to update fee structure');
      } else {
        toast.success('Fee structure updated');
        fetchFees();
      }
    } else {
      const { error } = await supabase
        .from('fee_structures')
        .insert(payload);

      if (error) {
        toast.error('Failed to create fee structure');
      } else {
        toast.success('Fee structure created');
        fetchFees();
      }
    }

    resetForm();
    setDialogOpen(false);
  };

  const handleEdit = (fee: FeeStructure) => {
    setEditingFee(fee);
    setFormData({
      name: fee.name,
      course_id: fee.course_id || '',
      amount: fee.amount.toString(),
      currency: fee.currency,
      description: fee.description || '',
      is_active: fee.is_active,
      payment_frequency: fee.payment_frequency || 'per_term',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this fee structure?')) return;

    const { error } = await supabase
      .from('fee_structures')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete fee structure');
    } else {
      toast.success('Fee structure deleted');
      fetchFees();
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from('fee_structures')
      .update({ is_active: !isActive })
      .eq('id', id);

    if (!error) {
      setFees(fees.map(f => f.id === id ? { ...f, is_active: !isActive } : f));
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      course_id: '',
      amount: '',
      currency: 'KES',
      description: '',
      is_active: true,
      payment_frequency: 'per_term',
    });
    setEditingFee(null);
  };

  const getFrequencyBadge = (frequency: string | null) => {
    const labels: Record<string, string> = {
      per_month: 'Monthly',
      per_term: 'Per Term',
      one_time: 'One Time',
    };
    return <Badge variant="outline">{labels[frequency || 'per_term'] || frequency}</Badge>;
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Fee Structures</h1>
            <p className="text-muted-foreground">Manage course fees and payment structures</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Fee Structure
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingFee ? 'Edit Fee Structure' : 'Create Fee Structure'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Fee Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Tuition Fee, Registration Fee"
                    required
                  />
                </div>
                <div>
                  <Label>Course (Optional)</Label>
                  <Select value={formData.course_id || "general"} onValueChange={(v) => setFormData({ ...formData, course_id: v === "general" ? "" : v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select course (or leave for general fee)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General Fee (All Courses)</SelectItem>
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Amount *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div>
                    <Label>Currency</Label>
                    <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="KES">KES (Kenya Shilling)</SelectItem>
                        <SelectItem value="USD">USD (US Dollar)</SelectItem>
                        <SelectItem value="EUR">EUR (Euro)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Payment Frequency</Label>
                  <Select value={formData.payment_frequency} onValueChange={(v) => setFormData({ ...formData, payment_frequency: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="per_month">Per Month</SelectItem>
                      <SelectItem value="per_term">Per Term (3 Months)</SelectItem>
                      <SelectItem value="one_time">One Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Additional details about this fee..."
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label>Active</Label>
                </div>
                <Button type="submit" className="w-full">
                  {editingFee ? 'Update Fee Structure' : 'Create Fee Structure'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Fee Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fees.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Fees</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{fees.filter(f => f.is_active).length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Course-Specific Fees</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fees.filter(f => f.course_id).length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Fee Structures Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              All Fee Structures
            </CardTitle>
          </CardHeader>
          <CardContent>
            {fees.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No fee structures yet. Create your first one!</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fees.map((fee) => (
                    <TableRow key={fee.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{fee.name}</p>
                          {fee.description && (
                            <p className="text-sm text-muted-foreground truncate max-w-[200px]">{fee.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {fee.courses ? (
                          <div className="flex items-center gap-1">
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{fee.courses.title}</span>
                          </div>
                        ) : (
                          <Badge variant="outline">All Courses</Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(fee.amount, fee.currency)}
                      </TableCell>
                      <TableCell>
                        {getFrequencyBadge(fee.payment_frequency)}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={fee.is_active}
                          onCheckedChange={() => toggleActive(fee.id, fee.is_active)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(fee)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(fee.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </LMSLayout>
  );
};

export default FeeStructures;
