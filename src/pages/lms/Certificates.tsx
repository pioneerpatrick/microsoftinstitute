import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Award, Download, Share2, ExternalLink, CheckCircle2 } from 'lucide-react';
import LMSLayout from '@/components/lms/LMSLayout';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';
import { registerCalligraphyFont, setCalligraphyFont, toSentenceCase } from '@/lib/registerCalligraphyFont';

interface Certificate {
  id: string;
  certificate_number: string;
  issued_at: string;
  courses: {
    title: string;
    category: string | null;
    duration_hours: number | null;
  };
  profiles?: {
    full_name: string | null;
  };
}

const Certificates = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [studentName, setStudentName] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/lms/login');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchCertificates();
      fetchStudentProfile();
    }
  }, [user]);

  const fetchStudentProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();
    if (data) {
      setStudentName(data.full_name || user.user_metadata?.full_name || 'Student');
    }
  };

  const fetchCertificates = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('certificates')
      .select(`
        id,
        certificate_number,
        issued_at,
        courses (
          title,
          category,
          duration_hours
        )
      `)
      .eq('user_id', user.id)
      .order('issued_at', { ascending: false });

    if (!error && data) {
      setCertificates(data as Certificate[]);
    }
    setIsLoading(false);
  };

  const generateCertificatePDF = async (cert: Certificate) => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });
    await registerCalligraphyFont(doc);

    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();

    // Background gradient effect (light cream/gold)
    doc.setFillColor(255, 251, 240);
    doc.rect(0, 0, width, height, 'F');

    // ── Repeating college name pattern background (multi-color) ──
    const BLUE_C = { r: 20, g: 67, b: 140 };
    const GREEN_C = { r: 76, g: 140, b: 43 };
    const ORANGE_C = { r: 243, g: 149, b: 25 };
    const GOLD_C = { r: 212, g: 160, b: 23 };
    const wmColors = [BLUE_C, GREEN_C, ORANGE_C, { r: 160, g: 160, b: 160 }, GOLD_C];
    const wmText = 'Microsoft Training Institute';
    const setOpacity = (o: number) => {
      // @ts-ignore
      doc.setGState(new doc.GState({ opacity: o }));
    };
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    setOpacity(0.09);
    let wmIdx = 0;
    for (let wy = 4; wy < height; wy += 6) {
      for (let wx = -10; wx < width + 10; wx += 48) {
        const c = wmColors[wmIdx % wmColors.length];
        doc.setTextColor(c.r, c.g, c.b);
        doc.text(wmText, wx, wy);
        wmIdx++;
      }
    }
    setOpacity(1);

    // Decorative border
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(3);
    doc.rect(10, 10, width - 20, height - 20);
    doc.setLineWidth(1);
    doc.rect(15, 15, width - 30, height - 30);

    // Corner decorations
    const cornerSize = 20;
    doc.setFillColor(212, 175, 55);
    [[15, 15], [width - 35, 15], [15, height - 35], [width - 35, height - 35]].forEach(([x, y]) => {
      doc.setDrawColor(212, 175, 55);
      doc.circle(x + cornerSize / 2, y + cornerSize / 2, 3, 'F');
    });

    // Header - Institution
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(45, 55, 72);
    doc.text('MICROSOFT TRAINING INSTITUTE', width / 2, 35, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Excellence in Technology Education', width / 2, 42, { align: 'center' });

    // Certificate Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(36);
    doc.setTextColor(212, 175, 55);
    doc.text('CERTIFICATE', width / 2, 62, { align: 'center' });

    doc.setFontSize(16);
    doc.setTextColor(45, 55, 72);
    doc.text('OF COMPLETION', width / 2, 72, { align: 'center' });

    // Decorative line
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.5);
    doc.line(width / 2 - 60, 78, width / 2 + 60, 78);

    // "This is to certify that"
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text('This is to certify that', width / 2, 90, { align: 'center' });

    // Student Name (Calligraphy)
    setCalligraphyFont(doc);
    doc.setFontSize(32);
    doc.setTextColor(45, 55, 72);
    const displayName = toSentenceCase(studentName);
    doc.text(displayName, width / 2, 105, { align: 'center' });
    doc.setFont('helvetica', 'normal'); // reset font

    // Underline for name
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.3);
    const nameWidth = doc.getTextWidth(displayName);
    doc.line(width / 2 - nameWidth / 2 - 10, 108, width / 2 + nameWidth / 2 + 10, 108);

    // "has successfully completed"
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text('has successfully completed the course', width / 2, 120, { align: 'center' });

    // Course Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(45, 55, 72);
    doc.text(cert.courses?.title || 'Course', width / 2, 135, { align: 'center' });

    // Duration if available
    if (cert.courses?.duration_hours) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Duration: ${cert.courses.duration_hours} Hours`, width / 2, 143, { align: 'center' });
    }

    // Date and Certificate Number
    const issueDate = new Date(cert.issued_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);

    // Left side - Date
    doc.text('Date of Issue', 50, 165, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(45, 55, 72);
    doc.text(issueDate, 50, 172, { align: 'center' });
    doc.setLineWidth(0.3);
    doc.line(25, 160, 75, 160);

    // Right side - Certificate Number
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Certificate Number', width - 50, 165, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(45, 55, 72);
    doc.text(cert.certificate_number, width - 50, 172, { align: 'center' });
    doc.line(width - 75, 160, width - 25, 160);

    // QR Code placeholder (text representation)
    doc.setFillColor(255, 255, 255);
    doc.rect(width / 2 - 15, 155, 30, 30, 'F');
    doc.setDrawColor(200, 200, 200);
    doc.rect(width / 2 - 15, 155, 30, 30);
    doc.setFontSize(6);
    doc.setTextColor(150, 150, 150);
    doc.text('Scan to Verify', width / 2, 188, { align: 'center' });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Verify at: microsoftinstitute.africa/verify/${cert.certificate_number}`,
      width / 2,
      height - 20,
      { align: 'center' }
    );

    // Save PDF
    doc.save(`Certificate-${cert.certificate_number}.pdf`);
    toast.success('Certificate downloaded successfully!');
  };

  const shareCertificate = (cert: Certificate) => {
    const verifyUrl = `https://www.microsoftinstitute.africa/verify?cert=${encodeURIComponent(cert.certificate_number)}`;
    if (navigator.share) {
      navigator.share({
        title: `${studentName}'s Certificate - ${cert.courses?.title}`,
        text: `I completed ${cert.courses?.title} at Microsoft Training Institute!`,
        url: verifyUrl,
      });
    } else {
      navigator.clipboard.writeText(verifyUrl);
      toast.success('Verification link copied to clipboard!');
    }
  };

  if (loading || isLoading) {
    return (
      <LMSLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </LMSLayout>
    );
  }

  return (
    <LMSLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Award className="h-7 w-7 text-primary" />
            My Certificates
          </h1>
          <p className="text-muted-foreground">View and download your earned certificates</p>
        </div>

        {certificates.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Award className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Certificates Yet</h3>
              <p className="text-muted-foreground mb-6">
                Complete your courses to earn certificates. Keep learning!
              </p>
              <Button onClick={() => navigate('/lms/courses')}>
                View My Courses
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {certificates.map((cert) => (
              <Card key={cert.id} className="overflow-hidden group hover:shadow-lg transition-shadow">
                <div className="bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 p-6 text-white relative overflow-hidden">
                  {/* Decorative pattern */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-2 left-2 w-8 h-8 border-2 border-white rounded-full" />
                    <div className="absolute bottom-2 right-2 w-8 h-8 border-2 border-white rounded-full" />
                    <div className="absolute top-1/2 left-1/4 w-4 h-4 bg-white rounded-full" />
                    <div className="absolute top-1/3 right-1/4 w-4 h-4 bg-white rounded-full" />
                  </div>
                  <div className="relative z-10 flex items-start justify-between">
                    <div>
                      <Award className="h-10 w-10 mb-4 text-white" />
                      <h3 className="text-xl font-bold mb-1">Certificate of Completion</h3>
                      <p className="text-white/90">{cert.courses?.title}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {cert.courses?.category && (
                        <Badge variant="secondary" className="bg-white/20 text-white border-0 backdrop-blur">
                          {cert.courses.category}
                        </Badge>
                      )}
                      <div className="flex items-center gap-1 text-xs bg-white/20 px-2 py-1 rounded backdrop-blur">
                        <CheckCircle2 className="h-3 w-3" />
                        Verified
                      </div>
                    </div>
                  </div>
                </div>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Awarded to</span>
                      <span className="font-semibold">{studentName}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Certificate ID</span>
                      <span className="font-mono text-xs bg-muted px-2 py-1 rounded">{cert.certificate_number}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Issued Date</span>
                      <span>{new Date(cert.issued_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                    {cert.courses?.duration_hours && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Course Duration</span>
                        <span>{cert.courses.duration_hours} Hours</span>
                      </div>
                    )}
                    <div className="flex gap-2 pt-4">
                      <Button 
                        variant="default" 
                        className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600"
                        onClick={() => generateCertificatePDF(cert)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download PDF
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => shareCertificate(cert)}>
                        <Share2 className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" asChild>
                        <a href={`/verify/${cert.certificate_number}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </LMSLayout>
  );
};

export default Certificates;
