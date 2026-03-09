import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard, Wallet, AlertCircle, CheckCircle, Loader2, Building2, Smartphone, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface QuickPayFeesCardProps {
  userId: string;
}

interface FeeRecord {
  id: string;
  amount_due: number;
  amount_paid: number;
  balance: number | null;
  status: string;
  courses?: { title: string } | null;
  fee_structures?: { name: string; currency: string } | null;
}

const QuickPayFeesCard = ({ userId }: QuickPayFeesCardProps) => {
  const navigate = useNavigate();
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [selectedFee, setSelectedFee] = useState<FeeRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'mpesa',
    transaction_reference: '',
  });

  useEffect(() => {
    fetchFees();
    // Real-time subscription for fee updates
    const channel = supabase
      .channel('student-fees-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_fees', filter: `user_id=eq.${userId}` }, () => fetchFees())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fee_payments', filter: `user_id=eq.${userId}` }, () => fetchFees())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const fetchFees = async () => {
    const { data } = await supabase
      .from('student_fees')
      .select('id, amount_due, amount_paid, balance, status, courses(title), fee_structures(name, currency)')
      .eq('user_id', userId)
      .neq('status', 'paid');
    if (data) setFees(data as FeeRecord[]);
    setLoading(false);
  };

  const totalBalance = fees.reduce((s, f) => s + (f.balance || 0), 0);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(label);
    toast.success(`${label} copied!`);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  const openPayDialog = (fee: FeeRecord) => {
    setSelectedFee(fee);
    setPaymentForm({ amount: (fee.balance || 0).toString(), payment_method: 'mpesa', transaction_reference: '' });
    setPayDialogOpen(true);
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFee) return;

    const amount = parseFloat(paymentForm.amount);
    if (isNaN(amount) || amount <= 0) { toast.error('Enter a valid amount'); return; }
    if (amount > (selectedFee.balance || 0)) { toast.error('Amount exceeds balance'); return; }
    if (!paymentForm.transaction_reference.trim()) { toast.error('Enter transaction reference'); return; }

    setSubmitting(true);
    try {
      const year = new Date().getFullYear();
      const { count } = await supabase.from('fee_payments').select('*', { count: 'exact', head: true }).gte('created_at', `${year}-01-01`).lte('created_at', `${year}-12-31`);
      const receiptNumber = `MT-${year}-${((count || 0) + 1).toString().padStart(5, '0')}`;

      const { error: payErr } = await supabase.from('fee_payments').insert({
        student_fee_id: selectedFee.id,
        user_id: userId,
        amount,
        payment_method: paymentForm.payment_method,
        transaction_reference: paymentForm.transaction_reference,
        receipt_number: receiptNumber,
        notes: 'Self-service payment from dashboard',
      });
      if (payErr) throw payErr;

      const newPaid = selectedFee.amount_paid + amount;
      const newBal = selectedFee.amount_due - newPaid;
      await supabase.from('student_fees').update({
        amount_paid: newPaid,
        status: newBal <= 0 ? 'paid' : 'partial',
      }).eq('id', selectedFee.id);

      toast.success(`Payment recorded! Receipt: ${receiptNumber}`);
      setPayDialogOpen(false);
      fetchFees();
    } catch (err: any) {
      toast.error(err.message || 'Payment failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  return (
    <>
      <Card className="overflow-hidden border-2 border-orange-200 dark:border-orange-800/50">
        <CardHeader className="pb-2 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="h-5 w-5 text-orange-600" />
            Pay Fees
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {fees.length === 0 ? (
            <div className="text-center py-3">
              <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">All fees paid!</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">Total Balance</span>
                <span className="text-lg font-bold text-orange-600">KES {totalBalance.toLocaleString()}</span>
              </div>
              <div className="space-y-2 mb-3">
                {fees.slice(0, 2).map(fee => (
                  <div key={fee.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{fee.fee_structures?.name || fee.courses?.title || 'Fee'}</p>
                      <p className="text-xs text-muted-foreground">Bal: KES {(fee.balance || 0).toLocaleString()}</p>
                    </div>
                    <Button size="sm" variant="default" className="ml-2 h-7 text-xs" onClick={() => openPayDialog(fee)}>
                      Pay
                    </Button>
                  </div>
                ))}
              </div>
              {fees.length > 2 && (
                <Button variant="link" size="sm" className="w-full text-xs" onClick={() => navigate('/lms/fees')}>
                  View all {fees.length} outstanding fees →
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Pay Dialog */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Make Payment
            </DialogTitle>
          </DialogHeader>

          {selectedFee && (
            <>
              {/* Balance display */}
              <div className="bg-orange-50 dark:bg-orange-950/30 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
                <p className="text-sm text-muted-foreground">{selectedFee.fee_structures?.name || 'Fee'}</p>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-sm">Outstanding Balance:</span>
                  <span className="text-xl font-bold text-orange-600">KES {(selectedFee.balance || 0).toLocaleString()}</span>
                </div>
              </div>

              {/* Payment accounts */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                  <Smartphone className="h-5 w-5 text-green-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-green-800 dark:text-green-300">M-Pesa Paybill</p>
                    <p className="text-xs">Business: <strong>889100</strong> | Account: <strong>9067620016</strong></p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard('889100', 'Paybill')}>
                    {copiedItem === 'Paybill' ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
                <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                  <Building2 className="h-5 w-5 text-blue-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-blue-800 dark:text-blue-300">Bank Transfer - NCBA</p>
                    <p className="text-xs">Acc: <strong>9067620016</strong> | Branch: <strong>216</strong></p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard('9067620016', 'Account')}>
                    {copiedItem === 'Account' ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>

              <form onSubmit={handlePay} className="space-y-3">
                <div className="p-2 bg-yellow-50 dark:bg-yellow-950/30 rounded border border-yellow-200 dark:border-yellow-800">
                  <p className="text-xs text-yellow-800 dark:text-yellow-300">
                    <strong>Step 1:</strong> Pay via M-Pesa or Bank above. <strong>Step 2:</strong> Enter details below.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Amount (KES)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    max={selectedFee.balance || 0}
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    required
                  />
                  {paymentForm.amount && (
                    <p className="text-xs text-muted-foreground">
                      New balance after payment: <strong>KES {Math.max(0, (selectedFee.balance || 0) - (parseFloat(paymentForm.amount) || 0)).toLocaleString()}</strong>
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Payment Method</Label>
                  <Select value={paymentForm.payment_method} onValueChange={v => setPaymentForm({ ...paymentForm, payment_method: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mpesa">M-Pesa</SelectItem>
                      <SelectItem value="bank">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Transaction Reference / M-Pesa Code *</Label>
                  <Input
                    value={paymentForm.transaction_reference}
                    onChange={(e) => setPaymentForm({ ...paymentForm, transaction_reference: e.target.value.toUpperCase() })}
                    placeholder="e.g., SGH7K4M2XY"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</> : <><CheckCircle className="h-4 w-4 mr-2" /> Submit Payment</>}
                </Button>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default QuickPayFeesCard;
