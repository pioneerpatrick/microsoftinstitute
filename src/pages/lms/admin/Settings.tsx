import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import LMSLayout from '@/components/lms/LMSLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings as SettingsIcon, Shield, Bell, Users, BookOpen, 
  DollarSign, Calendar, Mail, Database, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

const Settings = () => {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCourses: 0,
    totalEnrollments: 0,
    totalPayments: 0,
    totalStaff: 0,
    totalStudents: 0,
  });

  // Settings state (stored in localStorage for now, can be moved to DB)
  const [settings, setSettings] = useState({
    allowSelfEnrollment: false,
    requireFeePayment: true,
    autoAssignFees: false,
    emailNotifications: true,
    maintenanceMode: false,
    defaultCurrency: 'KES',
    academicYear: '2024/2025',
    currentTerm: 'Term 1',
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/lms/login');
    } else if (!loading && !isAdmin) {
      toast.error('Access denied. Admin only.');
      navigate('/lms/dashboard');
    }
  }, [user, loading, isAdmin, navigate]);

  useEffect(() => {
    if (user && isAdmin) {
      fetchData();
      // Load settings from localStorage
      const savedSettings = localStorage.getItem('lms_settings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    }
  }, [user, isAdmin]);

  const fetchData = async () => {
    // Fetch all stats
    const [
      { count: usersCount },
      { count: coursesCount },
      { count: enrollmentsCount },
      { count: paymentsCount },
      { data: rolesData },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('courses').select('*', { count: 'exact', head: true }),
      supabase.from('enrollments').select('*', { count: 'exact', head: true }),
      supabase.from('fee_payments').select('*', { count: 'exact', head: true }),
      supabase.from('user_roles').select('role'),
    ]);

    const staffCount = rolesData?.filter(r => r.role === 'instructor' || r.role === 'admin').length || 0;
    const studentCount = rolesData?.filter(r => r.role === 'student').length || 0;

    setStats({
      totalUsers: usersCount || 0,
      totalCourses: coursesCount || 0,
      totalEnrollments: enrollmentsCount || 0,
      totalPayments: paymentsCount || 0,
      totalStaff: staffCount,
      totalStudents: studentCount,
    });

    setIsLoading(false);
  };

  const saveSettings = () => {
    localStorage.setItem('lms_settings', JSON.stringify(settings));
    toast.success('Settings saved successfully');
  };

  const handleSettingChange = (key: string, value: boolean | string) => {
    setSettings({ ...settings, [key]: value });
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
            <SettingsIcon className="h-6 w-6" />
            LMS Settings
          </h1>
          <p className="text-muted-foreground">Configure system-wide settings for the LMS</p>
        </div>

        {/* System Overview */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="h-8 w-8 mx-auto text-primary mb-2" />
              <p className="text-2xl font-bold">{stats.totalUsers}</p>
              <p className="text-xs text-muted-foreground">Total Users</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <BookOpen className="h-8 w-8 mx-auto text-green-600 mb-2" />
              <p className="text-2xl font-bold">{stats.totalCourses}</p>
              <p className="text-xs text-muted-foreground">Courses</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Calendar className="h-8 w-8 mx-auto text-blue-600 mb-2" />
              <p className="text-2xl font-bold">{stats.totalEnrollments}</p>
              <p className="text-xs text-muted-foreground">Enrollments</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <DollarSign className="h-8 w-8 mx-auto text-yellow-600 mb-2" />
              <p className="text-2xl font-bold">{stats.totalPayments}</p>
              <p className="text-xs text-muted-foreground">Payments</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Shield className="h-8 w-8 mx-auto text-purple-600 mb-2" />
              <p className="text-2xl font-bold">{stats.totalStaff}</p>
              <p className="text-xs text-muted-foreground">Staff</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="h-8 w-8 mx-auto text-orange-600 mb-2" />
              <p className="text-2xl font-bold">{stats.totalStudents}</p>
              <p className="text-xs text-muted-foreground">Students</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid grid-cols-4 w-full max-w-xl">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="enrollment">Enrollment</TabsTrigger>
            <TabsTrigger value="finance">Finance</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>Basic LMS configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Academic Year</Label>
                    <Input
                      value={settings.academicYear}
                      onChange={(e) => handleSettingChange('academicYear', e.target.value)}
                      placeholder="e.g., 2024/2025"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Current Term</Label>
                    <Input
                      value={settings.currentTerm}
                      onChange={(e) => handleSettingChange('currentTerm', e.target.value)}
                      placeholder="e.g., Term 1"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Maintenance Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      When enabled, only admins can access the LMS
                    </p>
                  </div>
                  <Switch
                    checked={settings.maintenanceMode}
                    onCheckedChange={(v) => handleSettingChange('maintenanceMode', v)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="enrollment" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Enrollment Settings</CardTitle>
                <CardDescription>Control how students enroll in courses</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Allow Self-Enrollment</Label>
                    <p className="text-sm text-muted-foreground">
                      Students can enroll themselves in courses
                    </p>
                  </div>
                  <Switch
                    checked={settings.allowSelfEnrollment}
                    onCheckedChange={(v) => handleSettingChange('allowSelfEnrollment', v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require Fee Payment</Label>
                    <p className="text-sm text-muted-foreground">
                      Students must pay fees before accessing course content
                    </p>
                  </div>
                  <Switch
                    checked={settings.requireFeePayment}
                    onCheckedChange={(v) => handleSettingChange('requireFeePayment', v)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="finance" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Finance Settings</CardTitle>
                <CardDescription>Configure financial operations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Default Currency</Label>
                  <Input
                    value={settings.defaultCurrency}
                    onChange={(e) => handleSettingChange('defaultCurrency', e.target.value)}
                    placeholder="KES"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-Assign Fees</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically assign fees when a student is enrolled
                    </p>
                  </div>
                  <Switch
                    checked={settings.autoAssignFees}
                    onCheckedChange={(v) => handleSettingChange('autoAssignFees', v)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>Configure email and system notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Send email notifications for important events
                    </p>
                  </div>
                  <Switch
                    checked={settings.emailNotifications}
                    onCheckedChange={(v) => handleSettingChange('emailNotifications', v)}
                  />
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Email Configuration</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Emails are sent from: <strong>admissions@microsoftinstitute.africa</strong>
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Notifications include: Enrollment, Payments, Reminders, Status Changes
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end">
          <Button onClick={saveSettings} size="lg">
            <RefreshCw className="h-4 w-4 mr-2" />
            Save All Settings
          </Button>
        </div>
      </div>
    </LMSLayout>
  );
};

export default Settings;
