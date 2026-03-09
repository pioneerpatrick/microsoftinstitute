import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, XCircle, Clock, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface PaymentForReconciliation {
  id: string;
  amount: number;
  payment_method: string | null;
  transaction_reference: string | null;
  receipt_number: string | null;
  payment_date: string;
  notes: string | null;
  user_id: string;
  student_fee_id: string;
  reconciliation_status?: string;
  profiles?: { full_name: string | null; email: string | null } | null;
  student_fees?: { amount_due: number; amount_paid: number; balance: number; courses?: { title: string } | null } | null;
}

const ReconciliationTable = () => {
  const [payments, setPayments] = useState<PaymentForReconciliation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('pending');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPayments();
    // Real-time subscription
    const channel = supabase
      .channel('admin-payments-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fee_payments' }, () => fetchPayments())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchPayments = async () => {
    const { data } = await supabase
      .from('fee_payments')
      .select('*')
      .order('payment_date', { ascending: false })
      .limit(200);

    if (data) {
      const userIds = [...new Set(data.map(p => p.user_id))];
      const feeIds = [...new Set(data.map(p => p.student_fee_id))];

      const [profilesRes, feesRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email').in('id', userIds),
        supabase.from('student_fees').select('id, amount_due, amount_paid, balance, courses(title)').in('id', feeIds),
      ]);

      const profileMap = new Map(profilesRes.data?.map(p => [p.id, p]) || []);
      const feeMap = new Map(feesRes.data?.map(f => [f.id, f]) || []);

      const enriched = data.map(p => ({
        ...p,
        reconciliation_status: p.notes?.includes('[RECONCILED]') ? 'reconciled' : p.notes?.includes('[REJECTED]') ? 'rejected' : 'pending',
        profiles: profileMap.get(p.user_id) || null,
        student_fees: feeMap.get(p.student_fee_id) || null,
      }));

      setPayments(enriched);
    }
    setLoading(false);
  };

  const updateReconciliation = async (paymentId: string, status: 'reconciled' | 'rejected') => {
    setUpdatingId(paymentId);
    try {
      const payment = payments.find(p => p.id === paymentId);
      if (!payment) return;

      // Clean existing tags and add new one
      let notes = (payment.notes || '').replace(/\[(RECONCILED|REJECTED|PENDING)\]/g, '').trim();
      notes = `[${status.toUpperCase()}] ${notes}`;

      await supabase.from('fee_payments').update({ notes }).eq('id', paymentId);

      if (status === 'rejected' && payment.student_fees) {
        // Reverse the payment
        const newPaid = payment.student_fees.amount_paid - payment.amount;
        const newBal = payment.student_fees.amount_due - newPaid;
        await supabase.from('student_fees').update({
          amount_paid: Math.max(0, newPaid),
          status: newPaid <= 0 ? 'pending' : newBal <= 0 ? 'paid' : 'partial',
        }).eq('id', payment.student_fee_id);
      }

      toast.success(`Payment ${status}`);
      fetchPayments();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = payments.filter(p => {
    if (filter === 'all') return true;
    return p.reconciliation_status === filter;
  });

  const pendingCount = payments.filter(p => p.reconciliation_status === 'pending').length;

  if (loading) {
    return <Card><CardContent className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Payment Reconciliation
            {pendingCount > 0 && (
              <Badge variant="destructive" className="text-xs">{pendingCount} pending</Badge>
            )}
          </CardTitle>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="reconciled">Reconciled</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="p-4">
        {filtered.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No {filter} payments to reconcile</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Receipt</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(p => (
                  <TableRow key={p.id} className={p.reconciliation_status === 'pending' ? 'bg-yellow-50/50 dark:bg-yellow-950/10' : ''}>
                    <TableCell className="text-xs whitespace-nowrap">{format(new Date(p.payment_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      <p className="text-sm font-medium truncate max-w-[120px]">{p.profiles?.full_name || 'Unknown'}</p>
                    </TableCell>
                    <TableCell className="text-xs truncate max-w-[100px]">{p.student_fees?.courses?.title || '-'}</TableCell>
                    <TableCell className="text-right font-semibold text-green-600 text-sm whitespace-nowrap">
                      KES {p.amount.toLocaleString()}
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{p.payment_method || 'N/A'}</Badge></TableCell>
                    <TableCell className="text-xs font-mono truncate max-w-[90px]">{p.transaction_reference || '-'}</TableCell>
                    <TableCell className="text-xs font-mono">{p.receipt_number || '-'}</TableCell>
                    <TableCell className="text-xs text-orange-600 font-semibold whitespace-nowrap">
                      KES {(p.student_fees?.balance || 0).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {p.reconciliation_status === 'reconciled' && <Badge className="bg-green-500 text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Verified</Badge>}
                      {p.reconciliation_status === 'rejected' && <Badge variant="destructive" className="text-xs"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>}
                      {p.reconciliation_status === 'pending' && <Badge variant="secondary" className="text-xs"><Clock className="h-3 w-3 mr-1" />Pending</Badge>}
                    </TableCell>
                    <TableCell>
                      {p.reconciliation_status === 'pending' && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-green-600 hover:text-green-700"
                            onClick={() => updateReconciliation(p.id, 'reconciled')}
                            disabled={updatingId === p.id}
                          >
                            {updatingId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive/80"
                            onClick={() => updateReconciliation(p.id, 'rejected')}
                            disabled={updatingId === p.id}
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
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

export default ReconciliationTable;
