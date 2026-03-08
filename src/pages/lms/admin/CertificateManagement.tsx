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
import logoImg from '@/assets/logo-transparent.png';
import QRCode from 'qrcode';

interface CertificateRecord {
  id: string;
  certificate_number: string;
  issued_at: string;
  user_id: string;
  course_id: string;
  courses: { title: string; category: string | null; duration_hours: number | null } | null;
  profiles: { full_name: string | null; email: string | null; admission_number: string | null } | null;
}

interface StudentOption { id: string; full_name: string | null; email: string | null; admission_number: string | null; }
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
      const { data: profilesData } = await supabase.from('profiles').select('id, full_name, email, admission_number').in('id', userIds);
      const profileMap = new Map((profilesData || []).map(p => [p.id, p]));
      setCertificates(certsData.map(c => ({ ...c, profiles: profileMap.get(c.user_id) || null })) as unknown as CertificateRecord[]);
    } else {
      setCertificates([]);
    }
  };

  const fetchStudents = async () => {
    // Fetch students who are enrolled
    const { data: enrollmentData } = await supabase
      .from('enrollments')
      .select('user_id')
      .order('enrolled_at', { ascending: false });
    
    if (enrollmentData) {
      const enrolledUserIds = [...new Set(enrollmentData.map(e => e.user_id))];
      if (enrolledUserIds.length > 0) {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, email, admission_number')
          .in('id', enrolledUserIds)
          .order('full_name');
        if (data) setStudents(data);
      }
    }
  };

  const fetchCourses = async () => {
    const { data } = await supabase.from('courses').select('id, title, category, duration_hours').order('title');
    if (data) setCourses(data);
  };

  const generateCertNumber = (admissionNumber: string) => {
    const year = new Date().getFullYear();
    const admSuffix = admissionNumber ? admissionNumber.replace(/\//g, '') : Math.random().toString(36).substring(2, 8).toUpperCase();
    return `MTI-${year}-${admSuffix}`;
  };

  const generateSerialNumber = (admissionNumber: string, courseTitle: string) => {
    const year = new Date().getFullYear();
    const courseAbbr = (courseTitle || 'CP').split(' ').map(w => w[0]).join('').toUpperCase();
    const admSeq = admissionNumber ? admissionNumber.split('/').pop() || '0001' : '0001';
    return `MTI/${courseAbbr}/${admSeq}/${year}`;
  };

  const handleStudentCourseChange = async (studentId: string, courseId: string) => {
    if (!studentId) return;
    let student = students.find(s => s.id === studentId);
    const course = courses.find(c => c.id === courseId);
    
    // Auto-assign admission number if missing
    if (student && !student.admission_number) {
      const { data: admData } = await supabase.rpc('generate_admission_number');
      if (admData) {
        await supabase.from('profiles').update({ admission_number: admData }).eq('id', studentId);
        // Update local state
        setStudents(prev => prev.map(s => s.id === studentId ? { ...s, admission_number: admData } : s));
        student = { ...student, admission_number: admData };
        toast.success(`Admission number ${admData} assigned to ${student.full_name || 'student'}`);
      }
    }
    
    const admNum = student?.admission_number || '';
    if (admNum) setFormAdmission(admNum);
    if (studentId && courseId && admNum) {
      setFormCertNumber(generateCertNumber(admNum));
    }
  };

  const handleCreate = async () => {
    if (!formStudentId || !formCourseId) { toast.error('Please select a student and course'); return; }
    const student = students.find(s => s.id === formStudentId);
    if (!student?.admission_number) { toast.error('Selected student has no admission number'); return; }
    const certNumber = formCertNumber || generateCertNumber(student.admission_number);
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
    const admNum = cert.profiles?.admission_number || '';
    setOverrides({
      studentName: cert.profiles?.full_name || '',
      courseTitle: cert.courses?.title || '',
      certNumber: cert.certificate_number,
      issuedAt: new Date(cert.issued_at).toISOString().split('T')[0],
      institutionTitle: 'MICROSOFT TRAINING INSTITUTE',
      motto: '"Quest for Excellence"',
      admissionNumber: admNum,
      serialNumber: generateSerialNumber(admNum, cert.courses?.title || ''),
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

    // Brand colors from logo
    const BLUE = { r: 20, g: 67, b: 140 };    // #14438C
    const ORANGE = { r: 243, g: 149, b: 25 };  // #F39519
    const GREEN = { r: 76, g: 140, b: 43 };    // #4C8C2B
    const GOLD = { r: 212, g: 160, b: 23 };

    // Preload images + QR code
    const verifyUrl = `https://microsoftinstitute.lovable.app/verify?cert=${encodeURIComponent(certNumber)}`;
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 200, margin: 1, color: { dark: '#14438C', light: '#FFFCF0' } });
    const [logoBase64, ...logoImages] = await Promise.all([
      loadImageAsBase64(logoImg),
      ...PARTNER_LOGOS.map(p => loadImageAsBase64(p.path)),
    ]);

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();

    // ── Cream parchment background ──
    doc.setFillColor(255, 252, 240);
    doc.rect(0, 0, W, H, 'F');

    // Helper for opacity
    const setOpacity = (o: number) => {
      // @ts-ignore - GState exists at runtime in jsPDF
      doc.setGState(new doc.GState({ opacity: o }));
    };

    // ── Diagonal watermark text "Microsoft Training Institute" ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(BLUE.r, BLUE.g, BLUE.b);
    setOpacity(0.045);
    const wmText = 'Microsoft Training Institute';
    for (let wy = -40; wy < H + 80; wy += 45) {
      for (let wx = -100; wx < W + 100; wx += 150) {
        doc.text(wmText, wx, wy, { angle: 35 });
      }
    }
    setOpacity(1);

    // ── Triple ornate border using brand colors ──
    // Outer blue
    doc.setDrawColor(BLUE.r, BLUE.g, BLUE.b);
    doc.setLineWidth(2.5);
    doc.rect(6, 6, W - 12, H - 12);
    // Orange middle
    doc.setDrawColor(ORANGE.r, ORANGE.g, ORANGE.b);
    doc.setLineWidth(1.2);
    doc.rect(10, 10, W - 20, H - 20);
    // Inner blue thin
    doc.setDrawColor(BLUE.r, BLUE.g, BLUE.b);
    doc.setLineWidth(0.5);
    doc.rect(13, 13, W - 26, H - 26);

    // ── Corner medallions with brand colors ──
    const drawMedallion = (cx: number, cy: number) => {
      doc.setFillColor(ORANGE.r, ORANGE.g, ORANGE.b); doc.circle(cx, cy, 4.5, 'F');
      doc.setFillColor(BLUE.r, BLUE.g, BLUE.b); doc.circle(cx, cy, 3, 'F');
      doc.setFillColor(GREEN.r, GREEN.g, GREEN.b); doc.circle(cx, cy, 1.5, 'F');
      doc.setFillColor(255, 252, 240); doc.circle(cx, cy, 0.6, 'F');
    };
    drawMedallion(13, 13); drawMedallion(W - 13, 13);
    drawMedallion(13, H - 13); drawMedallion(W - 13, H - 13);

    // ── Logo centered at top (no background, expanded, proper aspect ratio) ──
    const logoW = 32;
    const logoH = 30;
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', W / 2 - logoW / 2, 12, logoW, logoH);
      } catch { /* fallback below */ }
    }

    // ── Institution name below logo ──
    doc.setFillColor(BLUE.r, BLUE.g, BLUE.b);
    doc.roundedRect(W / 2 - 55, 39, 110, 10, 1.5, 1.5, 'F');
    // Orange accent lines
    doc.setDrawColor(ORANGE.r, ORANGE.g, ORANGE.b);
    doc.setLineWidth(0.6);
    doc.line(W / 2 - 55, 39, W / 2 + 55, 39);
    doc.line(W / 2 - 55, 49, W / 2 + 55, 49);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text('MICROSOFT TRAINING INSTITUTE', W / 2, 46, { align: 'center' });

    // ── Admission & Serial Numbers ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(BLUE.r, BLUE.g, BLUE.b);
    doc.text(`ADMISSION: ${o.admissionNumber}`, 20, 55);
    doc.text(`SERIAL NO: ${o.serialNumber}`, W - 20, 55, { align: 'right' });

    // ── Motto ──
    doc.setFont('helvetica', 'bolditalic');
    doc.setFontSize(10);
    doc.setTextColor(ORANGE.r, ORANGE.g, ORANGE.b);
    doc.text(o.motto, W / 2, 61, { align: 'center' });

    // ── Green divider line ──
    doc.setDrawColor(GREEN.r, GREEN.g, GREEN.b);
    doc.setLineWidth(0.4);
    doc.line(W / 2 - 60, 64, W / 2 + 60, 64);

    // ── "This is to certify that" ──
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text('This is to certify that', W / 2, 71, { align: 'center' });

    // ── Student Name ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(BLUE.r, BLUE.g, BLUE.b);
    doc.text(studentName, W / 2, 82, { align: 'center' });

    // Orange + green underline
    const nameW = doc.getTextWidth(studentName);
    doc.setDrawColor(ORANGE.r, ORANGE.g, ORANGE.b);
    doc.setLineWidth(0.8);
    doc.line(W / 2 - nameW / 2 - 8, 85, W / 2 + nameW / 2 + 8, 85);
    doc.setDrawColor(GREEN.r, GREEN.g, GREEN.b);
    doc.setLineWidth(0.3);
    doc.line(W / 2 - nameW / 2 - 4, 87, W / 2 + nameW / 2 + 4, 87);

    // ── "having satisfied..." ──
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9.5);
    doc.setTextColor(80, 80, 80);
    doc.text('having satisfied all the requirements was awarded', W / 2, 94, { align: 'center' });

    // ── Course Title ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(BLUE.r, BLUE.g, BLUE.b);
    doc.text(courseTitle, W / 2, 104, { align: 'center' });

    // ── Aggregate ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    const aggLabel = 'with AGGREGATE: ';
    const aggLabelW = doc.getTextWidth(aggLabel);
    doc.text(aggLabel, W / 2 - aggLabelW / 2, 112);
    doc.setTextColor(ORANGE.r, ORANGE.g, ORANGE.b);
    doc.text(o.aggregate, W / 2 + aggLabelW / 2, 112);

    // ── Congregation text ──
    const congDate = new Date(issuedAt);
    const dayNum = congDate.getDate();
    const dayWords = ['','First','Second','Third','Fourth','Fifth','Sixth','Seventh','Eighth','Ninth','Tenth',
      'Eleventh','Twelfth','Thirteenth','Fourteenth','Fifteenth','Sixteenth','Seventeenth','Eighteenth','Nineteenth','Twentieth',
      'Twenty-first','Twenty-second','Twenty-third','Twenty-fourth','Twenty-fifth','Twenty-sixth','Twenty-seventh','Twenty-eighth','Twenty-ninth','Thirtieth','Thirty-first'];
    const dayStr = dayWords[dayNum] || String(dayNum);
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const monthStr = monthNames[congDate.getMonth()];
    const getYearWord = (y: number) => {
      const tens = ['twenty','twenty-one','twenty-two','twenty-three','twenty-four','twenty-five','twenty-six','twenty-seven','twenty-eight','twenty-nine'];
      return `Two thousand and ${tens[y - 2020] || String(y)}`;
    };

    const congText = o.congregationText ||
      `With all rights and privileges thereunto admitted to the award at a congregation held at this College on the ${dayStr} day of ${monthStr} in the year ${getYearWord(year)} and in the testimony whereof we have affixed our signatures and seal of the college`;

    doc.setFont('helvetica', 'bolditalic');
    doc.setFontSize(7);
    doc.setTextColor(60, 60, 60);
    const congLines = doc.splitTextToSize(congText, W - 80);
    doc.text(congLines, W / 2, 119, { align: 'center' });

    // ── CENTER SEAL with logo colors ──
    const sealX = W / 2;
    const sealY = 142;
    const sealR = 14;

    // Decorative dashes
    doc.setDrawColor(BLUE.r, BLUE.g, BLUE.b);
    doc.setLineWidth(0.25);
    for (let a = 0; a < 360; a += 8) {
      const rad = (a * Math.PI) / 180;
      if (a % 16 === 0) {
        doc.line(
          sealX + Math.cos(rad) * (sealR + 1.5), sealY + Math.sin(rad) * (sealR + 1.5),
          sealX + Math.cos(rad) * (sealR + 3), sealY + Math.sin(rad) * (sealR + 3)
        );
      }
    }

    // Orange outer ring
    doc.setDrawColor(ORANGE.r, ORANGE.g, ORANGE.b);
    doc.setLineWidth(1.8);
    doc.circle(sealX, sealY, sealR, 'S');
    // Blue ring
    doc.setDrawColor(BLUE.r, BLUE.g, BLUE.b);
    doc.setLineWidth(0.8);
    doc.circle(sealX, sealY, sealR - 2, 'S');
    // Green ring
    doc.setDrawColor(GREEN.r, GREEN.g, GREEN.b);
    doc.setLineWidth(0.4);
    doc.circle(sealX, sealY, sealR - 3.5, 'S');
    // Inner blue fill
    doc.setFillColor(BLUE.r, BLUE.g, BLUE.b);
    doc.circle(sealX, sealY, sealR - 4.5, 'F');
    // Orange inner accent
    doc.setDrawColor(ORANGE.r, ORANGE.g, ORANGE.b);
    doc.setLineWidth(0.3);
    doc.circle(sealX, sealY, sealR - 5.5, 'S');

    // Seal text (no MTI monogram)
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(5);
    doc.text('MICROSOFT', sealX, sealY - 3, { align: 'center' });
    doc.text('TRAINING', sealX, sealY + 0.5, { align: 'center' });
    doc.text('INSTITUTE', sealX, sealY + 4, { align: 'center' });

    // Orange stars
    doc.setFillColor(ORANGE.r, ORANGE.g, ORANGE.b);
    doc.circle(sealX - 4, sealY + 7.5, 0.6, 'F');
    doc.circle(sealX + 4, sealY + 7.5, 0.6, 'F');
    doc.circle(sealX, sealY - 7.5, 0.6, 'F');

    // Ring text
    doc.setFontSize(3.2);
    doc.setTextColor(BLUE.r, BLUE.g, BLUE.b);
    const ringTexts = ['EXCELLENCE', '•', 'INTEGRITY', '•', 'INNOVATION', '•', 'KNOWLEDGE', '•'];
    const ringR = sealR + 4.5;
    let angleOffset = -90;
    ringTexts.forEach(txt => {
      const rad = (angleOffset * Math.PI) / 180;
      doc.text(txt, sealX + Math.cos(rad) * ringR, sealY + Math.sin(rad) * ringR, { align: 'center' });
      angleOffset += 45;
    });

    // ── Signature areas ──
    const sigY = 166;

    // Left: Director
    doc.setDrawColor(BLUE.r, BLUE.g, BLUE.b);
    doc.setLineWidth(0.3);
    doc.line(35, sigY, 95, sigY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(BLUE.r, BLUE.g, BLUE.b);
    doc.text(o.directorName, 65, sigY + 5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text('Director', 65, sigY + 9, { align: 'center' });

    // Center: Year badge in orange
    doc.setFillColor(ORANGE.r, ORANGE.g, ORANGE.b);
    doc.roundedRect(W / 2 - 10, sigY - 4, 20, 8, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(String(year), W / 2, sigY + 2, { align: 'center' });

    // ── "No alteration" disclaimer just below year badge ──
    doc.setFont('helvetica', 'bolditalic');
    doc.setFontSize(5.5);
    doc.setTextColor(200, 0, 0);
    doc.text('This certificate is issued with no alteration whatsoever', W / 2, sigY + 12, { align: 'center' });

    // Right: Department Head
    doc.setDrawColor(BLUE.r, BLUE.g, BLUE.b);
    doc.line(W - 95, sigY, W - 35, sigY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(BLUE.r, BLUE.g, BLUE.b);
    doc.text(o.deptHeadName, W - 65, sigY + 5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text('Department Head', W - 65, sigY + 9, { align: 'center' });

    // ── KNEC-STYLE SECURITY SEAL (bottom-right) ──
    const stX = W - 48;
    const stY = 146;
    const sealOuterR = 13;

    // Gold foil outer ring
    doc.setFillColor(GOLD.r, GOLD.g, GOLD.b);
    setOpacity(0.25);
    doc.circle(stX, stY, sealOuterR + 2, 'F');
    setOpacity(1);

    // Serrated edge (star points around the seal)
    doc.setFillColor(GOLD.r, GOLD.g, GOLD.b);
    for (let a = 0; a < 360; a += 10) {
      const rad = (a * Math.PI) / 180;
      const x1 = stX + Math.cos(rad) * (sealOuterR + 1);
      const y1 = stY + Math.sin(rad) * (sealOuterR + 1);
      doc.circle(x1, y1, 0.8, 'F');
    }

    // Outer dark blue ring
    doc.setDrawColor(BLUE.r, BLUE.g, BLUE.b);
    doc.setLineWidth(2);
    doc.circle(stX, stY, sealOuterR, 'S');
    // Gold inner ring
    doc.setDrawColor(GOLD.r, GOLD.g, GOLD.b);
    doc.setLineWidth(0.8);
    doc.circle(stX, stY, sealOuterR - 2, 'S');
    // Inner blue fill
    doc.setFillColor(BLUE.r, BLUE.g, BLUE.b);
    doc.circle(stX, stY, sealOuterR - 3, 'F');
    // Gold accent ring
    doc.setDrawColor(GOLD.r, GOLD.g, GOLD.b);
    doc.setLineWidth(0.3);
    doc.circle(stX, stY, sealOuterR - 4.5, 'S');

    // Seal text
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(4.5);
    doc.text('OFFICIAL', stX, stY - 4, { align: 'center' });
    doc.setFontSize(3.5);
    doc.text('SECURITY', stX, stY - 1, { align: 'center' });
    doc.setFontSize(3.5);
    doc.text('SEAL', stX, stY + 2, { align: 'center' });
    // Gold star in center
    doc.setFillColor(GOLD.r, GOLD.g, GOLD.b);
    const starCx = stX, starCy = stY + 5.5;
    for (let i = 0; i < 5; i++) {
      const angle = (i * 72 - 90) * Math.PI / 180;
      doc.circle(starCx + Math.cos(angle) * 2, starCy + Math.sin(angle) * 2, 0.4, 'F');
    }
    doc.circle(starCx, starCy, 0.6, 'F');
    // Year at bottom of seal
    doc.setFontSize(3.2);
    doc.setTextColor(GOLD.r, GOLD.g, GOLD.b);
    doc.text(String(year), stX, stY + 9.5, { align: 'center' });

    // ── QR Code (bottom-left) ──
    const qrX = 22;
    const qrY = 140;
    const qrSize = 18;
    try {
      doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
    } catch { /* QR failed */ }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(3.5);
    doc.setTextColor(BLUE.r, BLUE.g, BLUE.b);
    doc.text('Scan to verify', qrX + qrSize / 2, qrY + qrSize + 2.5, { align: 'center' });

    // ── Partner logos bar (no background, just a subtle top line) ──
    const partnerBarY = H - 28;
    doc.setDrawColor(BLUE.r, BLUE.g, BLUE.b);
    doc.setLineWidth(0.15);
    doc.line(30, partnerBarY - 2, W - 30, partnerBarY - 2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(BLUE.r, BLUE.g, BLUE.b);
    doc.text('IN PARTNERSHIP WITH', W / 2, partnerBarY + 1, { align: 'center' });

    // Draw partner logos — maintain aspect ratio, no stretching
    const pCount = PARTNER_LOGOS.length;
    const totalWidth = W - 60;
    const pSpacing = totalWidth / pCount;
    const pStartX = 30 + pSpacing / 2;
    const logoMaxW = 14;
    const logoMaxH = 8;
    const logoRowY = partnerBarY + 4;

    PARTNER_LOGOS.forEach((partner, i) => {
      const px = pStartX + i * pSpacing;
      const imgData = logoImages[i];
      if (imgData) {
        try {
          // Use square fitting to avoid stretching
          const fitW = logoMaxW;
          const fitH = logoMaxH;
          doc.addImage(imgData, 'PNG', px - fitW / 2, logoRowY, fitW, fitH);
        } catch {
          drawPartnerBadge(doc, px, logoRowY + logoMaxH / 2 + 1, partner.name);
        }
      } else {
        drawPartnerBadge(doc, px, logoRowY + logoMaxH / 2 + 1, partner.name);
      }
      // Partner name below
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(3.8);
      doc.setTextColor(80, 80, 80);
      doc.text(partner.name, px, logoRowY + logoMaxH + 2.5, { align: 'center' });
    });

    // ── Slim footer bar with verification info ──
    const footerH = 5;
    doc.setFillColor(BLUE.r, BLUE.g, BLUE.b);
    doc.rect(6, H - 6 - footerH, W - 12, footerH, 'F');
    // Orange top accent on footer
    doc.setDrawColor(ORANGE.r, ORANGE.g, ORANGE.b);
    doc.setLineWidth(0.4);
    doc.line(6, H - 6 - footerH, W - 6, H - 6 - footerH);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(4.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`Certificate No: ${certNumber}  |  Verify online or scan QR code`, W / 2, H - 6 - footerH / 2 + 1.5, { align: 'center' });

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
                <Button onClick={() => { resetForm(); }}>
                  <Plus className="h-4 w-4 mr-2" /> Generate Certificate
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>Generate New Certificate</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Student</Label>
                    <Select value={formStudentId} onValueChange={(val) => {
                      setFormStudentId(val);
                      handleStudentCourseChange(val, formCourseId);
                    }}>
                      <SelectTrigger><SelectValue placeholder="Select student..." /></SelectTrigger>
                      <SelectContent>
                        {students.map(s => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.admission_number ? `[${s.admission_number}] ` : ''}{s.full_name || s.email || s.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Course</Label>
                    <Select value={formCourseId} onValueChange={(val) => {
                      setFormCourseId(val);
                      handleStudentCourseChange(formStudentId, val);
                    }}>
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
