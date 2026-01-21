import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import LMSLayout from '@/components/lms/LMSLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Plus, DollarSign, Users, TrendingUp, Receipt, Download, Search, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface StudentFee {
  id: string;
  user_id: string;
  fee_structure_id: string | null;
  course_id: string | null;
  amount_due: number;
  amount_paid: number;
  balance: number;
  status: string;
  due_date: string | null;
  created_at: string;
  profiles?: { full_name: string | null; email: string | null } | null;
  courses?: { title: string } | null;
  fee_structures?: { name: string; currency: string } | null;
}

interface FeePayment {
  id: string;
  student_fee_id: string;
  user_id: string;
  amount: number;
  payment_method: string | null;
  transaction_reference: string | null;
  receipt_number: string | null;
  payment_date: string;
  notes: string | null;
  profiles?: { full_name: string | null; email: string | null } | null;
}

interface FeeStructure {
  id: string;
  name: string;
  amount: number;
  currency: string;
  course_id: string | null;
}

interface Student {
  id: string;
  full_name: string | null;
  email: string | null;
}

const Accounting = () => {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [studentFees, setStudentFees] = useState<StudentFee[]>([]);
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedStudentFee, setSelectedStudentFee] = useState<StudentFee | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [assignForm, setAssignForm] = useState({
    user_id: '',
    fee_structure_id: '',
    amount_due: '',
    due_date: '',
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'mpesa',
    transaction_reference: '',
    receipt_number: '',
    notes: '',
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
    await Promise.all([
      fetchStudentFees(),
      fetchPayments(),
      fetchFeeStructures(),
      fetchStudents(),
    ]);
    setIsLoading(false);
  };

  const fetchStudentFees = async () => {
    const { data: feesData } = await supabase
      .from('student_fees')
      .select('*, courses(title), fee_structures(name, currency)')
      .order('created_at', { ascending: false });

    if (feesData) {
      // Fetch profiles separately
      const userIds = [...new Set(feesData.map(f => f.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      
      const enrichedFees = feesData.map(fee => ({
        ...fee,
        profiles: profilesMap.get(fee.user_id) || null,
      }));
      
      setStudentFees(enrichedFees);
    }
  };

  const fetchPayments = async () => {
    const { data: paymentsData } = await supabase
      .from('fee_payments')
      .select('*')
      .order('payment_date', { ascending: false })
      .limit(100);

    if (paymentsData) {
      // Fetch profiles separately
      const userIds = [...new Set(paymentsData.map(p => p.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      
      const enrichedPayments = paymentsData.map(payment => ({
        ...payment,
        profiles: profilesMap.get(payment.user_id) || null,
      }));
      
      setPayments(enrichedPayments);
    }
  };

  const fetchFeeStructures = async () => {
    const { data } = await supabase
      .from('fee_structures')
      .select('id, name, amount, currency, course_id')
      .eq('is_active', true);

    if (data) setFeeStructures(data);
  };

  const fetchStudents = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .order('full_name');

    if (data) setStudents(data);
  };

  const handleAssignFee = async (e: React.FormEvent) => {
    e.preventDefault();

    const selectedFee = feeStructures.find(f => f.id === assignForm.fee_structure_id);
    
    const { error } = await supabase
      .from('student_fees')
      .insert({
        user_id: assignForm.user_id,
        fee_structure_id: assignForm.fee_structure_id,
        course_id: selectedFee?.course_id || null,
        amount_due: parseFloat(assignForm.amount_due) || selectedFee?.amount || 0,
        due_date: assignForm.due_date || null,
        status: 'pending',
      });

    if (error) {
      toast.error('Failed to assign fee');
    } else {
      toast.success('Fee assigned to student');
      fetchStudentFees();
      setAssignDialogOpen(false);
      setAssignForm({ user_id: '', fee_structure_id: '', amount_due: '', due_date: '' });
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentFee) return;

    const amount = parseFloat(paymentForm.amount);

    // Record the payment
    const { error: paymentError } = await supabase
      .from('fee_payments')
      .insert({
        student_fee_id: selectedStudentFee.id,
        user_id: selectedStudentFee.user_id,
        amount,
        payment_method: paymentForm.payment_method,
        transaction_reference: paymentForm.transaction_reference || null,
        receipt_number: paymentForm.receipt_number || null,
        notes: paymentForm.notes || null,
        recorded_by: user?.id,
      });

    if (paymentError) {
      toast.error('Failed to record payment');
      return;
    }

    // Update student fee
    const newAmountPaid = selectedStudentFee.amount_paid + amount;
    const newStatus = newAmountPaid >= selectedStudentFee.amount_due ? 'paid' : 'partial';

    await supabase
      .from('student_fees')
      .update({ amount_paid: newAmountPaid, status: newStatus })
      .eq('id', selectedStudentFee.id);

    toast.success('Payment recorded successfully');
    fetchStudentFees();
    fetchPayments();
    setPaymentDialogOpen(false);
    setPaymentForm({ amount: '', payment_method: 'mpesa', transaction_reference: '', receipt_number: '', notes: '' });
    setSelectedStudentFee(null);
  };

  const openPaymentDialog = (fee: StudentFee) => {
    setSelectedStudentFee(fee);
    setPaymentForm({ ...paymentForm, amount: fee.balance.toString() });
    setPaymentDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      paid: 'default',
      partial: 'secondary',
      pending: 'outline',
      overdue: 'destructive',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  const formatCurrency = (amount: number, currency = 'KES') => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const totalDue = studentFees.reduce((sum, f) => sum + f.amount_due, 0);
  const totalPaid = studentFees.reduce((sum, f) => sum + f.amount_paid, 0);
  const totalBalance = studentFees.reduce((sum, f) => sum + f.balance, 0);

  const filteredFees = studentFees.filter(fee => {
    const name = fee.profiles?.full_name?.toLowerCase() || '';
    const email = fee.profiles?.email?.toLowerCase() || '';
    return name.includes(searchQuery.toLowerCase()) || email.includes(searchQuery.toLowerCase());
  });

  const exportToCSV = () => {
    const csv = [
      'Student,Email,Fee Type,Amount Due,Amount Paid,Balance,Status,Due Date',
      ...studentFees.map(f => 
        `"${f.profiles?.full_name || ''}","${f.profiles?.email || ''}","${f.fee_structures?.name || ''}",${f.amount_due},${f.amount_paid},${f.balance},${f.status},"${f.due_date ? format(new Date(f.due_date), 'yyyy-MM-dd') : ''}"`
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `accounting-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported');
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
            <h1 className="text-2xl font-bold text-foreground">Accounting</h1>
            <p className="text-muted-foreground">Manage student fees and payments</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Assign Fee
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Fee to Student</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAssignFee} className="space-y-4">
                  <div>
                    <Label>Student *</Label>
                    <Select value={assignForm.user_id} onValueChange={(v) => setAssignForm({ ...assignForm, user_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select student" />
                      </SelectTrigger>
                      <SelectContent>
                        {students.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.full_name || s.email}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Fee Type *</Label>
                    <Select 
                      value={assignForm.fee_structure_id} 
                      onValueChange={(v) => {
                        const fee = feeStructures.find(f => f.id === v);
                        setAssignForm({ 
                          ...assignForm, 
                          fee_structure_id: v,
                          amount_due: fee?.amount.toString() || '',
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select fee type" />
                      </SelectTrigger>
                      <SelectContent>
                        {feeStructures.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.name} - {formatCurrency(f.amount, f.currency)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Amount Due *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={assignForm.amount_due}
                      onChange={(e) => setAssignForm({ ...assignForm, amount_due: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Due Date</Label>
                    <Input
                      type="date"
                      value={assignForm.due_date}
                      onChange={(e) => setAssignForm({ ...assignForm, due_date: e.target.value })}
                    />
                  </div>
                  <Button type="submit" className="w-full">Assign Fee</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Total Due
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalDue)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Total Collected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Outstanding
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{formatCurrency(totalBalance)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Students with Fees
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{new Set(studentFees.map(f => f.user_id)).size}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="fees" className="space-y-4">
          <TabsList>
            <TabsTrigger value="fees">Student Fees</TabsTrigger>
            <TabsTrigger value="payments">Payment History</TabsTrigger>
          </TabsList>

          <TabsContent value="fees" className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by student name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Card>
              <CardContent className="pt-6">
                {filteredFees.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No student fees assigned yet.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Fee Type</TableHead>
                        <TableHead>Due</TableHead>
                        <TableHead>Paid</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFees.map((fee) => (
                        <TableRow key={fee.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{fee.profiles?.full_name || 'Unknown'}</p>
                              <p className="text-sm text-muted-foreground">{fee.profiles?.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{fee.fee_structures?.name || 'Custom'}</p>
                              {fee.courses && (
                                <p className="text-sm text-muted-foreground">{fee.courses.title}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold">
                            {formatCurrency(fee.amount_due, fee.fee_structures?.currency)}
                          </TableCell>
                          <TableCell className="text-green-600">
                            {formatCurrency(fee.amount_paid, fee.fee_structures?.currency)}
                          </TableCell>
                          <TableCell className="font-semibold text-orange-600">
                            {formatCurrency(fee.balance, fee.fee_structures?.currency)}
                          </TableCell>
                          <TableCell>{getStatusBadge(fee.status)}</TableCell>
                          <TableCell>
                            {fee.balance > 0 && (
                              <Button size="sm" onClick={() => openPaymentDialog(fee)}>
                                <CreditCard className="h-4 w-4 mr-1" />
                                Pay
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>Recent Payments</CardTitle>
              </CardHeader>
              <CardContent>
                {payments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No payments recorded yet.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Receipt</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>{format(new Date(payment.payment_date), 'MMM d, yyyy')}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{payment.profiles?.full_name || 'Unknown'}</p>
                              <p className="text-sm text-muted-foreground">{payment.profiles?.email}</p>
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold text-green-600">
                            {formatCurrency(payment.amount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{payment.payment_method || 'N/A'}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">{payment.transaction_reference || '-'}</TableCell>
                          <TableCell className="text-sm">{payment.receipt_number || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Payment Dialog */}
        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
            </DialogHeader>
            {selectedStudentFee && (
              <form onSubmit={handleRecordPayment} className="space-y-4">
                <div className="bg-muted p-3 rounded-lg">
                  <p className="font-medium">{selectedStudentFee.profiles?.full_name}</p>
                  <p className="text-sm text-muted-foreground">
                    Balance: {formatCurrency(selectedStudentFee.balance)}
                  </p>
                </div>
                <div>
                  <Label>Amount *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Payment Method</Label>
                  <Select value={paymentForm.payment_method} onValueChange={(v) => setPaymentForm({ ...paymentForm, payment_method: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mpesa">M-Pesa</SelectItem>
                      <SelectItem value="bank">Bank Transfer</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Transaction Reference</Label>
                  <Input
                    value={paymentForm.transaction_reference}
                    onChange={(e) => setPaymentForm({ ...paymentForm, transaction_reference: e.target.value })}
                    placeholder="e.g., M-Pesa code"
                  />
                </div>
                <div>
                  <Label>Receipt Number</Label>
                  <Input
                    value={paymentForm.receipt_number}
                    onChange={(e) => setPaymentForm({ ...paymentForm, receipt_number: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full">Record Payment</Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </LMSLayout>
  );
};

export default Accounting;
