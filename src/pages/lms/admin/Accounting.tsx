import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import LMSLayout from '@/components/lms/LMSLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { 
  Plus, DollarSign, Users, TrendingUp, Receipt, Download, Search, CreditCard, Bell, 
  Loader2, Sparkles, FileText, PieChart, BarChart3, AlertTriangle, CheckCircle2,
  Calendar, ArrowUpRight, ArrowDownRight, Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import PaymentDetailsCard from '@/components/admin/PaymentDetailsCard';
import FeeStructurePDF from '@/components/admin/FeeStructurePDF';
import ExpensesSection from '@/components/admin/ExpensesSection';
import { downloadReceiptForPayment } from '@/components/admin/ReceiptPDF';
import ReconciliationTable from '@/components/admin/ReconciliationTable';
import SponsoredStudentsSection from '@/components/admin/SponsoredStudentsSection';

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
  payment_frequency: string | null;
}

interface Student {
  id: string;
  full_name: string | null;
  email: string | null;
}

// Course data from website
const websiteCourses = [
  { school: "School of ICT & Digital Technology", courses: [
    { name: "Information Technology (IT)", level: "Certificate", fee: 29000 },
    { name: "Computer Programming", level: "Certificate", fee: 30000 },
    { name: "Web Design & Development", level: "Certificate", fee: 28000 },
    { name: "Software Development", level: "Craft", fee: 30000 },
    { name: "Mobile App Development", level: "Certificate", fee: 30000 },
    { name: "Computer Applications", level: "Artisan", fee: 18000 },
    { name: "Computerized Accounting", level: "Artisan", fee: 22000 },
    { name: "Database Management", level: "Certificate", fee: 27000 },
    { name: "Networking (Theory-Based)", level: "Certificate", fee: 27000 },
    { name: "Cyber Security (Fundamentals)", level: "Certificate", fee: 30000 },
  ]},
  { school: "School of Business & Management", courses: [
    { name: "Business Management", level: "Certificate", fee: 27500 },
    { name: "Business Administration", level: "Certificate", fee: 28000 },
    { name: "Human Resource Management", level: "Craft", fee: 29000 },
    { name: "Accounting & Finance", level: "Certificate", fee: 29000 },
    { name: "Banking & Finance", level: "Certificate", fee: 29000 },
    { name: "Entrepreneurship", level: "Certificate", fee: 22000 },
    { name: "Project Management", level: "Certificate", fee: 27000 },
  ]},
  { school: "Professional & Specialized Courses", courses: [
    { name: "Digital Marketing", level: "Professional", fee: 30000 },
    { name: "Artificial Intelligence (AI)", level: "Professional", fee: 15000, isMonthly: true },
    { name: "English Language Learning", level: "Certificate", fee: 5000, isMonthly: true },
  ]},
  { school: "Education, Administration & Office Skills", courses: [
    { name: "Office Administration", level: "Certificate", fee: 27000 },
    { name: "Secretarial Studies", level: "Certificate", fee: 27000 },
    { name: "Records & Information Management", level: "Certificate", fee: 26000 },
    { name: "Virtual Assistance", level: "Certificate", fee: 18000 },
    { name: "Business Communication Skills", level: "Certificate", fee: 18000 },
  ]},
];

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
  const [sendingReminders, setSendingReminders] = useState(false);
  const [generatingFees, setGeneratingFees] = useState(false);
  const [feeToDelete, setFeeToDelete] = useState<StudentFee | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<FeePayment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [downloadingReceipt, setDownloadingReceipt] = useState<string | null>(null);

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
      .select('id, name, amount, currency, course_id, payment_frequency')
      .eq('is_active', true);

    if (data) setFeeStructures(data as FeeStructure[]);
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

  const generateReceiptNumber = async (): Promise<string> => {
    const year = new Date().getFullYear();
    
    const { count } = await supabase
      .from('fee_payments')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${year}-01-01`)
      .lte('created_at', `${year}-12-31`);

    const nextNumber = (count || 0) + 1;
    const paddedNumber = nextNumber.toString().padStart(5, '0');
    
    return `MT-${year}-${paddedNumber}`;
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentFee) return;

    const amount = parseFloat(paymentForm.amount);
    const receiptNumber = paymentForm.receipt_number || await generateReceiptNumber();

    const { data: paymentData, error: paymentError } = await supabase
      .from('fee_payments')
      .insert({
        student_fee_id: selectedStudentFee.id,
        user_id: selectedStudentFee.user_id,
        amount,
        payment_method: paymentForm.payment_method,
        transaction_reference: paymentForm.transaction_reference || null,
        receipt_number: receiptNumber,
        notes: paymentForm.notes || null,
        recorded_by: user?.id,
      })
      .select()
      .single();

    if (paymentError) {
      toast.error('Failed to record payment');
      return;
    }

    const newAmountPaid = selectedStudentFee.amount_paid + amount;
    const newBalance = selectedStudentFee.amount_due - newAmountPaid;
    const newStatus = newBalance <= 0 ? 'paid' : 'partial';

    // Balance is a generated column - only update amount_paid and status
    await supabase
      .from('student_fees')
      .update({ amount_paid: newAmountPaid, status: newStatus })
      .eq('id', selectedStudentFee.id);

    // Send payment receipt email
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', selectedStudentFee.user_id)
        .single();

      if (profile?.email) {
        await supabase.functions.invoke('send-payment-receipt', {
          body: {
            paymentId: paymentData.id,
            email: profile.email,
            studentName: profile.full_name,
            receiptNumber,
            amount,
            currency: selectedStudentFee.fee_structures?.currency || 'KES',
            courseName: selectedStudentFee.courses?.title || 'General Fee',
            feeName: selectedStudentFee.fee_structures?.name || 'Fee Payment',
            paymentMethod: paymentForm.payment_method,
            paymentDate: new Date().toISOString(),
            transactionRef: paymentForm.transaction_reference,
            totalFees: selectedStudentFee.amount_due,
            totalPaid: newAmountPaid,
            balance: newBalance,
          },
        });
      }
    } catch (emailError) {
      console.error('Failed to send receipt email:', emailError);
    }

    toast.success(`Payment recorded. Receipt: ${receiptNumber}`);
    fetchStudentFees();
    fetchPayments();
    setPaymentDialogOpen(false);
    setPaymentForm({ amount: '', payment_method: 'mpesa', transaction_reference: '', receipt_number: '', notes: '' });
    setSelectedStudentFee(null);
  };

  const handleDeleteFee = async () => {
    if (!feeToDelete) return;
    setIsDeleting(true);
    try {
      // Delete related payments first
      await supabase.from('fee_payments').delete().eq('student_fee_id', feeToDelete.id);
      
      // Delete the fee
      const { error } = await supabase.from('student_fees').delete().eq('id', feeToDelete.id);
      if (error) throw error;
      
      toast.success('Fee record deleted');
      fetchStudentFees();
      fetchPayments();
    } catch (error: any) {
      toast.error('Failed to delete fee: ' + error.message);
    } finally {
      setIsDeleting(false);
      setFeeToDelete(null);
    }
  };

  const handleDeletePayment = async () => {
    if (!paymentToDelete) return;
    setIsDeleting(true);
    try {
      // Get the student fee to update balance
      const { data: studentFee } = await supabase
        .from('student_fees')
        .select('*')
        .eq('id', paymentToDelete.student_fee_id)
        .single();

      // Delete the payment
      const { error } = await supabase.from('fee_payments').delete().eq('id', paymentToDelete.id);
      if (error) throw error;

      // Update student fee - balance is a generated column, auto-calculated
      if (studentFee) {
        const newAmountPaid = studentFee.amount_paid - paymentToDelete.amount;
        const newBalance = studentFee.amount_due - newAmountPaid;
        const newStatus = newBalance <= 0 ? 'paid' : newAmountPaid > 0 ? 'partial' : 'pending';

        await supabase
          .from('student_fees')
          .update({ amount_paid: newAmountPaid, status: newStatus })
          .eq('id', studentFee.id);
      }

      toast.success('Payment deleted');
      fetchStudentFees();
      fetchPayments();
    } catch (error: any) {
      toast.error('Failed to delete payment: ' + error.message);
    } finally {
      setIsDeleting(false);
      setPaymentToDelete(null);
    }
  };

  const handleDownloadReceipt = async (paymentId: string) => {
    setDownloadingReceipt(paymentId);
    try {
      await downloadReceiptForPayment(paymentId);
      toast.success('Receipt downloaded');
    } catch (error: any) {
      toast.error('Failed to download receipt: ' + error.message);
    } finally {
      setDownloadingReceipt(null);
    }
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
    return <Badge variant={variants[status] || 'outline'} className="text-xs">{status}</Badge>;
  };

  const formatCurrency = (amount: number, currency = 'KES') => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate analytics
  const totalDue = studentFees.reduce((sum, f) => sum + f.amount_due, 0);
  const totalPaid = studentFees.reduce((sum, f) => sum + f.amount_paid, 0);
  const totalBalance = studentFees.reduce((sum, f) => sum + f.balance, 0);
  const collectionRate = totalDue > 0 ? (totalPaid / totalDue) * 100 : 0;
  
  const paidFees = studentFees.filter(f => f.status === 'paid').length;
  const partialFees = studentFees.filter(f => f.status === 'partial').length;
  const pendingFees = studentFees.filter(f => f.status === 'pending').length;
  const overdueFees = studentFees.filter(f => f.status === 'overdue').length;

  // This month payments
  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());
  const thisMonthPayments = payments.filter(p => {
    const pDate = new Date(p.payment_date);
    return pDate >= monthStart && pDate <= monthEnd;
  });
  const thisMonthTotal = thisMonthPayments.reduce((sum, p) => sum + p.amount, 0);

  // Last 7 days payments
  const last7Days = subDays(new Date(), 7);
  const recentPayments = payments.filter(p => new Date(p.payment_date) >= last7Days);
  const recentTotal = recentPayments.reduce((sum, p) => sum + p.amount, 0);

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

  const sendOverdueReminders = async () => {
    setSendingReminders(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-overdue-reminders', {
        method: 'POST',
      });

      if (error) throw error;
      toast.success(`Sent ${data?.sent || 0} overdue payment reminders`);
    } catch (error) {
      console.error('Error sending reminders:', error);
      toast.error('Failed to send reminders');
    } finally {
      setSendingReminders(false);
    }
  };

  const generateBrandedFeeStructures = async () => {
    setGeneratingFees(true);
    try {
      const existingFees = await supabase.from('fee_structures').select('name');
      const existingNames = new Set(existingFees.data?.map(f => f.name) || []);

      const feesToCreate: Array<{
        name: string;
        amount: number;
        currency: string;
        description: string;
        payment_frequency: string;
        is_active: boolean;
      }> = [];

      for (const school of websiteCourses) {
        for (const course of school.courses) {
          const courseData = course as { name: string; level: string; fee: number; isMonthly?: boolean };
          
          if (courseData.isMonthly) {
            const monthName = `${courseData.name} - ${courseData.level} (Per Month)`;
            if (!existingNames.has(monthName)) {
              feesToCreate.push({
                name: monthName,
                amount: courseData.fee,
                currency: 'KES',
                description: `${school.school} - ${courseData.level} level course. Monthly fee.`,
                payment_frequency: 'per_month',
                is_active: true,
              });
            }
          } else {
            const termName = `${courseData.name} - ${courseData.level} (Per Term)`;
            if (!existingNames.has(termName)) {
              feesToCreate.push({
                name: termName,
                amount: courseData.fee,
                currency: 'KES',
                description: `${school.school} - ${courseData.level} level course. Fee per term (3 months).`,
                payment_frequency: 'per_term',
                is_active: true,
              });
            }

            const monthName = `${courseData.name} - ${courseData.level} (Per Month)`;
            if (!existingNames.has(monthName)) {
              feesToCreate.push({
                name: monthName,
                amount: Math.ceil(courseData.fee / 3),
                currency: 'KES',
                description: `${school.school} - ${courseData.level} level course. Monthly installment.`,
                payment_frequency: 'per_month',
                is_active: true,
              });
            }
          }
        }
      }

      if (feesToCreate.length === 0) {
        toast.info('All fee structures already exist');
        return;
      }

      const { error } = await supabase.from('fee_structures').insert(feesToCreate);
      if (error) throw error;

      toast.success(`Created ${feesToCreate.length} fee structures`);
      fetchFeeStructures();
    } catch (error) {
      console.error('Error generating fee structures:', error);
      toast.error('Failed to generate fee structures');
    } finally {
      setGeneratingFees(false);
    }
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
      <div className="space-y-4 sm:space-y-6 w-full min-w-0 overflow-hidden">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Accounting Dashboard</h1>
            <p className="text-sm text-muted-foreground">Manage student fees, payments and financial reports</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={sendOverdueReminders}
              disabled={sendingReminders}
            >
              {sendingReminders ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Bell className="h-4 w-4 mr-2" />
              )}
              <span className="hidden sm:inline">Send</span> Reminders
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={generateBrandedFeeStructures}
              disabled={generatingFees}
            >
              {generatingFees ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              <span className="hidden sm:inline">Auto-Generate</span> Fees
            </Button>
            <FeeStructurePDF />
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Assign Fee</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md mx-4">
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

        {/* Financial Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="overflow-hidden">
            <CardHeader className="pb-2 p-3 sm:p-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 flex-shrink-0" />
                <span>Total Due</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-sm sm:text-lg lg:text-xl font-bold break-all">{formatCurrency(totalDue)}</div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden">
            <CardHeader className="pb-2 p-3 sm:p-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                <span>Collected</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-sm sm:text-lg lg:text-xl font-bold text-green-600 break-all">{formatCurrency(totalPaid)}</div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden">
            <CardHeader className="pb-2 p-3 sm:p-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Receipt className="h-3.5 w-3.5 text-orange-600 flex-shrink-0" />
                <span>Outstanding</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-sm sm:text-lg lg:text-xl font-bold text-orange-600 break-all">{formatCurrency(totalBalance)}</div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden">
            <CardHeader className="pb-2 p-3 sm:p-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 flex-shrink-0" />
                <span>Students</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-sm sm:text-lg lg:text-xl font-bold">{new Set(studentFees.map(f => f.user_id)).size}</div>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Collection Rate */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-2 p-3 sm:p-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <PieChart className="h-4 w-4 text-primary flex-shrink-0" />
                <span>Collection Rate</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-xl sm:text-2xl font-bold">{collectionRate.toFixed(1)}%</div>
                  <Progress value={collectionRate} className="mt-2" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2 truncate">
                {formatCurrency(totalPaid)} of {formatCurrency(totalDue)}
              </p>
            </CardContent>
          </Card>

          {/* This Month */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-2 p-3 sm:p-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
                <span>This Month</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-xl sm:text-2xl font-bold text-green-600 break-all">{formatCurrency(thisMonthTotal)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {thisMonthPayments.length} payments received
              </p>
              <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                <ArrowUpRight className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{format(new Date(), 'MMMM yyyy')}</span>
              </div>
            </CardContent>
          </Card>

          {/* Last 7 Days */}
          <Card className="overflow-hidden sm:col-span-2 lg:col-span-1">
            <CardHeader className="pb-2 p-3 sm:p-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary flex-shrink-0" />
                <span>Last 7 Days</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-xl sm:text-2xl font-bold break-all">{formatCurrency(recentTotal)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {recentPayments.length} transactions
              </p>
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{format(last7Days, 'MMM dd')} - {format(new Date(), 'MMM dd')}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Fee Status Summary */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2 p-3 sm:p-4">
            <CardTitle className="text-sm">Fee Status Summary</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                <CheckCircle2 className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-lg sm:text-xl font-bold text-green-700 dark:text-green-400">{paidFees}</p>
                  <p className="text-xs text-green-600 truncate">Paid</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg">
                <CreditCard className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-lg sm:text-xl font-bold text-yellow-700 dark:text-yellow-400">{partialFees}</p>
                  <p className="text-xs text-yellow-600 truncate">Partial</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-lg sm:text-xl font-bold text-blue-700 dark:text-blue-400">{pendingFees}</p>
                  <p className="text-xs text-blue-600 truncate">Pending</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-red-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-lg sm:text-xl font-bold text-red-700 dark:text-red-400">{overdueFees}</p>
                  <p className="text-xs text-red-600 truncate">Overdue</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Details */}
        <PaymentDetailsCard />

        <Tabs defaultValue="fees" className="space-y-4">
          <TabsList className="w-full sm:w-auto overflow-x-auto">
            <TabsTrigger value="fees" className="text-xs sm:text-sm">Student Fees</TabsTrigger>
            <TabsTrigger value="payments" className="text-xs sm:text-sm">Payments</TabsTrigger>
            <TabsTrigger value="reconciliation" className="text-xs sm:text-sm">Reconciliation</TabsTrigger>
            <TabsTrigger value="sponsored" className="text-xs sm:text-sm">Sponsored</TabsTrigger>
            <TabsTrigger value="expenses" className="text-xs sm:text-sm">Expenses</TabsTrigger>
          </TabsList>

          <TabsContent value="fees" className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Card>
              <CardContent className="p-4 sm:p-6">
                {filteredFees.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No student fees assigned yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <div className="min-w-[700px] px-4 sm:px-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Student</TableHead>
                            <TableHead>Fee Type</TableHead>
                            <TableHead className="text-right">Due</TableHead>
                            <TableHead className="text-right">Paid</TableHead>
                            <TableHead className="text-right">Balance</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredFees.map((fee) => (
                            <TableRow key={fee.id}>
                              <TableCell>
                                <div className="min-w-[120px]">
                                  <p className="font-medium text-sm truncate">{fee.profiles?.full_name || 'Unknown'}</p>
                                  <p className="text-xs text-muted-foreground truncate">{fee.profiles?.email}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="min-w-[100px]">
                                  <p className="font-medium text-sm truncate">{fee.fee_structures?.name || 'Custom'}</p>
                                  {fee.courses && (
                                    <p className="text-xs text-muted-foreground truncate">{fee.courses.title}</p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-semibold text-sm whitespace-nowrap">
                                {formatCurrency(fee.amount_due, fee.fee_structures?.currency)}
                              </TableCell>
                              <TableCell className="text-right text-green-600 text-sm whitespace-nowrap">
                                {formatCurrency(fee.amount_paid, fee.fee_structures?.currency)}
                              </TableCell>
                              <TableCell className="text-right font-semibold text-orange-600 text-sm whitespace-nowrap">
                                {formatCurrency(fee.balance, fee.fee_structures?.currency)}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  {fee.balance > 0 && (
                                    <Button size="sm" onClick={() => openPaymentDialog(fee)}>
                                      <CreditCard className="h-4 w-4 sm:mr-1" />
                                      <span className="hidden sm:inline">Receive</span>
                                    </Button>
                                  )}
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    onClick={() => setFeeToDelete(fee)}
                                    className="text-destructive hover:text-destructive"
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
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Recent Payments</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                {payments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No payments recorded yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <div className="min-w-[600px] px-4 sm:px-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Student</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead>Reference</TableHead>
                            <TableHead>Receipt</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {payments.map((payment) => (
                            <TableRow key={payment.id}>
                              <TableCell className="whitespace-nowrap text-sm">
                                {format(new Date(payment.payment_date), 'MMM d, yyyy')}
                              </TableCell>
                              <TableCell>
                                <div className="min-w-[100px]">
                                  <p className="font-medium text-sm truncate">{payment.profiles?.full_name || 'Unknown'}</p>
                                  <p className="text-xs text-muted-foreground truncate">{payment.profiles?.email}</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-semibold text-green-600 whitespace-nowrap text-sm">
                                {formatCurrency(payment.amount)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">{payment.payment_method || 'N/A'}</Badge>
                              </TableCell>
                              <TableCell className="text-xs font-mono truncate max-w-[100px]">
                                {payment.transaction_reference || '-'}
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDownloadReceipt(payment.id)}
                                  disabled={downloadingReceipt === payment.id}
                                  title="Download Receipt"
                                >
                                  {downloadingReceipt === payment.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Download className="h-4 w-4" />
                                  )}
                                </Button>
                              </TableCell>
                              <TableCell>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  onClick={() => setPaymentToDelete(payment)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reconciliation">
            <ReconciliationTable />
          </TabsContent>

          <TabsContent value="sponsored">
            <SponsoredStudentsSection />
          </TabsContent>

          <TabsContent value="expenses">
            <ExpensesSection />
          </TabsContent>
        </Tabs>

        {/* Payment Dialog */}
        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent className="max-w-md mx-4">
            <DialogHeader>
              <DialogTitle>Receive Payment</DialogTitle>
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
                  <Label>Receipt Number (auto-generated if empty)</Label>
                  <Input
                    value={paymentForm.receipt_number}
                    onChange={(e) => setPaymentForm({ ...paymentForm, receipt_number: e.target.value })}
                    placeholder="Auto-generated"
                  />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full">Receive Payment</Button>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Fee Confirmation */}
        <AlertDialog open={!!feeToDelete} onOpenChange={() => setFeeToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Fee Record</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this fee record for{' '}
                <strong>{feeToDelete?.profiles?.full_name}</strong>?
                This will also delete all associated payments.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteFee}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Payment Confirmation */}
        <AlertDialog open={!!paymentToDelete} onOpenChange={() => setPaymentToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Payment</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this payment of{' '}
                <strong>{formatCurrency(paymentToDelete?.amount || 0)}</strong>?
                The student's balance will be updated accordingly.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeletePayment}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </LMSLayout>
  );
};

export default Accounting;
