import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import LMSLayout from '@/components/lms/LMSLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, Download, Mail, FileText, CreditCard, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import PaymentInstructionsCard from '@/components/student/PaymentInstructionsCard';
import StudentPaymentForm from '@/components/student/StudentPaymentForm';

interface StudentFee {
  id: string;
  user_id: string;
  course_id: string | null;
  fee_structure_id: string | null;
  amount_due: number;
  amount_paid: number;
  balance: number | null;
  status: string;
  due_date: string | null;
  created_at: string;
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
  student_fees?: { 
    courses?: { title: string } | null;
    fee_structures?: { name: string; currency: string } | null;
  } | null;
}

const StudentFees = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [fees, setFees] = useState<StudentFee[]>([]);
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/lms/login');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchStudentFees();
      fetchPaymentHistory();
    }
  }, [user]);

  const fetchStudentFees = async () => {
    const { data, error } = await supabase
      .from('student_fees')
      .select('*, courses(title), fee_structures(name, currency)')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setFees(data);
    }
    setIsLoading(false);
  };

  const fetchPaymentHistory = async () => {
    const { data, error } = await supabase
      .from('fee_payments')
      .select('*, student_fees(courses(title), fee_structures(name, currency))')
      .eq('user_id', user!.id)
      .order('payment_date', { ascending: false });

    if (!error && data) {
      setPayments(data);
    }
  };

  const handlePaymentSuccess = () => {
    fetchStudentFees();
    fetchPaymentHistory();
  };

  const formatCurrency = (amount: number, currency: string = 'KES') => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 text-xs"><CheckCircle className="h-3 w-3 mr-1" /> Paid</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-100 text-yellow-800 text-xs"><Clock className="h-3 w-3 mr-1" /> Partial</Badge>;
      case 'overdue':
        return <Badge variant="destructive" className="text-xs"><AlertCircle className="h-3 w-3 mr-1" /> Overdue</Badge>;
      default:
        return <Badge variant="outline" className="text-xs"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
    }
  };

  const generateReceiptPDF = (payment: FeePayment) => {
    const doc = new jsPDF();
    const currency = payment.student_fees?.fee_structures?.currency || 'KES';
    
    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT RECEIPT', 105, 30, { align: 'center' });
    
    // Institution name
    doc.setFontSize(14);
    doc.text('Techno Panaly Institute of Technology', 105, 40, { align: 'center' });
    
    // Receipt details
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Receipt No: ${payment.receipt_number || payment.id.slice(0, 8).toUpperCase()}`, 20, 60);
    doc.text(`Date: ${format(new Date(payment.payment_date), 'MMMM dd, yyyy')}`, 20, 68);
    
    // Separator line
    doc.setLineWidth(0.5);
    doc.line(20, 75, 190, 75);
    
    // Payment details
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Payment Details', 20, 85);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const details = [
      ['Course:', payment.student_fees?.courses?.title || 'General Fee'],
      ['Fee Type:', payment.student_fees?.fee_structures?.name || 'N/A'],
      ['Amount Paid:', formatCurrency(payment.amount, currency)],
      ['Payment Method:', payment.payment_method || 'N/A'],
      ['Transaction Ref:', payment.transaction_reference || 'N/A'],
    ];
    
    let yPos = 95;
    details.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, 20, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(value, 70, yPos);
      yPos += 10;
    });
    
    // Notes
    if (payment.notes) {
      yPos += 10;
      doc.setFont('helvetica', 'bold');
      doc.text('Notes:', 20, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(payment.notes, 20, yPos + 8);
    }
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text('This is a computer-generated receipt and does not require a signature.', 105, 270, { align: 'center' });
    doc.text(`Generated on ${format(new Date(), 'MMMM dd, yyyy HH:mm')}`, 105, 276, { align: 'center' });
    
    // Download
    doc.save(`Receipt-${payment.receipt_number || payment.id.slice(0, 8)}.pdf`);
    toast.success('Receipt downloaded successfully');
  };

  const emailReceipt = async (payment: FeePayment) => {
    setSendingEmail(payment.id);
    try {
      const { error } = await supabase.functions.invoke('send-payment-receipt', {
        body: {
          paymentId: payment.id,
          email: user?.email,
          receiptNumber: payment.receipt_number || payment.id.slice(0, 8).toUpperCase(),
          amount: payment.amount,
          currency: payment.student_fees?.fee_structures?.currency || 'KES',
          courseName: payment.student_fees?.courses?.title || 'General Fee',
          feeName: payment.student_fees?.fee_structures?.name || 'Fee Payment',
          paymentMethod: payment.payment_method,
          paymentDate: payment.payment_date,
          transactionRef: payment.transaction_reference,
        },
      });

      if (error) throw error;
      toast.success('Receipt sent to your email');
    } catch (error) {
      console.error('Error sending receipt:', error);
      toast.error('Failed to send receipt email');
    } finally {
      setSendingEmail(null);
    }
  };

  // Calculate totals
  const totalDue = fees.reduce((sum, f) => sum + f.amount_due, 0);
  const totalPaid = fees.reduce((sum, f) => sum + f.amount_paid, 0);
  const totalBalance = fees.reduce((sum, f) => sum + (f.balance || 0), 0);

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
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">My Fees & Payments</h1>
          <p className="text-sm text-muted-foreground">View your fee balance and make payments</p>
        </div>

        {/* Summary Cards - Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <Card>
            <CardHeader className="pb-2 p-4">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">Total Fees</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-lg sm:text-2xl font-bold truncate">{formatCurrency(totalDue)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 p-4">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span className="truncate">Total Paid</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-lg sm:text-2xl font-bold text-green-600 truncate">{formatCurrency(totalPaid)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2 p-4">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-orange-600 flex-shrink-0" />
                <span className="truncate">Balance</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-lg sm:text-2xl font-bold text-orange-600 truncate">{formatCurrency(totalBalance)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Payment Instructions */}
        {totalBalance > 0 && (
          <PaymentInstructionsCard 
            studentEmail={user?.email} 
            balance={totalBalance}
          />
        )}

        <Tabs defaultValue="fees" className="space-y-4">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="fees" className="flex-1 sm:flex-none">Fee Balance</TabsTrigger>
            <TabsTrigger value="payments" className="flex-1 sm:flex-none">Payment History</TabsTrigger>
          </TabsList>

          <TabsContent value="fees">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <FileText className="h-5 w-5" />
                  Current Fees
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                {fees.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No fees assigned to your account.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <div className="min-w-[600px] sm:min-w-0 px-4 sm:px-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="whitespace-nowrap">Fee Type</TableHead>
                            <TableHead className="whitespace-nowrap">Due</TableHead>
                            <TableHead className="whitespace-nowrap">Paid</TableHead>
                            <TableHead className="whitespace-nowrap">Balance</TableHead>
                            <TableHead className="whitespace-nowrap">Status</TableHead>
                            <TableHead className="whitespace-nowrap">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {fees.map((fee) => (
                            <TableRow key={fee.id}>
                              <TableCell>
                                <div className="min-w-[120px]">
                                  <p className="font-medium text-sm truncate">
                                    {fee.fee_structures?.name || 'General Fee'}
                                  </p>
                                  {fee.courses && (
                                    <p className="text-xs text-muted-foreground truncate">
                                      {fee.courses.title}
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-sm">
                                {formatCurrency(fee.amount_due, fee.fee_structures?.currency)}
                              </TableCell>
                              <TableCell className="text-green-600 whitespace-nowrap text-sm">
                                {formatCurrency(fee.amount_paid, fee.fee_structures?.currency)}
                              </TableCell>
                              <TableCell className="font-semibold text-orange-600 whitespace-nowrap text-sm">
                                {formatCurrency(fee.balance || 0, fee.fee_structures?.currency)}
                              </TableCell>
                              <TableCell>{getStatusBadge(fee.status)}</TableCell>
                              <TableCell>
                                <StudentPaymentForm 
                                  fee={fee} 
                                  onPaymentSuccess={handlePaymentSuccess}
                                />
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
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <CreditCard className="h-5 w-5" />
                  Payment History
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                {payments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No payment records found.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <div className="min-w-[600px] sm:min-w-0 px-4 sm:px-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="whitespace-nowrap">Receipt #</TableHead>
                            <TableHead className="whitespace-nowrap">Date</TableHead>
                            <TableHead className="whitespace-nowrap">Fee Type</TableHead>
                            <TableHead className="whitespace-nowrap">Amount</TableHead>
                            <TableHead className="whitespace-nowrap">Method</TableHead>
                            <TableHead className="whitespace-nowrap">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {payments.map((payment) => (
                            <TableRow key={payment.id}>
                              <TableCell className="font-mono text-xs whitespace-nowrap">
                                {payment.receipt_number || payment.id.slice(0, 8).toUpperCase()}
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-sm">
                                {format(new Date(payment.payment_date), 'MMM dd, yyyy')}
                              </TableCell>
                              <TableCell className="min-w-[100px]">
                                <span className="text-sm truncate block max-w-[150px]">
                                  {payment.student_fees?.fee_structures?.name || 'N/A'}
                                </span>
                              </TableCell>
                              <TableCell className="font-semibold text-green-600 whitespace-nowrap text-sm">
                                {formatCurrency(payment.amount, payment.student_fees?.fee_structures?.currency)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs whitespace-nowrap">
                                  {payment.payment_method || 'N/A'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => generateReceiptPDF(payment)}
                                    title="Download Receipt"
                                    className="h-8 w-8 p-0"
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => emailReceipt(payment)}
                                    disabled={sendingEmail === payment.id}
                                    title="Email Receipt"
                                    className="h-8 w-8 p-0"
                                  >
                                    {sendingEmail === payment.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Mail className="h-4 w-4" />
                                    )}
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
        </Tabs>
      </div>
    </LMSLayout>
  );
};

export default StudentFees;
