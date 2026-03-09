import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Heart, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface SponsoredFee {
  id: string;
  user_id: string;
  amount_due: number;
  sponsorship_amount: number;
  sponsor_name: string | null;
  is_sponsored: boolean;
  balance: number;
  status: string;
  profiles?: { full_name: string | null; email: string | null } | null;
  courses?: { title: string } | null;
  fee_structures?: { name: string; currency: string } | null;
}

interface Student {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface FeeStructure {
  id: string;
  name: string;
  amount: number;
  currency: string;
  course_id: string | null;
}

const SponsoredStudentsSection = () => {
  const [sponsored, setSponsored] = useState<SponsoredFee[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    user_id: '',
    fee_structure_id: '',
    sponsor_name: '',
    sponsorship_amount: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [feesRes, studentsRes, structuresRes] = await Promise.all([
      supabase.from('student_fees').select('*, courses(title), fee_structures(name, currency)').eq('is_sponsored', true),
      supabase.from('profiles').select('id, full_name, email').order('full_name'),
      supabase.from('fee_structures').select('id, name, amount, currency, course_id').eq('is_active', true),
    ]);

    if (feesRes.data) {
      const userIds = [...new Set(feesRes.data.map(f => f.user_id))];
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').in('id', userIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      setSponsored(feesRes.data.map(f => ({ ...f, profiles: profileMap.get(f.user_id) || null })) as SponsoredFee[]);
    }
    if (studentsRes.data) setStudents(studentsRes.data);
    if (structuresRes.data) setFeeStructures(structuresRes.data as FeeStructure[]);
    setLoading(false);
  };

  const totalSponsored = sponsored.reduce((s, f) => s + (f.sponsorship_amount || 0), 0);

  const handleAdmitSponsored = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const selectedFee = feeStructures.find(f => f.id === form.fee_structure_id);
      const sponsorAmount = parseFloat(form.sponsorship_amount) || selectedFee?.amount || 0;

      const { error } = await supabase.from('student_fees').insert({
        user_id: form.user_id,
        fee_structure_id: form.fee_structure_id,
        course_id: selectedFee?.course_id || null,
        amount_due: selectedFee?.amount || 0,
        amount_paid: sponsorAmount,
        status: sponsorAmount >= (selectedFee?.amount || 0) ? 'paid' : 'partial',
        is_sponsored: true,
        sponsor_name: form.sponsor_name,
        sponsorship_amount: sponsorAmount,
      });

      if (error) throw error;

      toast.success('Sponsored student admitted successfully');
      setDialogOpen(false);
      setForm({ user_id: '', fee_structure_id: '', sponsor_name: '', sponsorship_amount: '' });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to admit sponsored student');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => `KES ${amount.toLocaleString()}`;

  if (loading) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-500" />
            Sponsored Students
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Total sponsored: <strong>{formatCurrency(totalSponsored)}</strong> across {sponsored.length} students
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> Admit Sponsored
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-pink-500" />
                Admit Sponsored Student
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdmitSponsored} className="space-y-4">
              <div>
                <Label>Student *</Label>
                <Select value={form.user_id} onValueChange={v => setForm({ ...form, user_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                  <SelectContent>
                    {students.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.full_name || s.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fee Structure *</Label>
                <Select
                  value={form.fee_structure_id}
                  onValueChange={v => {
                    const fee = feeStructures.find(f => f.id === v);
                    setForm({ ...form, fee_structure_id: v, sponsorship_amount: fee?.amount.toString() || '' });
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Select fee" /></SelectTrigger>
                  <SelectContent>
                    {feeStructures.map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.name} - {formatCurrency(f.amount)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sponsor Name *</Label>
                <Input
                  value={form.sponsor_name}
                  onChange={e => setForm({ ...form, sponsor_name: e.target.value })}
                  placeholder="e.g., Government Bursary, HELB, Company Name"
                  required
                />
              </div>
              <div>
                <Label>Sponsorship Amount (KES) *</Label>
                <Input
                  type="number"
                  value={form.sponsorship_amount}
                  onChange={e => setForm({ ...form, sponsorship_amount: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Full sponsorship covers the entire fee. Partial sponsorship means the student pays the rest.
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</> : 'Admit Sponsored Student'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-4">
        {sponsored.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No sponsored students yet</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Course / Fee</TableHead>
                  <TableHead>Sponsor</TableHead>
                  <TableHead className="text-right">Fee Amount</TableHead>
                  <TableHead className="text-right">Sponsored</TableHead>
                  <TableHead className="text-right">Student Owes</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sponsored.map(s => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <p className="font-medium text-sm">{s.profiles?.full_name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{s.profiles?.email}</p>
                    </TableCell>
                    <TableCell className="text-sm">{s.fee_structures?.name || s.courses?.title || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        <Heart className="h-3 w-3 mr-1 text-pink-500" />
                        {s.sponsor_name || 'Unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm">{formatCurrency(s.amount_due)}</TableCell>
                    <TableCell className="text-right text-sm font-semibold text-pink-600">{formatCurrency(s.sponsorship_amount)}</TableCell>
                    <TableCell className="text-right text-sm font-semibold text-orange-600">
                      {formatCurrency(Math.max(0, s.amount_due - s.sponsorship_amount))}
                    </TableCell>
                    <TableCell>
                      {s.sponsorship_amount >= s.amount_due ? (
                        <Badge className="bg-green-500 text-xs">Fully Sponsored</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Partial</Badge>
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

export default SponsoredStudentsSection;
