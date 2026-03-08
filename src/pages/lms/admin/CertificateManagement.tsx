import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import LMSLayout from '@/components/lms/LMSLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Award, Download, Plus, Edit2, Trash2, Search, RefreshCw, Eye } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';

interface CertificateRecord {
  id: string;
  certificate_number: string;
  issued_at: string;
  user_id: string;
  course_id: string;
  courses: { title: string; category: string | null; duration_hours: number | null } | null;
  profiles: { full_name: string | null; email: string | null } | null;
}

interface StudentOption {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface CourseOption {
  id: string;
  title: string;
  category: string | null;
  duration_hours: number | null;
}

const CertificateManagement = () => {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [selectedCert, setSelectedCert] = useState<CertificateRecord | null>(null);

  // Form state
  const [formStudentId, setFormStudentId] = useState('');
  const [formCourseId, setFormCourseId] = useState('');
  const [formCertNumber, setFormCertNumber] = useState('');
  const [formIssuedAt, setFormIssuedAt] = useState(new Date().toISOString().split('T')[0]);

  // Edit overrides
  const [editStudentName, setEditStudentName] = useState('');
  const [editCourseTitle, setEditCourseTitle] = useState('');
  const [editCertNumber, setEditCertNumber] = useState('');
  const [editIssuedAt, setEditIssuedAt] = useState('');
  const [editInstitutionTitle, setEditInstitutionTitle] = useState('MICROSOFT TRAINING INSTITUTE');
  const [editSubtitle, setEditSubtitle] = useState('Excellence in Technology Education');

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/lms/login');
    }
  }, [user, loading, isAdmin, navigate]);

  useEffect(() => {
    if (user && isAdmin) {
      fetchAll();
    }
  }, [user, isAdmin]);

  const fetchAll = async () => {
    setIsLoading(true);
    await Promise.all([fetchCertificates(), fetchStudents(), fetchCourses()]);
    setIsLoading(false);
  };

  const fetchCertificates = async () => {
    const { data } = await supabase
      .from('certificates')
      .select('id, certificate_number, issued_at, user_id, course_id, courses(title, category, duration_hours), profiles:user_id(full_name, email)')
      .order('issued_at', { ascending: false });
    if (data) setCertificates(data as unknown as CertificateRecord[]);
  };

  const fetchStudents = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .order('full_name');
    if (data) setStudents(data);
  };

  const fetchCourses = async () => {
    const { data } = await supabase
      .from('courses')
      .select('id, title, category, duration_hours')
      .order('title');
    if (data) setCourses(data);
  };

  const generateCertNumber = () => {
    const prefix = 'MTI';
    const year = new Date().getFullYear();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${year}-${random}`;
  };

  const handleCreate = async () => {
    if (!formStudentId || !formCourseId) {
      toast.error('Please select a student and course');
      return;
    }
    const certNumber = formCertNumber || generateCertNumber();
    const { error } = await supabase.from('certificates').insert({
      user_id: formStudentId,
      course_id: formCourseId,
      certificate_number: certNumber,
      issued_at: new Date(formIssuedAt).toISOString(),
    });
    if (error) {
      toast.error('Failed to create certificate: ' + error.message);
    } else {
      toast.success('Certificate created successfully!');
      setShowCreateDialog(false);
      resetForm();
      fetchCertificates();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this certificate?')) return;
    const { error } = await supabase.from('certificates').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete: ' + error.message);
    } else {
      toast.success('Certificate deleted');
      fetchCertificates();
    }
  };

  const openEdit = (cert: CertificateRecord) => {
    setSelectedCert(cert);
    setEditStudentName(cert.profiles?.full_name || '');
    setEditCourseTitle(cert.courses?.title || '');
    setEditCertNumber(cert.certificate_number);
    setEditIssuedAt(new Date(cert.issued_at).toISOString().split('T')[0]);
    setEditInstitutionTitle('MICROSOFT TRAINING INSTITUTE');
    setEditSubtitle('Excellence in Technology Education');
    setShowEditDialog(true);
  };

  const openPreview = (cert: CertificateRecord) => {
    setSelectedCert(cert);
    setEditStudentName(cert.profiles?.full_name || '');
    setEditCourseTitle(cert.courses?.title || '');
    setEditCertNumber(cert.certificate_number);
    setEditIssuedAt(new Date(cert.issued_at).toISOString().split('T')[0]);
    setEditInstitutionTitle('MICROSOFT TRAINING INSTITUTE');
    setEditSubtitle('Excellence in Technology Education');
    setShowPreviewDialog(true);
  };

  const handleUpdate = async () => {
    if (!selectedCert) return;
    const { error } = await supabase.from('certificates').update({
      certificate_number: editCertNumber,
      issued_at: new Date(editIssuedAt).toISOString(),
    }).eq('id', selectedCert.id);
    if (error) {
      toast.error('Failed to update: ' + error.message);
    } else {
      toast.success('Certificate updated');
      setShowEditDialog(false);
      fetchCertificates();
    }
  };

  const resetForm = () => {
    setFormStudentId('');
    setFormCourseId('');
    setFormCertNumber('');
    setFormIssuedAt(new Date().toISOString().split('T')[0]);
  };

  // ─── PDF Generation with full branding, stamp, seal, partner logos ───
  const generatePDF = (cert: CertificateRecord, overrides?: {
    studentName?: string;
    courseTitle?: string;
    certNumber?: string;
    issuedAt?: string;
    institutionTitle?: string;
    subtitle?: string;
  }) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();

    const studentName = overrides?.studentName || cert.profiles?.full_name || 'Student';
    const courseTitle = overrides?.courseTitle || cert.courses?.title || 'Course';
    const certNumber = overrides?.certNumber || cert.certificate_number;
    const issuedAt = overrides?.issuedAt || cert.issued_at;
    const institutionTitle = overrides?.institutionTitle || 'MICROSOFT TRAINING INSTITUTE';
    const subtitle = overrides?.subtitle || 'Excellence in Technology Education';
    const durationHours = cert.courses?.duration_hours;

    // ── Background ──
    doc.setFillColor(255, 252, 243);
    doc.rect(0, 0, W, H, 'F');

    // Subtle watermark pattern
    doc.setDrawColor(240, 235, 220);
    doc.setLineWidth(0.1);
    for (let i = 0; i < W; i += 8) {
      for (let j = 0; j < H; j += 8) {
        if ((i + j) % 16 === 0) {
          doc.circle(i, j, 0.3, 'S');
        }
      }
    }

    // ── Ornate border ──
    // Outer border - Blue (#14438C)
    doc.setDrawColor(20, 67, 140);
    doc.setLineWidth(2.5);
    doc.rect(8, 8, W - 16, H - 16);

    // Gold inner border
    doc.setDrawColor(243, 149, 25);
    doc.setLineWidth(1.5);
    doc.rect(12, 12, W - 24, H - 24);

    // Thin blue inner border
    doc.setDrawColor(20, 67, 140);
    doc.setLineWidth(0.5);
    doc.rect(15, 15, W - 30, H - 30);

    // ── Corner flourishes ──
    const drawCorner = (cx: number, cy: number) => {
      doc.setFillColor(243, 149, 25);
      doc.circle(cx, cy, 4, 'F');
      doc.setFillColor(20, 67, 140);
      doc.circle(cx, cy, 2.5, 'F');
      doc.setFillColor(243, 149, 25);
      doc.circle(cx, cy, 1.2, 'F');
    };
    drawCorner(15, 15);
    drawCorner(W - 15, 15);
    drawCorner(15, H - 15);
    drawCorner(W - 15, H - 15);

    // ── Top ribbon ──
    doc.setFillColor(20, 67, 140);
    doc.rect(20, 20, W - 40, 12, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(institutionTitle, W / 2, 28, { align: 'center' });

    // Subtitle
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(20, 67, 140);
    doc.text(subtitle, W / 2, 38, { align: 'center' });

    // ── Decorative gold line ──
    doc.setDrawColor(243, 149, 25);
    doc.setLineWidth(0.8);
    doc.line(W / 2 - 50, 41, W / 2 + 50, 41);
    doc.setLineWidth(0.3);
    doc.line(W / 2 - 40, 43, W / 2 + 40, 43);

    // ── Certificate Title ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(38);
    doc.setTextColor(20, 67, 140);
    doc.text('CERTIFICATE', W / 2, 58, { align: 'center' });

    doc.setFontSize(16);
    doc.setTextColor(243, 149, 25);
    doc.text('OF COMPLETION', W / 2, 67, { align: 'center' });

    // ── "This is to certify that" ──
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text('This is to certify that', W / 2, 79, { align: 'center' });

    // ── Student Name ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.setTextColor(20, 67, 140);
    doc.text(studentName.toUpperCase(), W / 2, 94, { align: 'center' });

    // Name underline
    const nameW = doc.getTextWidth(studentName.toUpperCase());
    doc.setDrawColor(243, 149, 25);
    doc.setLineWidth(0.8);
    doc.line(W / 2 - nameW / 2 - 15, 97, W / 2 + nameW / 2 + 15, 97);

    // ── "has successfully completed the course" ──
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text('has successfully completed the course', W / 2, 107, { align: 'center' });

    // ── Course Title ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(45, 55, 72);
    doc.text(courseTitle, W / 2, 119, { align: 'center' });

    // Duration
    if (durationHours) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text(`Duration: ${durationHours} Hours`, W / 2, 126, { align: 'center' });
    }

    // ── Decorative separator ──
    doc.setDrawColor(243, 149, 25);
    doc.setLineWidth(0.4);
    doc.line(W / 2 - 70, 130, W / 2 + 70, 130);

    // ── Date & Certificate Number ──
    const issueDate = new Date(issuedAt).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });

    // Left: Date
    doc.setDrawColor(20, 67, 140);
    doc.setLineWidth(0.5);
    doc.line(35, 143, 95, 143);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(45, 55, 72);
    doc.text(issueDate, 65, 140, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text('Date of Issue', 65, 149, { align: 'center' });

    // Right: Cert Number
    doc.line(W - 95, 143, W - 35, 143);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(45, 55, 72);
    doc.text(certNumber, W - 65, 140, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text('Certificate Number', W - 65, 149, { align: 'center' });

    // ── OFFICIAL SEAL (center) ──
    const sealX = W / 2;
    const sealY = 145;
    const sealR = 14;

    // Outer ring
    doc.setDrawColor(20, 67, 140);
    doc.setLineWidth(1.5);
    doc.circle(sealX, sealY, sealR, 'S');
    doc.setLineWidth(0.5);
    doc.circle(sealX, sealY, sealR - 2, 'S');

    // Inner fill
    doc.setFillColor(20, 67, 140);
    doc.circle(sealX, sealY, sealR - 3.5, 'F');

    // Seal text (circular feel)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5);
    doc.setTextColor(255, 255, 255);
    doc.text('MICROSOFT', sealX, sealY - 5, { align: 'center' });
    doc.text('TRAINING', sealX, sealY - 1.5, { align: 'center' });
    doc.text('INSTITUTE', sealX, sealY + 2, { align: 'center' });

    // Star in seal
    doc.setFillColor(243, 149, 25);
    doc.circle(sealX, sealY + 6, 1.5, 'F');

    doc.setFontSize(4);
    doc.text('OFFICIAL SEAL', sealX, sealY + 10, { align: 'center' });

    // Decorative rays around seal
    doc.setDrawColor(243, 149, 25);
    doc.setLineWidth(0.2);
    for (let angle = 0; angle < 360; angle += 15) {
      const rad = (angle * Math.PI) / 180;
      const x1 = sealX + Math.cos(rad) * (sealR + 1);
      const y1 = sealY + Math.sin(rad) * (sealR + 1);
      const x2 = sealX + Math.cos(rad) * (sealR + 3);
      const y2 = sealY + Math.sin(rad) * (sealR + 3);
      doc.line(x1, y1, x2, y2);
    }

    // ── STAMP (bottom-left area) ──
    const stampX = 55;
    const stampY = 170;

    // Stamp rectangle with rounded appearance
    doc.setDrawColor(200, 30, 30);
    doc.setLineWidth(1.5);
    doc.rect(stampX - 22, stampY - 8, 44, 16, 'S');
    doc.setLineWidth(0.5);
    doc.rect(stampX - 20, stampY - 6, 40, 12, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(200, 30, 30);
    doc.text('CERTIFIED', stampX, stampY - 1, { align: 'center' });
    doc.setFontSize(6);
    doc.text('AUTHENTIC & VERIFIED', stampX, stampY + 4, { align: 'center' });

    // Stamp date ring
    doc.setDrawColor(200, 30, 30);
    doc.setLineWidth(0.3);
    doc.circle(stampX, stampY, 12, 'S');

    // ── AUTHORITY SIGNATURE AREA ──
    const sigX = W - 65;
    doc.setDrawColor(45, 55, 72);
    doc.setLineWidth(0.3);
    doc.line(sigX - 30, 170, sigX + 30, 170);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(45, 55, 72);
    doc.text('Director', sigX, 175, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text('Microsoft Training Institute', sigX, 179, { align: 'center' });

    // ── Partner logos area (bottom bar) ──
    const partnerY = H - 22;
    doc.setFillColor(245, 245, 245);
    doc.rect(15, partnerY - 6, W - 30, 13, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.setTextColor(150, 150, 150);
    doc.text('IN PARTNERSHIP WITH', W / 2, partnerY - 3, { align: 'center' });

    // Partner logos as branded text badges
    const partners = ['Microsoft', 'Google', 'Cisco', 'CompTIA', 'AWS', 'Oracle', 'Safaricom', 'Andela'];
    const partnerSpacing = (W - 60) / (partners.length - 1);
    const startX = 30;

    partners.forEach((partner, i) => {
      const px = startX + i * partnerSpacing;
      // Badge background
      doc.setFillColor(20, 67, 140);
      const tw = doc.getTextWidth(partner) + 4;
      doc.roundedRect(px - tw / 2, partnerY, tw, 5, 1, 1, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5);
      doc.setTextColor(255, 255, 255);
      doc.text(partner, px, partnerY + 3.5, { align: 'center' });
    });

    // ── Verification footer ──
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Verify at: microsoftinstitute.africa/verify/${certNumber}`,
      W / 2,
      H - 11,
      { align: 'center' }
    );

    doc.save(`Certificate-${certNumber}.pdf`);
    toast.success('Certificate PDF downloaded!');
  };

  const filteredCerts = certificates.filter(c => {
    const term = searchTerm.toLowerCase();
    return (
      c.profiles?.full_name?.toLowerCase().includes(term) ||
      c.profiles?.email?.toLowerCase().includes(term) ||
      c.courses?.title?.toLowerCase().includes(term) ||
      c.certificate_number.toLowerCase().includes(term)
    );
  });

  if (loading || isLoading) {
    return (
      <LMSLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </LMSLayout>
    );
  }

  return (
    <LMSLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Award className="h-7 w-7 text-primary" />
              Certificate Management
            </h1>
            <p className="text-muted-foreground">Generate, assign, and manage student certificates</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchAll}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetForm(); setFormCertNumber(generateCertNumber()); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Generate Certificate
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Generate New Certificate</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Student</Label>
                    <Select value={formStudentId} onValueChange={setFormStudentId}>
                      <SelectTrigger><SelectValue placeholder="Select student..." /></SelectTrigger>
                      <SelectContent>
                        {students.map(s => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.full_name || s.email || s.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Course</Label>
                    <Select value={formCourseId} onValueChange={setFormCourseId}>
                      <SelectTrigger><SelectValue placeholder="Select course..." /></SelectTrigger>
                      <SelectContent>
                        {courses.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Certificate Number</Label>
                    <Input value={formCertNumber} onChange={e => setFormCertNumber(e.target.value)} />
                  </div>
                  <div>
                    <Label>Issue Date</Label>
                    <Input type="date" value={formIssuedAt} onChange={e => setFormIssuedAt(e.target.value)} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                  <Button onClick={handleCreate}>Create Certificate</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, course, or cert number..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Award className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-2xl font-bold">{certificates.length}</p>
                <p className="text-sm text-muted-foreground">Total Certificates</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10"><Award className="h-5 w-5 text-accent" /></div>
              <div>
                <p className="text-2xl font-bold">{new Set(certificates.map(c => c.user_id)).size}</p>
                <p className="text-sm text-muted-foreground">Students Certified</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10"><Award className="h-5 w-5 text-green-600" /></div>
              <div>
                <p className="text-2xl font-bold">{new Set(certificates.map(c => c.course_id)).size}</p>
                <p className="text-sm text-muted-foreground">Courses With Certs</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Certificate #</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCerts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                        No certificates found
                      </TableCell>
                    </TableRow>
                  ) : filteredCerts.map(cert => (
                    <TableRow key={cert.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{cert.profiles?.full_name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{cert.profiles?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{cert.courses?.title || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">{cert.certificate_number}</code>
                      </TableCell>
                      <TableCell>
                        {new Date(cert.issued_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" title="Preview & Edit" onClick={() => openPreview(cert)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(cert)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Download PDF" onClick={() => generatePDF(cert)}>
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Delete" onClick={() => handleDelete(cert.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Certificate</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Certificate Number</Label>
                <Input value={editCertNumber} onChange={e => setEditCertNumber(e.target.value)} />
              </div>
              <div>
                <Label>Issue Date</Label>
                <Input type="date" value={editIssuedAt} onChange={e => setEditIssuedAt(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
              <Button onClick={handleUpdate}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview & Customize Dialog */}
        <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Preview & Customize Certificate</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <Label>Student Name (on PDF)</Label>
                  <Input value={editStudentName} onChange={e => setEditStudentName(e.target.value)} />
                </div>
                <div>
                  <Label>Course Title (on PDF)</Label>
                  <Input value={editCourseTitle} onChange={e => setEditCourseTitle(e.target.value)} />
                </div>
                <div>
                  <Label>Certificate Number</Label>
                  <Input value={editCertNumber} onChange={e => setEditCertNumber(e.target.value)} />
                </div>
                <div>
                  <Label>Issue Date</Label>
                  <Input type="date" value={editIssuedAt} onChange={e => setEditIssuedAt(e.target.value)} />
                </div>
                <div>
                  <Label>Institution Title</Label>
                  <Input value={editInstitutionTitle} onChange={e => setEditInstitutionTitle(e.target.value)} />
                </div>
                <div>
                  <Label>Subtitle</Label>
                  <Input value={editSubtitle} onChange={e => setEditSubtitle(e.target.value)} />
                </div>
              </div>
              <div className="flex flex-col items-center justify-center bg-muted rounded-lg p-4">
                {/* Mini preview representation */}
                <div className="w-full aspect-[297/210] bg-amber-50 border-4 border-double border-primary rounded-md p-3 text-center flex flex-col justify-center gap-1">
                  <p className="text-[6px] font-bold text-primary uppercase">{editInstitutionTitle}</p>
                  <p className="text-[4px] italic text-muted-foreground">{editSubtitle}</p>
                  <p className="text-[10px] font-bold text-primary mt-1">CERTIFICATE</p>
                  <p className="text-[5px] text-accent font-semibold">OF COMPLETION</p>
                  <p className="text-[4px] text-muted-foreground italic">This is to certify that</p>
                  <p className="text-[7px] font-bold text-primary uppercase">{editStudentName || 'STUDENT NAME'}</p>
                  <p className="text-[4px] text-muted-foreground italic">has completed</p>
                  <p className="text-[6px] font-bold">{editCourseTitle || 'COURSE TITLE'}</p>
                  <div className="flex justify-between mt-2 px-4">
                    <div className="text-[3px]">
                      <p className="font-bold">{editIssuedAt ? new Date(editIssuedAt).toLocaleDateString() : ''}</p>
                      <p>Date</p>
                    </div>
                    <div className="w-5 h-5 rounded-full border border-primary flex items-center justify-center">
                      <span className="text-[2px] font-bold text-primary">SEAL</span>
                    </div>
                    <div className="text-[3px]">
                      <p className="font-bold">{editCertNumber}</p>
                      <p>Cert #</p>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Certificate Preview</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>Close</Button>
              <Button onClick={() => {
                if (!selectedCert) return;
                generatePDF(selectedCert, {
                  studentName: editStudentName,
                  courseTitle: editCourseTitle,
                  certNumber: editCertNumber,
                  issuedAt: editIssuedAt,
                  institutionTitle: editInstitutionTitle,
                  subtitle: editSubtitle,
                });
              }}>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </LMSLayout>
  );
};

export default CertificateManagement;
