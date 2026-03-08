import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Award, Search, CheckCircle, XCircle, GraduationCap, BookOpen } from 'lucide-react';
import logoImg from '@/assets/logo-transparent.png';

interface VerificationResult {
  certificate_number: string;
  issued_at: string;
  course_title: string | null;
  course_category: string | null;
  course_duration: number | null;
  student_name: string | null;
  admission_number: string | null;
}

const Verify = () => {
  const [searchParams] = useSearchParams();
  const [certNumber, setCertNumber] = useState('');
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Auto-verify if cert param is in URL (from QR code)
  useEffect(() => {
    const certParam = searchParams.get('cert');
    if (certParam) {
      setCertNumber(certParam);
      // Trigger verification
      verifyCertificate(certParam);
    }
  }, [searchParams]);

  const handleVerify = async () => {
    const trimmed = certNumber.trim();
    if (!trimmed) return;

    setIsLoading(true);
    setResult(null);
    setNotFound(false);

    const { data: cert, error } = await supabase
      .from('certificates')
      .select('certificate_number, issued_at, user_id, course_id, courses(title, category, duration_hours)')
      .eq('certificate_number', trimmed)
      .maybeSingle();

    if (error || !cert) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }

    // Fetch student profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, admission_number')
      .eq('id', cert.user_id)
      .maybeSingle();

    // Fetch enrollments for grade info
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('status, progress_percentage')
      .eq('user_id', cert.user_id)
      .eq('course_id', cert.course_id)
      .maybeSingle();

    setResult({
      certificate_number: cert.certificate_number,
      issued_at: cert.issued_at,
      course_title: cert.courses?.title || null,
      course_category: cert.courses?.category || null,
      course_duration: cert.courses?.duration_hours || null,
      student_name: profile?.full_name || null,
      admission_number: profile?.admission_number || null,
    });
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      <title>Verify Certificate | Microsoft Training Institute</title>
      <meta name="description" content="Verify the authenticity of certificates issued by Microsoft Training Institute." />

      {/* Header */}
      <div className="bg-[hsl(var(--primary))] text-white py-6">
        <div className="container mx-auto px-4 flex items-center gap-4">
          <img src={logoImg} alt="MTI Logo" className="h-14 w-auto" />
          <div>
            <h1 className="text-xl font-bold">MICROSOFT TRAINING INSTITUTE</h1>
            <p className="text-sm opacity-80">Certificate Verification Portal</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-2xl">
        {/* Search Card */}
        <Card className="mb-8 shadow-lg border-t-4 border-t-[hsl(var(--primary))]">
          <CardHeader className="text-center">
            <Award className="h-12 w-12 mx-auto text-[hsl(var(--primary))] mb-2" />
            <CardTitle className="text-2xl">Verify Certificate</CardTitle>
            <p className="text-muted-foreground text-sm">
              Enter the certificate number to verify its authenticity
            </p>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => { e.preventDefault(); handleVerify(); }}
              className="flex gap-3"
            >
              <Input
                placeholder="e.g. MTI-2026-ABC123"
                value={certNumber}
                onChange={(e) => setCertNumber(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={isLoading || !certNumber.trim()}>
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Verify
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Result */}
        {result && (
          <Card className="shadow-lg border-l-4 border-l-green-500 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-6">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <div>
                  <h2 className="text-lg font-bold text-green-700">Certificate Verified</h2>
                  <p className="text-sm text-muted-foreground">This is an authentic certificate issued by MTI</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Student Name</p>
                    <p className="font-semibold">{result.student_name || 'N/A'}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Admission Number</p>
                    <p className="font-semibold">{result.admission_number || 'N/A'}</p>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-1">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Course</p>
                  </div>
                  <p className="font-semibold text-lg">{result.course_title || 'N/A'}</p>
                  <div className="flex gap-2 mt-2">
                    {result.course_category && (
                      <Badge variant="secondary">{result.course_category}</Badge>
                    )}
                    {result.course_duration && (
                      <Badge variant="outline">{result.course_duration} hours</Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">Certificate Number</p>
                    <p className="font-mono font-semibold">{result.certificate_number}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 mb-1">
                      <GraduationCap className="h-4 w-4 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Issue Date</p>
                    </div>
                    <p className="font-semibold">
                      {new Date(result.issued_at).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {notFound && (
          <Card className="shadow-lg border-l-4 border-l-destructive animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <XCircle className="h-8 w-8 text-destructive" />
                <div>
                  <h2 className="text-lg font-bold text-destructive">Certificate Not Found</h2>
                  <p className="text-sm text-muted-foreground">
                    No certificate matching "{certNumber}" was found. Please check the number and try again.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer note */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          © {new Date().getFullYear()} Microsoft Training Institute. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Verify;
