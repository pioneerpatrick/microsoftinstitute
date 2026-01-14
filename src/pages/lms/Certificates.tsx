import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Award, Download, Share2, ExternalLink } from 'lucide-react';
import LMSLayout from '@/components/lms/LMSLayout';

interface Certificate {
  id: string;
  certificate_number: string;
  issued_at: string;
  courses: {
    title: string;
    category: string | null;
  };
}

const Certificates = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/lms/login');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchCertificates();
    }
  }, [user]);

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
          category
        )
      `)
      .eq('user_id', user.id)
      .order('issued_at', { ascending: false });

    if (!error && data) {
      setCertificates(data as Certificate[]);
    }
    setIsLoading(false);
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
          <h1 className="text-2xl font-bold">My Certificates</h1>
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
              <Button onClick={() => navigate('/lms/my-courses')}>
                View My Courses
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {certificates.map((cert) => (
              <Card key={cert.id} className="overflow-hidden">
                <div className="bg-gradient-to-r from-primary to-primary/80 p-6 text-primary-foreground">
                  <div className="flex items-start justify-between">
                    <div>
                      <Award className="h-10 w-10 mb-4" />
                      <h3 className="text-xl font-bold mb-1">Certificate of Completion</h3>
                      <p className="text-primary-foreground/80">{cert.courses?.title}</p>
                    </div>
                    {cert.courses?.category && (
                      <Badge variant="secondary" className="bg-white/20 text-white border-0">
                        {cert.courses.category}
                      </Badge>
                    )}
                  </div>
                </div>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Certificate ID</span>
                      <span className="font-mono">{cert.certificate_number}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Issued Date</span>
                      <span>{new Date(cert.issued_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button variant="outline" className="flex-1">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                      <Button variant="outline" size="icon">
                        <Share2 className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon">
                        <ExternalLink className="h-4 w-4" />
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
