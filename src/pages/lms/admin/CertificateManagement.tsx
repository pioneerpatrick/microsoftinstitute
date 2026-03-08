import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import LMSLayout from '@/components/lms/LMSLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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

interface StudentOption { id: string; full_name: string | null; email: string | null; }
interface CourseOption { id: string; title: string; category: string | null; duration_hours: number | null; }

interface CertOverrides {
  studentName: string;
  courseTitle: string;
  certNumber: string;
  issuedAt: string;
  institutionTitle: string;
  motto: string;
  admissionNumber: string;
  serialNumber: string;
  aggregate: string;
  congregationText: string;
  directorName: string;
  deptHeadName: string;
}

// Helper: load an image from URL as base64 data URL
const loadImageAsBase64 = (url: string): Promise<string | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } else {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

const PARTNER_LOGOS = [
  { name: 'Microsoft', path: '/images/partners/microsoft.png' },
  { name: 'Google', path: '/images/partners/google.png' },
  { name: 'Cisco', path: '/images/partners/cisco.png' },
  { name: 'CompTIA', path: '/images/partners/comptia.png' },
  { name: 'AWS', path: '/images/partners/aws.png' },
  { name: 'Oracle', path: '/images/partners/oracle.png' },
  { name: 'Safaricom', path: '/images/partners/safaricom.png' },
  { name: 'Andela', path: '/images/partners/andela.png' },
];

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

  // Create form
  const [formStudentId, setFormStudentId] = useState('');
  const [formCourseId, setFormCourseId] = useState('');
  const [formCertNumber, setFormCertNumber] = useState('');
  const [formIssuedAt, setFormIssuedAt] = useState(new Date().toISOString().split('T')[0]);
  const [formAdmission, setFormAdmission] = useState('');

  // Edit/Preview overrides
  const [overrides, setOverrides] = useState<CertOverrides>({
    studentName: '',
    courseTitle: '',
    certNumber: '',
    issuedAt: '',
    institutionTitle: 'MICROSOFT TRAINING INSTITUTE',
    motto: '"Quest for Excellence"',
    admissionNumber: '',
    serialNumber: '',
    aggregate: 'DISTINCTION',
    congregationText: '',
    directorName: 'Director',
    deptHeadName: 'Department Head',
  });

  // Edit DB fields
  const [editCertNumber, setEditCertNumber] = useState('');
  const [editIssuedAt, setEditIssuedAt] = useState('');

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate('/lms/login');
  }, [user, loading, isAdmin, navigate]);

  useEffect(() => {
    if (user && isAdmin) fetchAll();
  }, [user, isAdmin]);

  const fetchAll = async () => {
    setIsLoading(true);
    await Promise.all([fetchCertificates(), fetchStudents(), fetchCourses()]);
    setIsLoading(false);
  };

  const fetchCertificates = async () => {
    const { data: certsData } = await supabase
      .from('certificates')
      .select('id, certificate_number, issued_at, user_id, course_id, courses(title, category, duration_hours)')
      .order('issued_at', { ascending: false });
    if (certsData && certsData.length > 0) {
      const userIds = [...new Set(certsData.map(c => c.user_id))];
      const { data: profilesData } = await supabase.from('profiles').select('id, full_name, email').in('id', userIds);
      const profileMap = new Map((profilesData || []).map(p => [p.id, p]));
      setCertificates(certsData.map(c => ({ ...c, profiles: profileMap.get(c.user_id) || null })) as unknown as CertificateRecord[]);
    } else {
      setCertificates([]);
    }
  };

  const fetchStudents = async () => {
    const { data } = await supabase.from('profiles').select('id, full_name, email').order('full_name');
    if (data) setStudents(data);
  };

  const fetchCourses = async () => {
    const { data } = await supabase.from('courses').select('id, title, category, duration_hours').order('title');
    if (data) setCourses(data);
  };

  const generateCertNumber = () => `MTI-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const generateAdmissionNumber = () => `MTI/${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}/${new Date().getFullYear()}`;

  const handleCreate = async () => {
    if (!formStudentId || !formCourseId) { toast.error('Please select a student and course'); return; }
    const certNumber = formCertNumber || generateCertNumber();
    const { error } = await supabase.from('certificates').insert({
      user_id: formStudentId, course_id: formCourseId,
      certificate_number: certNumber, issued_at: new Date(formIssuedAt).toISOString(),
    });
    if (error) { toast.error('Failed: ' + error.message); }
    else { toast.success('Certificate created!'); setShowCreateDialog(false); resetForm(); fetchCertificates(); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this certificate?')) return;
    const { error } = await supabase.from('certificates').delete().eq('id', id);
    if (error) toast.error('Failed: ' + error.message);
    else { toast.success('Deleted'); fetchCertificates(); }
  };

  const handleUpdate = async () => {
    if (!selectedCert) return;
    const { error } = await supabase.from('certificates').update({
      certificate_number: editCertNumber, issued_at: new Date(editIssuedAt).toISOString(),
    }).eq('id', selectedCert.id);
    if (error) toast.error('Failed: ' + error.message);
    else { toast.success('Updated'); setShowEditDialog(false); fetchCertificates(); }
  };

  const openEdit = (cert: CertificateRecord) => {
    setSelectedCert(cert);
    setEditCertNumber(cert.certificate_number);
    setEditIssuedAt(new Date(cert.issued_at).toISOString().split('T')[0]);
    setShowEditDialog(true);
  };

  const openPreview = (cert: CertificateRecord) => {
    setSelectedCert(cert);
    const year = new Date(cert.issued_at).getFullYear();
    const courseAbbr = (cert.courses?.title || 'CP').split(' ').map(w => w[0]).join('').toUpperCase();
    const idx = String(certificates.indexOf(cert) + 1).padStart(2, '0');
    setOverrides({
      studentName: cert.profiles?.full_name || '',
      courseTitle: cert.courses?.title || '',
      certNumber: cert.certificate_number,
      issuedAt: new Date(cert.issued_at).toISOString().split('T')[0],
      institutionTitle: 'MICROSOFT TRAINING INSTITUTE',
      motto: '"Quest for Excellence"',
      admissionNumber: `MTI/${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}/${year}`,
      serialNumber: `MTI/${courseAbbr}/${idx}/${year}`,
      aggregate: 'DISTINCTION',
      congregationText: '',
      directorName: 'Director',
      deptHeadName: 'Department Head',
    });
    setShowPreviewDialog(true);
  };

  const resetForm = () => {
    setFormStudentId(''); setFormCourseId(''); setFormCertNumber('');
    setFormIssuedAt(new Date().toISOString().split('T')[0]); setFormAdmission('');
  };

  const setOv = (key: keyof CertOverrides, val: string) => setOverrides(p => ({ ...p, [key]: val }));

  // ─── PDF Generation matching reference design ───
  const generatePDF = async (cert: CertificateRecord, ov?: Partial<CertOverrides>) => {
    const o = { ...overrides, ...ov };
    const studentName = o.studentName || cert.profiles?.full_name || 'Student';
    const courseTitle = o.courseTitle || cert.courses?.title || 'Course';
    const certNumber = o.certNumber || cert.certificate_number;
    const issuedAt = o.issuedAt || cert.issued_at;
    const year = new Date(issuedAt).getFullYear();

    // Preload partner logos
    const logoPromises = PARTNER_LOGOS.map(p => loadImageAsBase64(p.path));
    const logoImages = await Promise.all(logoPromises);

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();

    // ── Cream/parchment background ──
    doc.setFillColor(255, 252, 240);
    doc.rect(0, 0, W, H, 'F');

    // Subtle texture dots
    doc.setDrawColor(245, 238, 220);
    doc.setLineWidth(0.08);
    for (let i = 0; i < W; i += 6) {
      for (let j = 0; j < H; j += 6) {
        if ((i + j) % 12 === 0) doc.circle(i, j, 0.2, 'S');
      }
    }

    // ── Triple ornate border ──
    // Outer dark blue
    doc.setDrawColor(20, 67, 140);
    doc.setLineWidth(3);
    doc.rect(6, 6, W - 12, H - 12);
    // Gold middle
    doc.setDrawColor(212, 160, 23);
    doc.setLineWidth(1.8);
    doc.rect(10, 10, W - 20, H - 20);
    // Inner dark blue thin
    doc.setDrawColor(20, 67, 140);
    doc.setLineWidth(0.6);
    doc.rect(13, 13, W - 26, H - 26);

    // ── Corner medallions ──
    const drawMedallion = (cx: number, cy: number) => {
      doc.setFillColor(212, 160, 23); doc.circle(cx, cy, 5, 'F');
      doc.setFillColor(20, 67, 140); doc.circle(cx, cy, 3.5, 'F');
      doc.setFillColor(212, 160, 23); doc.circle(cx, cy, 2, 'F');
      doc.setFillColor(255, 252, 240); doc.circle(cx, cy, 0.8, 'F');
    };
    drawMedallion(13, 13); drawMedallion(W - 13, 13);
    drawMedallion(13, H - 13); drawMedallion(W - 13, H - 13);

    // ── Top banner with institution name ──
    // Blue ribbon
    doc.setFillColor(20, 67, 140);
    doc.rect(18, 17, W - 36, 14, 'F');
    // Gold accent lines
    doc.setDrawColor(212, 160, 23);
    doc.setLineWidth(0.8);
    doc.line(18, 17, W - 18, 17);
    doc.line(18, 31, W - 18, 31);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text('Microsoft Training Institute', W / 2, 26, { align: 'center' });

    // ── Admission & Serial Numbers ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(20, 67, 140);
    doc.text(`ADMISSION: ${o.admissionNumber}`, 25, 38);
    doc.text(`SERIAL NO. ${o.serialNumber}`, W - 25, 38, { align: 'right' });

    // ── Motto ──
    doc.setFont('helvetica', 'bolditalic');
    doc.setFontSize(11);
    doc.setTextColor(212, 160, 23);
    doc.text(o.motto, W / 2, 46, { align: 'center' });

    // ── "This is to certify that" ──
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text('This is to certify that', W / 2, 55, { align: 'center' });

    // ── Student Name ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(26);
    doc.setTextColor(20, 67, 140);
    doc.text(studentName, W / 2, 68, { align: 'center' });

    // Gold underline
    const nameW = doc.getTextWidth(studentName);
    doc.setDrawColor(212, 160, 23);
    doc.setLineWidth(0.8);
    doc.line(W / 2 - nameW / 2 - 10, 71, W / 2 + nameW / 2 + 10, 71);
    doc.setLineWidth(0.3);
    doc.line(W / 2 - nameW / 2 - 5, 73, W / 2 + nameW / 2 + 5, 73);

    // ── "having satisfied all the requirements was awarded" ──
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text('having satisfied all the requirements was awarded', W / 2, 81, { align: 'center' });

    // ── Course Title (Diploma/Certificate in ...) ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(20, 67, 140);
    doc.text(courseTitle, W / 2, 93, { align: 'center' });

    // ── Aggregate ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(80, 80, 80);
    doc.text(`with AGGREGATE: `, W / 2 - 15, 102, { align: 'right' });
    doc.setTextColor(212, 160, 23);
    doc.text(o.aggregate, W / 2 - 15, 102);

    // ── Congregation text ──
    const congDate = new Date(issuedAt);
    const dayNum = congDate.getDate();
    const dayStr = dayNum === 1 ? 'First' : dayNum === 2 ? 'Second' : dayNum === 3 ? 'Third' :
      dayNum === 4 ? 'Fourth' : dayNum === 5 ? 'Fifth' : dayNum === 6 ? 'Sixth' :
      dayNum === 7 ? 'Seventh' : dayNum === 8 ? 'Eighth' : dayNum === 9 ? 'Ninth' :
      dayNum === 10 ? 'Tenth' : dayNum === 11 ? 'Eleventh' : dayNum === 12 ? 'Twelfth' :
      dayNum === 13 ? 'Thirteenth' : dayNum === 14 ? 'Fourteenth' : dayNum === 15 ? 'Fifteenth' :
      dayNum === 16 ? 'Sixteenth' : dayNum === 17 ? 'Seventeenth' : dayNum === 18 ? 'Eighteenth' :
      dayNum === 19 ? 'Nineteenth' : dayNum === 20 ? 'Twentieth' : dayNum === 21 ? 'Twenty-first' :
      dayNum === 22 ? 'Twenty-second' : dayNum === 23 ? 'Twenty-third' : dayNum === 24 ? 'Twenty-fourth' :
      dayNum === 25 ? 'Twenty-fifth' : dayNum === 26 ? 'Twenty-sixth' : dayNum === 27 ? 'Twenty-seventh' :
      dayNum === 28 ? 'Twenty-eighth' : dayNum === 29 ? 'Twenty-ninth' : dayNum === 30 ? 'Thirtieth' : 'Thirty-first';
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const monthStr = monthNames[congDate.getMonth()];
    const yearWords: Record<number, string> = {};
    const getYearWord = (y: number) => `Two thousand and ${y - 2000 < 20 ? ['twenty','twenty-one','twenty-two','twenty-three','twenty-four','twenty-five','twenty-six','twenty-seven','twenty-eight','twenty-nine'][y - 2020] || String(y) : String(y)}`;

    const congText = o.congregationText ||
      `With all rights and privileges thereunto admitted to the award at a congregation held at this College on the ${dayStr} day of ${monthStr} in the year ${getYearWord(year)} and in the testimony whereof we have affixed our signatures and seal of the college`;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(60, 60, 60);
    const congLines = doc.splitTextToSize(congText, W - 70);
    doc.text(congLines, W / 2, 110, { align: 'center' });

    // ── CENTER SEAL — realistic multi-ring design ──
    const sealX = W / 2;
    const sealY = 140;
    const sealR = 16;

    // Outer decorative ring with dashes
    doc.setDrawColor(20, 67, 140);
    doc.setLineWidth(0.3);
    for (let a = 0; a < 360; a += 5) {
      const rad = (a * Math.PI) / 180;
      const x1 = sealX + Math.cos(rad) * (sealR + 2);
      const y1 = sealY + Math.sin(rad) * (sealR + 2);
      const x2 = sealX + Math.cos(rad) * (sealR + 3.5);
      const y2 = sealY + Math.sin(rad) * (sealR + 3.5);
      if (a % 10 === 0) doc.line(x1, y1, x2, y2);
    }

    // Gold outer ring
    doc.setDrawColor(212, 160, 23);
    doc.setLineWidth(2);
    doc.circle(sealX, sealY, sealR, 'S');

    // Blue ring
    doc.setDrawColor(20, 67, 140);
    doc.setLineWidth(1);
    doc.circle(sealX, sealY, sealR - 2.5, 'S');

    // Thin gold ring
    doc.setDrawColor(212, 160, 23);
    doc.setLineWidth(0.5);
    doc.circle(sealX, sealY, sealR - 4, 'S');

    // Inner fill
    doc.setFillColor(20, 67, 140);
    doc.circle(sealX, sealY, sealR - 5, 'F');

    // Gold inner accent
    doc.setDrawColor(212, 160, 23);
    doc.setLineWidth(0.3);
    doc.circle(sealX, sealY, sealR - 6, 'S');

    // Seal text — curved effect simulated
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(5.5);
    doc.text('MICROSOFT', sealX, sealY - 6, { align: 'center' });
    doc.text('TRAINING', sealX, sealY - 2.5, { align: 'center' });

    // MTI large in center
    doc.setFontSize(10);
    doc.setTextColor(212, 160, 23);
    doc.text('MTI', sealX, sealY + 2.5, { align: 'center' });

    doc.setFontSize(5.5);
    doc.setTextColor(255, 255, 255);
    doc.text('INSTITUTE', sealX, sealY + 6, { align: 'center' });

    // Small gold star
    doc.setFillColor(212, 160, 23);
    doc.circle(sealX - 5, sealY + 8.5, 0.8, 'F');
    doc.circle(sealX + 5, sealY + 8.5, 0.8, 'F');
    doc.circle(sealX, sealY - 8.5, 0.8, 'F');

    // Ring text (around seal)
    doc.setFontSize(3.5);
    doc.setTextColor(20, 67, 140);
    const ringTexts = ['EXCELLENCE', '•', 'INTEGRITY', '•', 'INNOVATION', '•', 'KNOWLEDGE', '•'];
    const ringR = sealR + 5;
    let angleOffset = -90;
    ringTexts.forEach(txt => {
      const rad = (angleOffset * Math.PI) / 180;
      const tx = sealX + Math.cos(rad) * ringR;
      const ty = sealY + Math.sin(rad) * ringR;
      doc.text(txt, tx, ty, { align: 'center' });
      angleOffset += 45;
    });

    // ── Signature areas (left: Director, right: Dept Head) ──
    const sigY = 170;

    // Left: Director
    doc.setDrawColor(45, 55, 72);
    doc.setLineWidth(0.3);
    doc.line(35, sigY, 95, sigY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(20, 67, 140);
    doc.text(o.directorName, 65, sigY + 5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text('Director', 65, sigY + 9, { align: 'center' });

    // Center: Year badge
    doc.setFillColor(212, 160, 23);
    doc.roundedRect(W / 2 - 10, sigY - 4, 20, 8, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(String(year), W / 2, sigY + 2, { align: 'center' });

    // Right: Department Head
    doc.line(W - 95, sigY, W - 35, sigY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(20, 67, 140);
    doc.text(o.deptHeadName, W - 65, sigY + 5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text('Department Head', W - 65, sigY + 9, { align: 'center' });

    // ── Red CERTIFIED stamp (tilted feel, bottom-right) ──
    const stX = W - 55;
    const stY = 152;
    doc.setDrawColor(180, 30, 30);
    doc.setLineWidth(1.5);
    doc.circle(stX, stY, 11, 'S');
    doc.setLineWidth(0.5);
    doc.circle(stX, stY, 9.5, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(180, 30, 30);
    doc.text('CERTIFIED', stX, stY - 2, { align: 'center' });
    doc.setFontSize(5);
    doc.text('AUTHENTIC', stX, stY + 2, { align: 'center' });
    doc.setFontSize(4);
    doc.text(`${monthStr.toUpperCase()} ${year}`, stX, stY + 5.5, { align: 'center' });
    // Cross lines for stamp effect
    doc.setDrawColor(180, 30, 30);
    doc.setLineWidth(0.15);
    doc.line(stX - 11, stY - 4, stX + 11, stY - 4);
    doc.line(stX - 11, stY + 4, stX + 11, stY + 4);

    // ── Partner logos bar ──
    const partnerBarY = H - 25;
    // Light background
    doc.setFillColor(248, 248, 248);
    doc.rect(14, partnerBarY - 3, W - 28, 16, 'F');
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.rect(14, partnerBarY - 3, W - 28, 16, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5);
    doc.setTextColor(120, 120, 120);
    doc.text('IN PARTNERSHIP WITH', W / 2, partnerBarY, { align: 'center' });

    // Draw partner logos or branded badges
    const pCount = PARTNER_LOGOS.length;
    const pSpacing = (W - 50) / (pCount - 1);
    const pStartX = 25;
    const logoY = partnerBarY + 3;

    PARTNER_LOGOS.forEach((partner, i) => {
      const px = pStartX + i * pSpacing;
      const imgData = logoImages[i];
      if (imgData) {
        try {
          doc.addImage(imgData, 'PNG', px - 6, logoY - 1, 12, 6);
        } catch {
          // Fallback to text
          drawPartnerBadge(doc, px, logoY + 2, partner.name);
        }
      } else {
        drawPartnerBadge(doc, px, logoY + 2, partner.name);
      }
      // Partner name below logo
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(3.5);
      doc.setTextColor(100, 100, 100);
      doc.text(partner.name, px, logoY + 6.5, { align: 'center' });
    });

    // ── Disclaimer ──
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(5.5);
    doc.setTextColor(150, 150, 150);
    doc.text('(This certificate is issued with no alteration whatsoever)', W / 2, H - 10, { align: 'center' });

    // ── Verification ──
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(4.5);
    doc.text(`Verify: microsoftinstitute.africa/verify/${certNumber}`, W / 2, H - 7, { align: 'center' });

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
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetForm(); setFormCertNumber(generateCertNumber()); setFormAdmission(generateAdmissionNumber()); }}>
                  <Plus className="h-4 w-4 mr-2" /> Generate Certificate
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>Generate New Certificate</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Student</Label>
                    <Select value={formStudentId} onValueChange={setFormStudentId}>
                      <SelectTrigger><SelectValue placeholder="Select student..." /></SelectTrigger>
                      <SelectContent>
                        {students.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.full_name || s.email || s.id}</SelectItem>
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
          <Input placeholder="Search certificates..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Award className="h-5 w-5 text-primary" /></div>
            <div><p className="text-2xl font-bold">{certificates.length}</p><p className="text-sm text-muted-foreground">Total Certificates</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10"><Award className="h-5 w-5 text-accent" /></div>
            <div><p className="text-2xl font-bold">{new Set(certificates.map(c => c.user_id)).size}</p><p className="text-sm text-muted-foreground">Students Certified</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10"><Award className="h-5 w-5 text-green-600" /></div>
            <div><p className="text-2xl font-bold">{new Set(certificates.map(c => c.course_id)).size}</p><p className="text-sm text-muted-foreground">Courses With Certs</p></div>
          </CardContent></Card>
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
                    <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No certificates found</TableCell></TableRow>
                  ) : filteredCerts.map(cert => (
                    <TableRow key={cert.id}>
                      <TableCell>
                        <div><p className="font-medium">{cert.profiles?.full_name || 'Unknown'}</p><p className="text-xs text-muted-foreground">{cert.profiles?.email}</p></div>
                      </TableCell>
                      <TableCell><Badge variant="secondary">{cert.courses?.title || 'N/A'}</Badge></TableCell>
                      <TableCell><code className="text-xs bg-muted px-2 py-1 rounded">{cert.certificate_number}</code></TableCell>
                      <TableCell>{new Date(cert.issued_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" title="Preview & Customize" onClick={() => openPreview(cert)}><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(cert)}><Edit2 className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" title="Download PDF" onClick={() => generatePDF(cert)}><Download className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" title="Delete" onClick={() => handleDelete(cert.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
            <DialogHeader><DialogTitle>Edit Certificate Record</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Certificate Number</Label><Input value={editCertNumber} onChange={e => setEditCertNumber(e.target.value)} /></div>
              <div><Label>Issue Date</Label><Input type="date" value={editIssuedAt} onChange={e => setEditIssuedAt(e.target.value)} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
              <Button onClick={handleUpdate}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview & Customize Dialog */}
        <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Preview & Customize Certificate</DialogTitle></DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div><Label>Student Name</Label><Input value={overrides.studentName} onChange={e => setOv('studentName', e.target.value)} /></div>
                <div><Label>Course Title</Label><Input value={overrides.courseTitle} onChange={e => setOv('courseTitle', e.target.value)} /></div>
                <div><Label>Admission Number</Label><Input value={overrides.admissionNumber} onChange={e => setOv('admissionNumber', e.target.value)} placeholder="MTI/030/2023" /></div>
                <div><Label>Serial Number</Label><Input value={overrides.serialNumber} onChange={e => setOv('serialNumber', e.target.value)} placeholder="MTI/CP/34/2023" /></div>
                <div><Label>Aggregate / Grade</Label>
                  <Select value={overrides.aggregate} onValueChange={v => setOv('aggregate', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DISTINCTION">DISTINCTION</SelectItem>
                      <SelectItem value="CREDIT">CREDIT</SelectItem>
                      <SelectItem value="MERIT">MERIT</SelectItem>
                      <SelectItem value="PASS">PASS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Certificate Number</Label><Input value={overrides.certNumber} onChange={e => setOv('certNumber', e.target.value)} /></div>
                <div><Label>Issue Date</Label><Input type="date" value={overrides.issuedAt} onChange={e => setOv('issuedAt', e.target.value)} /></div>
                <div><Label>Institution Title</Label><Input value={overrides.institutionTitle} onChange={e => setOv('institutionTitle', e.target.value)} /></div>
                <div><Label>Motto</Label><Input value={overrides.motto} onChange={e => setOv('motto', e.target.value)} /></div>
                <div><Label>Director Name</Label><Input value={overrides.directorName} onChange={e => setOv('directorName', e.target.value)} /></div>
                <div><Label>Department Head</Label><Input value={overrides.deptHeadName} onChange={e => setOv('deptHeadName', e.target.value)} /></div>
              </div>
              <div className="flex flex-col items-center justify-center bg-muted rounded-lg p-3">
                <div className="w-full aspect-[297/210] bg-amber-50 border-[3px] border-primary rounded p-2 text-center flex flex-col justify-between relative overflow-hidden">
                  {/* Mini preview */}
                  <div className="bg-primary text-white text-[5px] font-bold py-0.5 rounded-sm">{overrides.institutionTitle}</div>
                  <div className="flex justify-between text-[3px] text-primary font-bold px-1 mt-0.5">
                    <span>ADM: {overrides.admissionNumber}</span>
                    <span>S/N: {overrides.serialNumber}</span>
                  </div>
                  <p className="text-[4px] italic text-accent font-semibold">{overrides.motto}</p>
                  <p className="text-[3px] text-muted-foreground italic">This is to certify that</p>
                  <p className="text-[7px] font-bold text-primary">{overrides.studentName || 'STUDENT NAME'}</p>
                  <p className="text-[3px] italic text-muted-foreground">having satisfied all requirements was awarded</p>
                  <p className="text-[5px] font-bold text-primary">{overrides.courseTitle || 'COURSE TITLE'}</p>
                  <p className="text-[3px]">AGGREGATE: <span className="text-accent font-bold">{overrides.aggregate}</span></p>
                  <div className="w-6 h-6 rounded-full border-2 border-primary mx-auto flex items-center justify-center my-0.5">
                    <span className="text-[3px] font-bold text-primary">MTI</span>
                  </div>
                  <div className="flex justify-between px-2 text-[3px]">
                    <div><div className="border-t border-foreground w-8 mb-0.5" />{overrides.directorName}</div>
                    <div className="bg-accent text-white text-[4px] font-bold px-1 rounded">{overrides.issuedAt ? new Date(overrides.issuedAt).getFullYear() : ''}</div>
                    <div><div className="border-t border-foreground w-8 mb-0.5" />{overrides.deptHeadName}</div>
                  </div>
                  <div className="flex justify-center gap-1 mt-0.5">
                    {PARTNER_LOGOS.slice(0, 6).map((p, i) => (
                      <span key={i} className="text-[2px] bg-primary text-white px-0.5 rounded">{p.name}</span>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Certificate Preview</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>Close</Button>
              <Button onClick={() => { if (!selectedCert) return; generatePDF(selectedCert, overrides); }}>
                <Download className="h-4 w-4 mr-2" /> Download PDF
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </LMSLayout>
  );
};

// Helper for fallback partner badge in PDF
function drawPartnerBadge(doc: jsPDF, x: number, y: number, name: string) {
  doc.setFillColor(20, 67, 140);
  const tw = doc.getTextWidth(name) + 4;
  doc.roundedRect(x - tw / 2, y - 2.5, tw, 5, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.5);
  doc.setTextColor(255, 255, 255);
  doc.text(name, x, y + 1, { align: 'center' });
}

export default CertificateManagement;
