import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard, AlertTriangle, CheckCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface PendingFeesCardProps {
  userId: string;
}

const PendingFeesCard = ({ userId }: PendingFeesCardProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [fees, setFees] = useState({
    totalDue: 0,
    totalPaid: 0,
    balance: 0,
    overdueCount: 0,
    currency: 'KES',
  });

  useEffect(() => {
    fetchFees();
  }, [userId]);

  const fetchFees = async () => {
    try {
      const { data, error } = await supabase
        .from('student_fees')
        .select(`
          amount_due,
          amount_paid,
          balance,
          status,
          due_date,
          fee_structures (
            currency
          )
        `)
        .eq('user_id', userId);

      if (error) throw error;

      const totalDue = data?.reduce((sum, f) => sum + Number(f.amount_due), 0) || 0;
      const totalPaid = data?.reduce((sum, f) => sum + Number(f.amount_paid), 0) || 0;
      const balance = data?.reduce((sum, f) => sum + Number(f.balance || 0), 0) || 0;
      const overdueCount = data?.filter(f => 
        f.status !== 'paid' && f.due_date && new Date(f.due_date) < new Date()
      ).length || 0;
      const currency = data?.[0]?.fee_structures?.currency || 'KES';

      setFees({ totalDue, totalPaid, balance, overdueCount, currency });
    } catch (error) {
      console.error('Error fetching fees:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: fees.currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-28 mb-2" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    );
  }

  const isPaid = fees.balance <= 0;

  return (
    <Card className={fees.overdueCount > 0 ? 'border-destructive/50' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Fee Balance
          </span>
          {fees.overdueCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {fees.overdueCount} Overdue
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isPaid ? (
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <CheckCircle className="h-5 w-5" />
            <span className="font-semibold">All fees paid</span>
          </div>
        ) : (
          <>
            <p className="text-2xl font-bold text-destructive mb-1">
              {formatCurrency(fees.balance)}
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              Paid: {formatCurrency(fees.totalPaid)} / {formatCurrency(fees.totalDue)}
            </p>
          </>
        )}
        <Button 
          variant={isPaid ? "outline" : "default"} 
          size="sm" 
          className="w-full"
          onClick={() => navigate('/lms/fees')}
        >
          {isPaid ? 'View Payment History' : 'Pay Now'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default PendingFeesCard;
