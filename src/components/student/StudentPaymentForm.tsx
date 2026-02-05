import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface StudentFee {
  id: string;
  user_id: string;
  amount_due: number;
  amount_paid: number;
  balance: number | null;
  status: string;
  fee_structures?: { name: string; currency: string } | null;
  courses?: { title: string } | null;
}

interface StudentPaymentFormProps {
  fee: StudentFee;
  onPaymentSuccess: () => void;
}

const StudentPaymentForm = ({ fee, onPaymentSuccess }: StudentPaymentFormProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: fee.balance?.toString() || '0',
    payment_method: 'mpesa',
    transaction_reference: '',
    notes: '',
  });

  const currency = fee.fee_structures?.currency || 'KES';
  const balance = fee.balance || 0;

  // Generate receipt number in format MT-YYYY-XXXXX
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

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Please log in to make a payment');
      return;
    }

    const amount = parseFloat(paymentForm.amount);
    
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amount > balance) {
      toast.error(`Amount cannot exceed your balance of ${currency} ${balance.toLocaleString()}`);
      return;
    }

    if (!paymentForm.transaction_reference.trim()) {
      toast.error('Please enter the M-Pesa or transaction reference');
      return;
    }

    setSubmitting(true);

    try {
      const receiptNumber = await generateReceiptNumber();

      // Record the payment
      const { error: paymentError } = await supabase
        .from('fee_payments')
        .insert({
          student_fee_id: fee.id,
          user_id: fee.user_id,
          amount,
          payment_method: paymentForm.payment_method,
          transaction_reference: paymentForm.transaction_reference,
          receipt_number: receiptNumber,
          notes: paymentForm.notes || `Self-service payment by student`,
        });

      if (paymentError) throw paymentError;

      // Update student fee balance
      const newAmountPaid = fee.amount_paid + amount;
      const newBalance = fee.amount_due - newAmountPaid;
      const newStatus = newBalance <= 0 ? 'paid' : newBalance < fee.amount_due ? 'partial' : 'pending';

      const { error: updateError } = await supabase
        .from('student_fees')
        .update({
          amount_paid: newAmountPaid,
          balance: newBalance,
          status: newStatus,
        })
        .eq('id', fee.id);

      if (updateError) throw updateError;

      // Send payment receipt email
      try {
        // Get student profile for email
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', fee.user_id)
          .single();

        await supabase.functions.invoke('send-payment-receipt', {
          body: {
            paymentId: fee.id,
            email: user.email,
            studentName: profile?.full_name,
            receiptNumber,
            amount,
            currency,
            courseName: fee.courses?.title || 'General Fee',
            feeName: fee.fee_structures?.name || 'Fee Payment',
            paymentMethod: paymentForm.payment_method,
            paymentDate: new Date().toISOString(),
            transactionRef: paymentForm.transaction_reference,
            totalFees: fee.amount_due,
            totalPaid: newAmountPaid,
            balance: newBalance,
          },
        });
      } catch (emailError) {
        console.error('Failed to send receipt email:', emailError);
      }

      toast.success(
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <div>
            <p className="font-semibold">Payment recorded successfully!</p>
            <p className="text-sm text-muted-foreground">Receipt: {receiptNumber}</p>
          </div>
        </div>
      );

      setOpen(false);
      setPaymentForm({
        amount: '0',
        payment_method: 'mpesa',
        transaction_reference: '',
        notes: '',
      });
      onPaymentSuccess();
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Failed to process payment');
    } finally {
      setSubmitting(false);
    }
  };

  if (balance <= 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <CreditCard className="h-4 w-4" />
          <span className="hidden sm:inline">Pay Now</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md mx-4 sm:mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Submit Payment
          </DialogTitle>
        </DialogHeader>

        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Payment for
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="font-semibold">{fee.fee_structures?.name || 'Fee'}</p>
            {fee.courses && (
              <p className="text-sm text-muted-foreground">{fee.courses.title}</p>
            )}
            <p className="text-lg font-bold text-orange-600">
              Balance: {currency} {balance.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmitPayment} className="space-y-4">
          <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-xs text-yellow-800 dark:text-yellow-300">
              <strong>Important:</strong> Only submit this form after you have completed your M-Pesa or bank payment. Enter the transaction reference from your payment.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Amount ({currency}) *</Label>
            <Input
              type="number"
              step="0.01"
              max={balance}
              value={paymentForm.amount}
              onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
              required
            />
            <p className="text-xs text-muted-foreground">
              Maximum: {currency} {balance.toLocaleString()}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Payment Method *</Label>
            <Select 
              value={paymentForm.payment_method} 
              onValueChange={(v) => setPaymentForm({ ...paymentForm, payment_method: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mpesa">M-Pesa</SelectItem>
                <SelectItem value="bank">Bank Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Transaction Reference / M-Pesa Code *</Label>
            <Input
              value={paymentForm.transaction_reference}
              onChange={(e) => setPaymentForm({ ...paymentForm, transaction_reference: e.target.value.toUpperCase() })}
              placeholder="e.g., SGH7K4M2XY"
              required
            />
            <p className="text-xs text-muted-foreground">
              Enter the M-Pesa confirmation code or bank reference number
            </p>
          </div>

          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Textarea
              value={paymentForm.notes}
              onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
              placeholder="Any additional notes..."
              rows={2}
            />
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirm Payment
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StudentPaymentForm;
