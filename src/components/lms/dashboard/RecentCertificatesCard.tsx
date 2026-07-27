import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Award, Share2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface RecentCertificatesCardProps {
  userId: string;
}

interface Certificate {
  id: string;
  certificate_number: string;
  issued_at: string;
  courses: {
    title: string;
  };
}

const RecentCertificatesCard = ({ userId }: RecentCertificatesCardProps) => {
  const navigate = useNavigate();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCertificates();
  }, [userId]);

  const fetchCertificates = async () => {
    const { data } = await supabase
      .from('certificates')
      .select('id, certificate_number, issued_at, courses (title)')
      .eq('user_id', userId)
      .order('issued_at', { ascending: false })
      .limit(3);

    if (data) setCertificates(data as Certificate[]);
    setLoading(false);
  };

  const shareCertificate = (cert: Certificate) => {
    const verifyUrl = `https://www.microsoftinstitute.africa/verify?cert=${encodeURIComponent(cert.certificate_number)}`;
    if (navigator.share) {
      navigator.share({
        title: `Certificate - ${cert.courses?.title}`,
        text: `I completed ${cert.courses?.title} at Techno Panaly Institute of Technology!`,
        url: verifyUrl,
      });
    } else {
      navigator.clipboard.writeText(verifyUrl);
      toast.success('Verification link copied to clipboard!');
    }
  };

  if (loading) return null;
  if (certificates.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Award className="h-5 w-5 text-amber-500" />
          Recent Certificates
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {certificates.map((cert) => (
            <div key={cert.id} className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 border border-amber-200/50">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{cert.courses?.title}</p>
                <p className="text-xs text-muted-foreground font-mono">{cert.certificate_number}</p>
              </div>
              <div className="flex items-center gap-1 ml-2">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => shareCertificate(cert)}>
                  <Share2 className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                  <a href={`/verify/${cert.certificate_number}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
              </div>
            </div>
          ))}
        </div>
        <Button variant="link" className="w-full mt-2 text-sm" onClick={() => navigate('/lms/certificates')}>
          View all certificates →
        </Button>
      </CardContent>
    </Card>
  );
};

export default RecentCertificatesCard;
