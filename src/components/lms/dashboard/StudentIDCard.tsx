import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { Download, IdCard, Mail, BookOpen, Calendar, Shield } from 'lucide-react';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface StudentIDCardProps {
  userId: string;
}

interface StudentData {
  full_name: string | null;
  email: string | null;
  admission_number: string | null;
  avatar_url: string | null;
  student_status: string | null;
  created_at: string;
}

interface EnrollmentData {
  enrolled_at: string;
  status: string;
  courses: { title: string; category: string | null } | null;
}

const StudentIDCard = ({ userId }: StudentIDCardProps) => {
  const [student, setStudent] = useState<StudentData | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollmentData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudentData();
  }, [userId]);

  const fetchStudentData = async () => {
    const [profileRes, enrollRes] = await Promise.all([
      supabase.from('profiles').select('full_name, email, admission_number, avatar_url, student_status, created_at').eq('id', userId).single(),
      supabase.from('enrollments').select('enrolled_at, status, courses(title, category)').eq('user_id', userId).eq('status', 'active'),
    ]);
    if (profileRes.data) setStudent(profileRes.data);
    if (enrollRes.data) setEnrollments(enrollRes.data as EnrollmentData[]);
    setLoading(false);
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'ST';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const loadImageAsBase64 = (url: string): Promise<string | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  };

  const generateIDCardPDF = async () => {
    if (!student) return;

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [86, 54] });

    // ── FRONT SIDE ──
    // Dark navy background
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 86, 54, 'F');

    // Gold accent stripe at top
    doc.setFillColor(234, 179, 8);
    doc.rect(0, 0, 86, 1.5, 'F');

    // Left panel (dark blue)
    doc.setFillColor(30, 58, 138);
    doc.rect(0, 1.5, 28, 52.5, 'F');

    // Photo area
    if (student.avatar_url) {
      try {
        const base64 = await loadImageAsBase64(student.avatar_url);
        if (base64) {
          doc.addImage(base64, 'JPEG', 4, 5, 20, 24);
          doc.setDrawColor(234, 179, 8);
          doc.setLineWidth(0.4);
          doc.rect(4, 5, 20, 24, 'S');
        } else {
          drawPlaceholderPhoto(doc);
        }
      } catch {
        drawPlaceholderPhoto(doc);
      }
    } else {
      drawPlaceholderPhoto(doc);
    }

    // QR under photo
    try {
      const qrData = `https://www.microsoftinstitute.africa/verify?student=${student.admission_number || userId}`;
      const qrDataUrl = await QRCode.toDataURL(qrData, { width: 120, margin: 0, color: { dark: '#ffffff', light: '#00000000' } });
      doc.addImage(qrDataUrl, 'PNG', 6, 32, 16, 16);
    } catch {}

    doc.setFontSize(2.2);
    doc.setTextColor(148, 163, 184);
    doc.text('SCAN TO VERIFY', 14, 50, { align: 'center' });

    // Right content area
    // Institution header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5);
    doc.setTextColor(234, 179, 8);
    doc.text('TECHNO PANALY', 31, 6);
    doc.text('INSTITUTE OF TECHNOLOGY', 31, 9.5);

    doc.setFontSize(3);
    doc.setTextColor(148, 163, 184);
    doc.text('STUDENT IDENTITY CARD', 31, 12.5);

    // Separator line
    doc.setDrawColor(234, 179, 8);
    doc.setLineWidth(0.2);
    doc.line(31, 14, 83, 14);

    // Student name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    const displayName = (student.full_name || 'Student').toUpperCase();
    doc.text(displayName, 31, 18.5, { maxWidth: 52 });

    // Details
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(3.5);
    let y = 23;

    if (student.admission_number) {
      doc.setTextColor(148, 163, 184);
      doc.text('ADM NO', 31, y);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text(student.admission_number, 50, y);
      doc.setFont('helvetica', 'normal');
      y += 4.5;
    }

    if (enrollments.length > 0 && enrollments[0].courses) {
      doc.setTextColor(148, 163, 184);
      doc.text('PROGRAMME', 31, y);
      doc.setTextColor(255, 255, 255);
      const courseTitle = enrollments[0].courses.title;
      if (courseTitle.length > 28) {
        doc.setFontSize(3);
        doc.text(courseTitle, 31, y + 3.5, { maxWidth: 52 });
        y += 8;
      } else {
        doc.text(courseTitle, 31, y + 3.5);
        y += 7;
      }

      if (enrollments[0].courses.category) {
        doc.setTextColor(148, 163, 184);
        doc.setFontSize(3.5);
        doc.text('SCHOOL', 31, y);
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(3);
        doc.text(enrollments[0].courses.category.substring(0, 35), 31, y + 3.5);
        y += 7;
      }
    }

    doc.setTextColor(148, 163, 184);
    doc.setFontSize(3.5);
    doc.text('STATUS', 31, y);
    const statusColor = student.student_status === 'active' ? [34, 197, 94] : [239, 68, 68];
    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text((student.student_status || 'Active').toUpperCase(), 50, y);

    // Bottom gold stripe
    doc.setFillColor(234, 179, 8);
    doc.rect(0, 52.5, 86, 1.5, 'F');

    // Website on bottom
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(2.2);
    doc.setTextColor(15, 23, 42);
    doc.text('www.microsoftinstitute.africa  |  +254 711 577 338', 43, 53.6, { align: 'center' });

    // ── BACK SIDE ──
    doc.addPage([86, 54], 'landscape');

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 86, 54, 'F');

    doc.setFillColor(234, 179, 8);
    doc.rect(0, 0, 86, 1.5, 'F');

    doc.setFillColor(30, 58, 138);
    doc.rect(0, 1.5, 86, 10, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(255, 255, 255);
    doc.text('TECHNO PANALY INSTITUTE OF TECHNOLOGY', 43, 6, { align: 'center' });
    doc.setFontSize(3);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(234, 179, 8);
    doc.text('NAIROBI, KENYA', 43, 9.5, { align: 'center' });

    doc.setTextColor(203, 213, 225);
    doc.setFontSize(3);

    let by = 16;
    const backLines = [
      'This card certifies that the bearer is a duly registered student',
      'of Techno Panaly Institute of Technology, Nairobi, Kenya.',
      '',
      'The holder is entitled to all privileges of a registered student',
      'as long as this card remains valid.',
    ];
    backLines.forEach(line => {
      doc.text(line, 43, by, { align: 'center' });
      by += 3.5;
    });

    by += 3;

    // Enrolled courses
    if (enrollments.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(3.5);
      doc.setTextColor(234, 179, 8);
      doc.text('ENROLLED PROGRAMMES', 43, by, { align: 'center' });
      by += 4;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(3);
      enrollments.slice(0, 3).forEach(e => {
        doc.text(`• ${e.courses?.title || 'N/A'}`, 10, by);
        by += 3.5;
      });
    }

    // Contact
    by = 44;
    doc.setDrawColor(234, 179, 8);
    doc.setLineWidth(0.2);
    doc.line(10, by - 2, 76, by - 2);

    doc.setFontSize(2.5);
    doc.setTextColor(148, 163, 184);
    doc.text('IF FOUND, RETURN TO: Techno Panaly Institute of Technology, Nairobi', 43, by, { align: 'center' });
    doc.text('Tel: +254 711 577 338  |  Email: admissions@microsoftinstitute.africa', 43, by + 3, { align: 'center' });

    doc.setFillColor(234, 179, 8);
    doc.rect(0, 52.5, 86, 1.5, 'F');

    doc.save(`StudentID-${student.admission_number || 'card'}.pdf`);
    toast.success('Student ID card downloaded!');
  };

  const drawPlaceholderPhoto = (doc: jsPDF) => {
    doc.setFillColor(51, 65, 85);
    doc.rect(4, 5, 20, 24, 'F');
    doc.setDrawColor(234, 179, 8);
    doc.setLineWidth(0.4);
    doc.rect(4, 5, 20, 24, 'S');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(getInitials(student?.full_name || null), 14, 19, { align: 'center' });
  };

  if (loading || !student) return null;

  const primaryCourse = enrollments[0]?.courses;
  const enrollDate = enrollments[0]?.enrolled_at;

  return (
    <Card className="overflow-hidden border border-border/50 bg-gradient-to-br from-card to-muted/30">
      {/* Header with gradient */}
      <div className="relative bg-gradient-to-r from-primary to-primary/80 p-4 pb-12">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <IdCard className="h-4 w-4 text-primary-foreground/80" />
            <span className="text-xs font-medium text-primary-foreground/80 uppercase tracking-wider">Student ID</span>
          </div>
          <Badge
            variant="outline"
            className={`text-[10px] border-primary-foreground/30 capitalize ${
              student.student_status === 'active'
                ? 'text-green-200 bg-green-500/20'
                : 'text-red-200 bg-red-500/20'
            }`}
          >
            <Shield className="h-2.5 w-2.5 mr-1" />
            {student.student_status || 'Active'}
          </Badge>
        </div>
      </div>

      <CardContent className="px-4 pb-4 -mt-8">
        {/* Avatar */}
        <div className="flex items-end gap-3 mb-3">
          <Avatar className="h-16 w-16 border-[3px] border-background shadow-lg">
            <AvatarImage src={student.avatar_url || undefined} alt={student.full_name || 'Student'} />
            <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
              {getInitials(student.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 pb-1">
            <h3 className="font-bold text-sm text-foreground truncate">{student.full_name || 'Student'}</h3>
            {student.admission_number && (
              <p className="text-xs font-mono text-primary font-semibold">{student.admission_number}</p>
            )}
          </div>
        </div>

        {/* Info grid */}
        <div className="space-y-2 mb-3">
          {primaryCourse && (
            <div className="flex items-start gap-2 text-xs">
              <BookOpen className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-muted-foreground text-[10px] uppercase tracking-wider">Programme</p>
                <p className="font-medium text-foreground truncate">{primaryCourse.title}</p>
                {primaryCourse.category && (
                  <p className="text-muted-foreground text-[10px] truncate">{primaryCourse.category}</p>
                )}
              </div>
            </div>
          )}

          {student.email && (
            <div className="flex items-center gap-2 text-xs">
              <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-muted-foreground text-[10px] uppercase tracking-wider">Email</p>
                <p className="font-medium text-foreground truncate">{student.email}</p>
              </div>
            </div>
          )}

          {enrollDate && (
            <div className="flex items-center gap-2 text-xs">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-muted-foreground text-[10px] uppercase tracking-wider">Enrolled</p>
                <p className="font-medium text-foreground">{format(new Date(enrollDate), 'MMM dd, yyyy')}</p>
              </div>
            </div>
          )}
        </div>

        {/* Additional courses */}
        {enrollments.length > 1 && (
          <p className="text-[10px] text-muted-foreground mb-3">
            +{enrollments.length - 1} more programme{enrollments.length > 2 ? 's' : ''}
          </p>
        )}

        <Button
          variant="default"
          size="sm"
          className="w-full"
          onClick={generateIDCardPDF}
        >
          <Download className="h-3.5 w-3.5 mr-2" />
          Download ID Card
        </Button>
      </CardContent>
    </Card>
  );
};

export default StudentIDCard;
