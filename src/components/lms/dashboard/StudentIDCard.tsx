import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Download, IdCard } from 'lucide-react';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { toast } from 'sonner';

interface StudentIDCardProps {
  userId: string;
}

interface StudentData {
  full_name: string | null;
  email: string | null;
  admission_number: string | null;
  avatar_url: string | null;
  student_status: string | null;
}

interface EnrollmentData {
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
      supabase.from('profiles').select('full_name, email, admission_number, avatar_url, student_status').eq('id', userId).single(),
      supabase.from('enrollments').select('courses(title, category)').eq('user_id', userId).eq('status', 'active'),
    ]);
    if (profileRes.data) setStudent(profileRes.data);
    if (enrollRes.data) setEnrollments(enrollRes.data as EnrollmentData[]);
    setLoading(false);
  };

  const generateIDCardPDF = async () => {
    if (!student) return;

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [86, 54] }); // ID card size

    // ── FRONT SIDE ──
    // Background
    doc.setFillColor(20, 67, 140); // Brand blue
    doc.rect(0, 0, 86, 54, 'F');

    // Top accent bar
    doc.setFillColor(243, 149, 25); // Brand orange
    doc.rect(0, 0, 86, 2, 'F');

    // White content area
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(3, 10, 80, 38, 2, 2, 'F');

    // Institution name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(255, 255, 255);
    doc.text('MICROSOFT TRAINING INSTITUTE', 43, 7, { align: 'center' });
    doc.setFontSize(3.5);
    doc.setFont('helvetica', 'normal');
    doc.text('STUDENT IDENTITY CARD', 43, 9.5, { align: 'center' });

    // Photo placeholder
    doc.setFillColor(230, 230, 230);
    doc.roundedRect(6, 13, 18, 22, 1, 1, 'F');
    doc.setDrawColor(20, 67, 140);
    doc.setLineWidth(0.3);
    doc.roundedRect(6, 13, 18, 22, 1, 1, 'S');
    doc.setFontSize(4);
    doc.setTextColor(150, 150, 150);
    doc.text('PHOTO', 15, 25, { align: 'center' });

    // Student details
    doc.setTextColor(45, 55, 72);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    const displayName = (student.full_name || 'Student').toUpperCase();
    doc.text(displayName, 27, 17, { maxWidth: 52 });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(4);
    doc.setTextColor(100, 100, 100);

    let y = 22;
    if (student.admission_number) {
      doc.text(`ADM NO: ${student.admission_number}`, 27, y);
      y += 4;
    }

    // Course info
    if (enrollments.length > 0) {
      const course = enrollments[0].courses;
      if (course) {
        doc.text(`COURSE: ${course.title}`, 27, y, { maxWidth: 52 });
        y += 4;
        if (course.category) {
          doc.text(`CATEGORY: ${course.category}`, 27, y);
          y += 4;
        }
      }
    }

    doc.text(`STATUS: ${(student.student_status || 'Active').toUpperCase()}`, 27, y);

    // QR Code
    try {
      const qrData = `https://www.microsoftinstitute.africa/verify?student=${student.admission_number || userId}`;
      const qrDataUrl = await QRCode.toDataURL(qrData, { width: 100, margin: 1 });
      doc.addImage(qrDataUrl, 'PNG', 64, 28, 16, 16);
      doc.setFontSize(2.5);
      doc.setTextColor(150, 150, 150);
      doc.text('Scan to verify', 72, 46, { align: 'center' });
    } catch (e) {
      console.error('QR generation failed:', e);
    }

    // Bottom accent
    doc.setFillColor(243, 149, 25);
    doc.rect(0, 52, 86, 2, 'F');

    // Footer
    doc.setFontSize(2.5);
    doc.setTextColor(20, 67, 140);
    doc.text('www.microsoftinstitute.africa', 43, 51, { align: 'center' });

    // ── BACK SIDE ──
    doc.addPage([86, 54], 'landscape');

    doc.setFillColor(245, 245, 245);
    doc.rect(0, 0, 86, 54, 'F');

    doc.setFillColor(20, 67, 140);
    doc.rect(0, 0, 86, 8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5);
    doc.setTextColor(255, 255, 255);
    doc.text('MICROSOFT TRAINING INSTITUTE', 43, 5.5, { align: 'center' });

    doc.setTextColor(45, 55, 72);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(3.5);

    const backText = [
      'This card certifies that the bearer is a registered student',
      'of Microsoft Training Institute, Nairobi, Kenya.',
      '',
      'If found, please return to:',
      'Microsoft Training Institute',
      'Nairobi, Kenya',
      'Tel: +254 711 577 338',
      'Email: admissions@microsoftinstitute.africa',
    ];

    let by = 13;
    backText.forEach(line => {
      doc.text(line, 43, by, { align: 'center' });
      by += 4;
    });

    // Enrolled courses
    if (enrollments.length > 0) {
      by += 2;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(3.5);
      doc.text('ENROLLED COURSES:', 5, by);
      doc.setFont('helvetica', 'normal');
      enrollments.slice(0, 3).forEach(e => {
        by += 3.5;
        doc.text(`• ${e.courses?.title || 'N/A'}`, 7, by);
      });
    }

    doc.setFillColor(243, 149, 25);
    doc.rect(0, 52, 86, 2, 'F');

    doc.save(`StudentID-${student.admission_number || 'card'}.pdf`);
    toast.success('Student ID card downloaded!');
  };

  if (loading || !student) return null;

  return (
    <Card className="overflow-hidden border-2 border-primary/20 hover:border-primary/40 transition-colors">
      <div className="bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary))]/80 p-3 text-primary-foreground">
        <div className="flex items-center gap-2">
          <IdCard className="h-5 w-5" />
          <span className="font-semibold text-sm">Student ID Card</span>
        </div>
      </div>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-14 bg-muted rounded border flex items-center justify-center">
            {student.avatar_url ? (
              <img src={student.avatar_url} alt="Photo" className="w-full h-full object-cover rounded" />
            ) : (
              <IdCard className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{student.full_name || 'Student'}</p>
            {student.admission_number && (
              <p className="text-xs text-muted-foreground font-mono">{student.admission_number}</p>
            )}
            <Badge variant="outline" className="text-xs mt-1 capitalize">
              {student.student_status || 'Active'}
            </Badge>
          </div>
        </div>
        {enrollments.length > 0 && enrollments[0].courses && (
          <p className="text-xs text-muted-foreground mt-2 truncate">
            {enrollments[0].courses.title}
          </p>
        )}
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-3"
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
