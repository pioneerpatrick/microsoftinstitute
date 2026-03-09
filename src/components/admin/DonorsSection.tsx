import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { HandHeart, Plus, Loader2, Download, DollarSign, TrendingUp, FileText, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import jsPDF from 'jspdf';

interface Sponsor {
  id: string;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  organization: string | null;
  total_pledged: number;
  total_disbursed: number;
  currency: string;
  notes: string | null;
  status: string;
  created_at: string;
}

interface Disbursement {
  id: string;
  sponsor_id: string;
  student_fee_id: string | null;
  amount: number;
  currency: string;
  purpose: string;
  disbursement_date: string;
  receipt_number: string | null;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
  sponsor_name?: string;
}

const DonorsSection = () => {
  const { user } = useAuth();
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [disbursements, setDisbursements] = useState<Disbursement[]>([]);
  const [loading, setLoading] = useState(true);
  const [addSponsorOpen, setAddSponsorOpen] = useState(false);
  const [addDisbursementOpen, setAddDisbursementOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedSponsor, setSelectedSponsor] = useState<Sponsor | null>(null);

  const [sponsorForm, setSponsorForm] = useState({
    name: '', contact_email: '', contact_phone: '', organization: '', total_pledged: '', currency: 'KES', notes: '',
  });
  const [disbursementForm, setDisbursementForm] = useState({
    sponsor_id: '', amount: '', purpose: '', disbursement_date: format(new Date(), 'yyyy-MM-dd'), payment_method: 'bank_transfer', receipt_number: '', notes: '',
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [sponsorsRes, disbursementsRes] = await Promise.all([
      supabase.from('sponsors').select('*').order('created_at', { ascending: false }),
      supabase.from('sponsor_disbursements').select('*').order('disbursement_date', { ascending: false }).limit(200),
    ]);
    if (sponsorsRes.data) setSponsors(sponsorsRes.data as Sponsor[]);
    if (disbursementsRes.data && sponsorsRes.data) {
      const sponsorMap = new Map((sponsorsRes.data as Sponsor[]).map(s => [s.id, s.name]));
      setDisbursements((disbursementsRes.data as Disbursement[]).map(d => ({ ...d, sponsor_name: sponsorMap.get(d.sponsor_id) || 'Unknown' })));
    }
    setLoading(false);
  };

  const handleAddSponsor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase.from('sponsors').insert({
        name: sponsorForm.name,
        contact_email: sponsorForm.contact_email || null,
        contact_phone: sponsorForm.contact_phone || null,
        organization: sponsorForm.organization || null,
        total_pledged: parseFloat(sponsorForm.total_pledged) || 0,
        currency: sponsorForm.currency,
        notes: sponsorForm.notes || null,
      });
      if (error) throw error;
      toast.success('Sponsor/Donor added');
      setAddSponsorOpen(false);
      setSponsorForm({ name: '', contact_email: '', contact_phone: '', organization: '', total_pledged: '', currency: 'KES', notes: '' });
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddDisbursement = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const amount = parseFloat(disbursementForm.amount);
      const receiptNum = disbursementForm.receipt_number || `SD-${format(new Date(), 'yyyy')}-${String(disbursements.length + 1).padStart(5, '0')}`;

      const { error } = await supabase.from('sponsor_disbursements').insert({
        sponsor_id: disbursementForm.sponsor_id,
        amount,
        purpose: disbursementForm.purpose,
        disbursement_date: disbursementForm.disbursement_date,
        payment_method: disbursementForm.payment_method,
        receipt_number: receiptNum,
        notes: disbursementForm.notes || null,
        recorded_by: user?.id,
      });
      if (error) throw error;

      // Update sponsor total_disbursed
      const sponsor = sponsors.find(s => s.id === disbursementForm.sponsor_id);
      if (sponsor) {
        await supabase.from('sponsors').update({ total_disbursed: sponsor.total_disbursed + amount }).eq('id', sponsor.id);
      }

      toast.success(`Disbursement recorded. Receipt: ${receiptNum}`);
      setAddDisbursementOpen(false);
      setDisbursementForm({ sponsor_id: '', amount: '', purpose: '', disbursement_date: format(new Date(), 'yyyy-MM-dd'), payment_method: 'bank_transfer', receipt_number: '', notes: '' });
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const fmt = (amount: number, currency = 'KES') =>
    new Intl.NumberFormat('en-KE', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

  const totalPledged = sponsors.reduce((s, sp) => s + sp.total_pledged, 0);
  const totalDisbursed = sponsors.reduce((s, sp) => s + sp.total_disbursed, 0);
  const totalUnused = totalPledged - totalDisbursed;
  const utilizationRate = totalPledged > 0 ? (totalDisbursed / totalPledged) * 100 : 0;

  const generatePDFReport = (sponsor?: Sponsor) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    // Header
    doc.setFillColor(30, 58, 95);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Microsoft Institute of Technology', pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.text(sponsor ? `Sponsor Audit Report: ${sponsor.name}` : 'Sponsors & Donors Financial Report', pageWidth / 2, 27, { align: 'center' });
    doc.setFontSize(9);
    doc.text(`Generated: ${format(new Date(), 'PPpp')}`, pageWidth / 2, 35, { align: 'center' });
    y = 50;

    doc.setTextColor(0, 0, 0);

    if (sponsor) {
      // Single sponsor report
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Sponsor Details', 14, y);
      y += 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const details = [
        ['Name', sponsor.name],
        ['Organization', sponsor.organization || '-'],
        ['Email', sponsor.contact_email || '-'],
        ['Phone', sponsor.contact_phone || '-'],
        ['Status', sponsor.status],
        ['Total Pledged', fmt(sponsor.total_pledged)],
        ['Total Disbursed', fmt(sponsor.total_disbursed)],
        ['Remaining Funds', fmt(sponsor.total_pledged - sponsor.total_disbursed)],
        ['Utilization', `${sponsor.total_pledged > 0 ? ((sponsor.total_disbursed / sponsor.total_pledged) * 100).toFixed(1) : 0}%`],
      ];
      details.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.text(`${label}:`, 14, y);
        doc.setFont('helvetica', 'normal');
        doc.text(String(value), 70, y);
        y += 6;
      });

      // Disbursement table
      y += 8;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Disbursement History (Audit Trail)', 14, y);
      y += 8;

      const sponsorDisbursements = disbursements.filter(d => d.sponsor_id === sponsor.id);
      if (sponsorDisbursements.length === 0) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('No disbursements recorded.', 14, y);
      } else {
        // Table header
        doc.setFillColor(240, 240, 240);
        doc.rect(14, y - 4, pageWidth - 28, 8, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('Date', 16, y);
        doc.text('Purpose', 46, y);
        doc.text('Amount', 120, y);
        doc.text('Method', 150, y);
        doc.text('Receipt', 175, y);
        y += 8;

        doc.setFont('helvetica', 'normal');
        sponsorDisbursements.forEach(d => {
          if (y > 270) { doc.addPage(); y = 20; }
          doc.text(format(new Date(d.disbursement_date), 'dd/MM/yyyy'), 16, y);
          doc.text(d.purpose.substring(0, 30), 46, y);
          doc.text(fmt(d.amount), 120, y);
          doc.text(d.payment_method || '-', 150, y);
          doc.text(d.receipt_number || '-', 175, y);
          y += 6;
        });

        y += 4;
        doc.setFont('helvetica', 'bold');
        doc.text(`Total Disbursed: ${fmt(sponsorDisbursements.reduce((s, d) => s + d.amount, 0))}`, 14, y);
      }
    } else {
      // Overview report
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Financial Summary', 14, y);
      y += 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const summary = [
        ['Total Sponsors/Donors', String(sponsors.length)],
        ['Total Pledged', fmt(totalPledged)],
        ['Total Disbursed', fmt(totalDisbursed)],
        ['Remaining Funds', fmt(totalUnused)],
        ['Utilization Rate', `${utilizationRate.toFixed(1)}%`],
      ];
      summary.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.text(`${label}:`, 14, y);
        doc.setFont('helvetica', 'normal');
        doc.text(String(value), 70, y);
        y += 6;
      });

      y += 8;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Sponsors Breakdown', 14, y);
      y += 8;

      doc.setFillColor(240, 240, 240);
      doc.rect(14, y - 4, pageWidth - 28, 8, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Sponsor', 16, y);
      doc.text('Organization', 60, y);
      doc.text('Pledged', 110, y);
      doc.text('Disbursed', 140, y);
      doc.text('Remaining', 170, y);
      y += 8;

      doc.setFont('helvetica', 'normal');
      sponsors.forEach(sp => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(sp.name.substring(0, 20), 16, y);
        doc.text((sp.organization || '-').substring(0, 20), 60, y);
        doc.text(fmt(sp.total_pledged), 110, y);
        doc.text(fmt(sp.total_disbursed), 140, y);
        doc.text(fmt(sp.total_pledged - sp.total_disbursed), 170, y);
        y += 6;
      });

      // All disbursements
      y += 8;
      if (y > 240) { doc.addPage(); y = 20; }
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Complete Disbursement Audit Trail', 14, y);
      y += 8;

      doc.setFillColor(240, 240, 240);
      doc.rect(14, y - 4, pageWidth - 28, 8, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Date', 16, y);
      doc.text('Sponsor', 42, y);
      doc.text('Purpose', 85, y);
      doc.text('Amount', 135, y);
      doc.text('Receipt', 165, y);
      y += 8;

      doc.setFont('helvetica', 'normal');
      disbursements.forEach(d => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(format(new Date(d.disbursement_date), 'dd/MM/yyyy'), 16, y);
        doc.text((d.sponsor_name || '').substring(0, 18), 42, y);
        doc.text(d.purpose.substring(0, 22), 85, y);
        doc.text(fmt(d.amount), 135, y);
        doc.text(d.receipt_number || '-', 165, y);
        y += 6;
      });
    }

    // Footer
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Page ${i} of ${pages} | Confidential - Microsoft Institute of Technology`, pageWidth / 2, 290, { align: 'center' });
    }

    doc.save(sponsor ? `sponsor-audit-${sponsor.name.replace(/\s+/g, '-').toLowerCase()}-${format(new Date(), 'yyyy-MM-dd')}.pdf` : `donors-financial-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success('PDF report downloaded');
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2 p-3">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <HandHeart className="h-3.5 w-3.5 text-pink-500" /> Donors
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-lg font-bold">{sponsors.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 p-3">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-green-600" /> Pledged
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-lg font-bold text-green-600">{fmt(totalPledged)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 p-3">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-blue-600" /> Disbursed
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-lg font-bold text-blue-600">{fmt(totalDisbursed)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 p-3">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-orange-600" /> Utilization
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-lg font-bold">{utilizationRate.toFixed(1)}%</div>
            <Progress value={utilizationRate} className="mt-1 h-1.5" />
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Dialog open={addSponsorOpen} onOpenChange={setAddSponsorOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Donor</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><HandHeart className="h-5 w-5 text-pink-500" /> Add Sponsor/Donor</DialogTitle></DialogHeader>
            <form onSubmit={handleAddSponsor} className="space-y-3">
              <div><Label>Name *</Label><Input value={sponsorForm.name} onChange={e => setSponsorForm({ ...sponsorForm, name: e.target.value })} required /></div>
              <div><Label>Organization</Label><Input value={sponsorForm.organization} onChange={e => setSponsorForm({ ...sponsorForm, organization: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Email</Label><Input type="email" value={sponsorForm.contact_email} onChange={e => setSponsorForm({ ...sponsorForm, contact_email: e.target.value })} /></div>
                <div><Label>Phone</Label><Input value={sponsorForm.contact_phone} onChange={e => setSponsorForm({ ...sponsorForm, contact_phone: e.target.value })} /></div>
              </div>
              <div><Label>Total Pledged Amount *</Label><Input type="number" value={sponsorForm.total_pledged} onChange={e => setSponsorForm({ ...sponsorForm, total_pledged: e.target.value })} required /></div>
              <div><Label>Notes</Label><Textarea value={sponsorForm.notes} onChange={e => setSponsorForm({ ...sponsorForm, notes: e.target.value })} rows={2} /></div>
              <Button type="submit" className="w-full" disabled={submitting}>{submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : 'Add Sponsor/Donor'}</Button>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={addDisbursementOpen} onOpenChange={setAddDisbursementOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline"><DollarSign className="h-4 w-4 mr-1" /> Record Disbursement</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Record Fund Disbursement</DialogTitle></DialogHeader>
            <form onSubmit={handleAddDisbursement} className="space-y-3">
              <div>
                <Label>Sponsor/Donor *</Label>
                <Select value={disbursementForm.sponsor_id} onValueChange={v => setDisbursementForm({ ...disbursementForm, sponsor_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select sponsor" /></SelectTrigger>
                  <SelectContent>{sponsors.map(s => <SelectItem key={s.id} value={s.id}>{s.name} — Remaining: {fmt(s.total_pledged - s.total_disbursed)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Amount *</Label><Input type="number" value={disbursementForm.amount} onChange={e => setDisbursementForm({ ...disbursementForm, amount: e.target.value })} required /></div>
              <div><Label>Purpose *</Label><Input value={disbursementForm.purpose} onChange={e => setDisbursementForm({ ...disbursementForm, purpose: e.target.value })} placeholder="e.g. Student tuition, Lab equipment" required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Date</Label><Input type="date" value={disbursementForm.disbursement_date} onChange={e => setDisbursementForm({ ...disbursementForm, disbursement_date: e.target.value })} /></div>
                <div>
                  <Label>Method</Label>
                  <Select value={disbursementForm.payment_method} onValueChange={v => setDisbursementForm({ ...disbursementForm, payment_method: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="mpesa">M-Pesa</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Receipt Number</Label><Input value={disbursementForm.receipt_number} onChange={e => setDisbursementForm({ ...disbursementForm, receipt_number: e.target.value })} placeholder="Auto-generated if empty" /></div>
              <div><Label>Notes</Label><Textarea value={disbursementForm.notes} onChange={e => setDisbursementForm({ ...disbursementForm, notes: e.target.value })} rows={2} /></div>
              <Button type="submit" className="w-full" disabled={submitting}>{submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</> : 'Record Disbursement'}</Button>
            </form>
          </DialogContent>
        </Dialog>

        <Button size="sm" variant="outline" onClick={() => generatePDFReport()}>
          <Download className="h-4 w-4 mr-1" /> Full Report PDF
        </Button>
      </div>

      {/* Sub-tabs */}
      <Tabs defaultValue="sponsors" className="space-y-3">
        <TabsList>
          <TabsTrigger value="sponsors" className="text-xs sm:text-sm">Sponsors/Donors</TabsTrigger>
          <TabsTrigger value="audit" className="text-xs sm:text-sm">Audit Trail</TabsTrigger>
        </TabsList>

        <TabsContent value="sponsors">
          <Card>
            <CardContent className="p-4">
              {sponsors.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No sponsors/donors registered yet.</p>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="min-w-[800px] px-4 sm:px-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Sponsor/Donor</TableHead>
                          <TableHead>Organization</TableHead>
                          <TableHead className="text-right">Pledged</TableHead>
                          <TableHead className="text-right">Disbursed</TableHead>
                          <TableHead className="text-right">Remaining</TableHead>
                          <TableHead>Utilization</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sponsors.map(sp => {
                          const remaining = sp.total_pledged - sp.total_disbursed;
                          const util = sp.total_pledged > 0 ? (sp.total_disbursed / sp.total_pledged) * 100 : 0;
                          return (
                            <TableRow key={sp.id}>
                              <TableCell>
                                <p className="font-medium text-sm">{sp.name}</p>
                                <p className="text-xs text-muted-foreground">{sp.contact_email || sp.contact_phone || ''}</p>
                              </TableCell>
                              <TableCell className="text-sm">{sp.organization || '-'}</TableCell>
                              <TableCell className="text-right text-sm font-semibold">{fmt(sp.total_pledged)}</TableCell>
                              <TableCell className="text-right text-sm text-blue-600 font-semibold">{fmt(sp.total_disbursed)}</TableCell>
                              <TableCell className="text-right text-sm font-semibold text-green-600">{fmt(remaining)}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Progress value={util} className="h-1.5 w-16" />
                                  <span className="text-xs text-muted-foreground">{util.toFixed(0)}%</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={sp.status === 'active' ? 'default' : 'secondary'} className="text-xs">{sp.status}</Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button size="sm" variant="ghost" onClick={() => { setSelectedSponsor(sp); }} title="View details">
                                    <Eye className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => generatePDFReport(sp)} title="Audit PDF">
                                    <Download className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm">Disbursement Audit Trail</CardTitle>
              <p className="text-xs text-muted-foreground">Complete record of how sponsor funds were allocated and spent</p>
            </CardHeader>
            <CardContent className="p-4">
              {disbursements.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No disbursements recorded yet.</p>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="min-w-[750px] px-4 sm:px-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Sponsor</TableHead>
                          <TableHead>Purpose</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Receipt #</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {disbursements.map(d => (
                          <TableRow key={d.id}>
                            <TableCell className="text-sm">{format(new Date(d.disbursement_date), 'dd MMM yyyy')}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs">
                                <HandHeart className="h-3 w-3 mr-1 text-pink-500" />
                                {d.sponsor_name}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm max-w-[200px] truncate">{d.purpose}</TableCell>
                            <TableCell className="text-right text-sm font-semibold">{fmt(d.amount)}</TableCell>
                            <TableCell className="text-sm capitalize">{d.payment_method?.replace('_', ' ') || '-'}</TableCell>
                            <TableCell className="text-xs font-mono">{d.receipt_number || '-'}</TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">{d.notes || '-'}</TableCell>
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

      {/* Sponsor Detail Dialog */}
      <Dialog open={!!selectedSponsor} onOpenChange={(open) => !open && setSelectedSponsor(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HandHeart className="h-5 w-5 text-pink-500" />
              {selectedSponsor?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedSponsor && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Organization:</span> <span className="font-medium">{selectedSponsor.organization || '-'}</span></div>
                <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{selectedSponsor.contact_email || '-'}</span></div>
                <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{selectedSponsor.contact_phone || '-'}</span></div>
                <div><span className="text-muted-foreground">Status:</span> <Badge variant="default" className="text-xs ml-1">{selectedSponsor.status}</Badge></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Pledged</p><p className="text-sm font-bold">{fmt(selectedSponsor.total_pledged)}</p></CardContent></Card>
                <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Disbursed</p><p className="text-sm font-bold text-blue-600">{fmt(selectedSponsor.total_disbursed)}</p></CardContent></Card>
                <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Remaining</p><p className="text-sm font-bold text-green-600">{fmt(selectedSponsor.total_pledged - selectedSponsor.total_disbursed)}</p></CardContent></Card>
              </div>
              {selectedSponsor.notes && <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">{selectedSponsor.notes}</p>}
              <Button variant="outline" className="w-full" onClick={() => generatePDFReport(selectedSponsor)}>
                <Download className="h-4 w-4 mr-2" /> Download Audit Report PDF
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DonorsSection;
