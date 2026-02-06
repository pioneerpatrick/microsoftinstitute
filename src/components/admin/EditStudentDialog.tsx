import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Save, Plus, Trash2, BookOpen, User, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';

interface Student {
  id: string;
  full_name: string | null;
  email: string | null;
  student_status: string | null;
  created_at: string;
  enrollments: Array<{
    course_id: string;
    status: string;
    courses: { title: string } | null;
  }>;
  fees: Array<{
    amount_due: number;
    amount_paid: number;
    balance: number;
    status: string;
  }>;
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  duration_hours: number | null;
  category?: string | null;
}

interface FeeStructure {
  id: string;
  name: string;
  course_id: string | null;
  amount: number;
  currency: string;
}

interface EditStudentDialogProps {
  student: Student | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courses: Course[];
  feeStructures: FeeStructure[];
  onStudentUpdated: () => void;
}

const EditStudentDialog = ({
  student,
  open,
  onOpenChange,
  courses,
  feeStructures,
  onStudentUpdated,
}: EditStudentDialogProps) => {
  const [saving, setSaving] = useState(false);
  const [addingEnrollment, setAddingEnrollment] = useState(false);
  const [removingEnrollment, setRemovingEnrollment] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    student_status: 'active',
  });
  
  // New enrollment form
  const [newEnrollment, setNewEnrollment] = useState({
    fee_structure_id: '',
  });

  // Load student data when dialog opens
  useEffect(() => {
    if (student && open) {
      setFormData({
        full_name: student.full_name || '',
        email: student.email || '',
        student_status: student.student_status || 'active',
      });
      setNewEnrollment({ fee_structure_id: '' });
    }
  }, [student, open]);

  const handleSaveProfile = async () => {
    if (!student) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          student_status: formData.student_status,
          status_updated_at: new Date().toISOString(),
        })
        .eq('id', student.id);

      if (error) throw error;

      // Send status notification if status changed
      if (formData.student_status !== student.student_status) {
        try {
          await supabase.functions.invoke('send-student-status-notification', {
            body: {
              studentEmail: student.email,
              studentName: formData.full_name,
              newStatus: formData.student_status,
              reason: `Status updated to ${formData.student_status}`,
            },
          });
        } catch (emailError) {
          console.error('Status notification email failed:', emailError);
        }
      }

      toast.success('Student profile updated successfully');
      onStudentUpdated();
    } catch (error: any) {
      toast.error('Failed to update profile: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddEnrollment = async () => {
    if (!student || !newEnrollment.fee_structure_id) {
      toast.error('Please select a program to enroll');
      return;
    }

    setAddingEnrollment(true);
    try {
      const selectedFeeStructure = feeStructures.find(f => f.id === newEnrollment.fee_structure_id);
      const course = selectedFeeStructure?.course_id 
        ? courses.find(c => c.id === selectedFeeStructure.course_id)
        : null;

      // Check if already enrolled in this course
      if (selectedFeeStructure?.course_id) {
        const { data: existingEnroll } = await supabase
          .from('enrollments')
          .select('id')
          .eq('user_id', student.id)
          .eq('course_id', selectedFeeStructure.course_id)
          .maybeSingle();

        if (existingEnroll) {
          toast.error('Student is already enrolled in this course');
          setAddingEnrollment(false);
          return;
        }

        // Create enrollment
        await supabase.from('enrollments').insert({
          user_id: student.id,
          course_id: selectedFeeStructure.course_id,
          status: 'active',
          progress_percentage: 0,
        });
      }

      // Create student fee record
      if (selectedFeeStructure) {
        await supabase.from('student_fees').insert({
          user_id: student.id,
          fee_structure_id: selectedFeeStructure.id,
          course_id: selectedFeeStructure.course_id,
          amount_due: selectedFeeStructure.amount,
          amount_paid: 0,
          balance: selectedFeeStructure.amount,
          status: 'pending',
        });
      }

      // Send enrollment email
      try {
        await supabase.functions.invoke('send-enrollment-email', {
          body: {
            studentEmail: student.email,
            studentName: formData.full_name || student.full_name,
            courseTitle: course?.title || selectedFeeStructure?.name || 'New Program',
            courseDescription: course?.description,
            courseDuration: course?.duration_hours,
            courseCategory: course?.category,
            courseSchedule: 'Classes held Monday to Friday, 8:00 AM - 5:00 PM EAT',
            feeStructure: selectedFeeStructure ? {
              name: selectedFeeStructure.name,
              amount: selectedFeeStructure.amount,
              currency: selectedFeeStructure.currency,
            } : undefined,
          },
        });
        toast.success('Student enrolled successfully! Confirmation email sent.');
      } catch (emailError) {
        console.error('Enrollment email failed:', emailError);
        toast.success('Student enrolled successfully! (Email notification failed)');
      }

      setNewEnrollment({ fee_structure_id: '' });
      onStudentUpdated();
    } catch (error: any) {
      toast.error('Failed to add enrollment: ' + error.message);
    } finally {
      setAddingEnrollment(false);
    }
  };

  const handleRemoveEnrollment = async (courseId: string) => {
    if (!student) return;

    setRemovingEnrollment(courseId);
    try {
      // Remove enrollment
      await supabase
        .from('enrollments')
        .delete()
        .eq('user_id', student.id)
        .eq('course_id', courseId);

      // Remove associated fee record
      await supabase
        .from('student_fees')
        .delete()
        .eq('user_id', student.id)
        .eq('course_id', courseId);

      toast.success('Enrollment removed successfully');
      onStudentUpdated();
    } catch (error: any) {
      toast.error('Failed to remove enrollment: ' + error.message);
    } finally {
      setRemovingEnrollment(null);
    }
  };

  // Get courses the student is not enrolled in
  const availableFeeStructures = feeStructures.filter(f => {
    if (!f.course_id) return true; // Non-course fee structures always available
    return !student?.enrollments.some(e => e.course_id === f.course_id);
  });

  if (!student) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Edit Student Details
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="enrollments" className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Enrollments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4 pt-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Student's full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed. Contact support if needed.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Student Status</Label>
                <Select
                  value={formData.student_status}
                  onValueChange={(value) => setFormData({ ...formData, student_status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="deferred">Deferred</SelectItem>
                    <SelectItem value="expelled">Expelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleSaveProfile} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="enrollments" className="space-y-4 pt-4">
            {/* Current Enrollments */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Current Enrollments
                </CardTitle>
              </CardHeader>
              <CardContent>
                {student.enrollments.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No current enrollments</p>
                ) : (
                  <div className="space-y-2">
                    {student.enrollments.map((enrollment, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <GraduationCap className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{enrollment.courses?.title}</p>
                            <Badge variant="outline" className="mt-1">
                              {enrollment.status}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveEnrollment(enrollment.course_id)}
                          disabled={removingEnrollment === enrollment.course_id}
                          className="text-destructive hover:text-destructive"
                        >
                          {removingEnrollment === enrollment.course_id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Add New Enrollment */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add New Enrollment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Program / Fee Structure</Label>
                  <Select
                    value={newEnrollment.fee_structure_id}
                    onValueChange={(value) => setNewEnrollment({ fee_structure_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a program to enroll" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {availableFeeStructures.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          No available programs to enroll
                        </div>
                      ) : (
                        availableFeeStructures.map((fee) => {
                          const linkedCourse = courses.find(c => c.id === fee.course_id);
                          return (
                            <SelectItem key={fee.id} value={fee.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{fee.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {linkedCourse ? `Course: ${linkedCourse.title} • ` : ''}
                                  {fee.currency} {fee.amount.toLocaleString()}
                                </span>
                              </div>
                            </SelectItem>
                          );
                        })
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleAddEnrollment}
                  disabled={addingEnrollment || !newEnrollment.fee_structure_id}
                  className="w-full"
                >
                  {addingEnrollment ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enrolling...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Enrollment & Send Email
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  An enrollment confirmation email will be automatically sent to the student.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default EditStudentDialog;
