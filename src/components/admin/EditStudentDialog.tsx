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
import { Loader2, Save, Plus, Trash2, BookOpen, User, GraduationCap, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface Student {
  id: string;
  full_name: string | null;
  email: string | null;
  student_status: string | null;
  admission_number: string | null;
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
  const [changingEnrollment, setChangingEnrollment] = useState<string | null>(null);
  
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
  
  // Track which enrollment is being changed and to what
  const [enrollmentChanges, setEnrollmentChanges] = useState<Record<string, string>>({});

  // Load student data when dialog opens
  useEffect(() => {
    if (student && open) {
      setFormData({
        full_name: student.full_name || '',
        email: student.email || '',
        student_status: student.student_status || 'active',
      });
      setNewEnrollment({ fee_structure_id: '' });
      setEnrollmentChanges({});
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
      const selectedFeeStructure = feeStructures.find(
        (f) => f.id === newEnrollment.fee_structure_id,
      );

      if (!selectedFeeStructure) {
        toast.error('Selected program not found. Please refresh and try again.');
        return;
      }

      // Fee structures without a linked course cannot create an LMS enrollment record.
      if (!selectedFeeStructure.course_id) {
        toast.error(
          'This program is not linked to a course, so an enrollment record cannot be created. Please link it to a course first.',
        );
        return;
      }

      const course = courses.find((c) => c.id === selectedFeeStructure.course_id) ?? null;

      // Check if already enrolled in this course
      const { data: existingEnroll, error: existingEnrollError } = await supabase
        .from('enrollments')
        .select('id')
        .eq('user_id', student.id)
        .eq('course_id', selectedFeeStructure.course_id)
        .maybeSingle();

      if (existingEnrollError) throw existingEnrollError;

      if (existingEnroll) {
        toast.error('Student is already enrolled in this course');
        return;
      }

      // Create enrollment
      const { error: enrollInsertError } = await supabase.from('enrollments').insert({
        user_id: student.id,
        course_id: selectedFeeStructure.course_id,
        status: 'active',
        progress_percentage: 0,
      });

      if (enrollInsertError) throw enrollInsertError;

      // Create student fee record
      const { error: feeInsertError } = await supabase.from('student_fees').insert({
        user_id: student.id,
        fee_structure_id: selectedFeeStructure.id,
        course_id: selectedFeeStructure.course_id,
        amount_due: selectedFeeStructure.amount,
        amount_paid: 0,
        balance: selectedFeeStructure.amount,
        status: 'pending',
      });

      if (feeInsertError) throw feeInsertError;

      // Send enrollment email (only after records are created)
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
            feeStructure: {
              name: selectedFeeStructure.name,
              amount: selectedFeeStructure.amount,
              currency: selectedFeeStructure.currency,
            },
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
      // Remove enrollment first
      const { error: enrollError } = await supabase
        .from('enrollments')
        .delete()
        .eq('user_id', student.id)
        .eq('course_id', courseId);

      if (enrollError) {
        console.error('Enrollment delete error:', enrollError);
        throw enrollError;
      }

      // Remove associated fee records
      const { error: feeError } = await supabase
        .from('student_fees')
        .delete()
        .eq('user_id', student.id)
        .eq('course_id', courseId);

      if (feeError) {
        console.error('Fee delete error:', feeError);
        // Don't throw - enrollment was deleted successfully
      }

      // Also delete any fee payments associated with the student fees for this course
      const { data: studentFees } = await supabase
        .from('student_fees')
        .select('id')
        .eq('user_id', student.id)
        .eq('course_id', courseId);

      if (studentFees && studentFees.length > 0) {
        const feeIds = studentFees.map(f => f.id);
        await supabase
          .from('fee_payments')
          .delete()
          .in('student_fee_id', feeIds);
      }

      toast.success('Enrollment removed successfully. You can now add a new enrollment.');
      onStudentUpdated();
    } catch (error: any) {
      toast.error('Failed to remove enrollment: ' + error.message);
    } finally {
      setRemovingEnrollment(null);
    }
  };

  const handleChangeEnrollment = async (oldCourseId: string, newFeeStructureId: string) => {
    if (!student) return;

    const newFeeStructure = feeStructures.find(f => f.id === newFeeStructureId);
    if (!newFeeStructure || !newFeeStructure.course_id) {
      toast.error('Invalid program selected');
      return;
    }

    // Check if already enrolled in the new course
    if (student.enrollments.some(e => e.course_id === newFeeStructure.course_id)) {
      toast.error('Student is already enrolled in this course');
      return;
    }

    setChangingEnrollment(oldCourseId);
    try {
      // Update enrollment to new course
      const { error: enrollError } = await supabase
        .from('enrollments')
        .update({ course_id: newFeeStructure.course_id })
        .eq('user_id', student.id)
        .eq('course_id', oldCourseId);

      if (enrollError) throw enrollError;

      // Update student_fees to new course and fee structure
      const { error: feeError } = await supabase
        .from('student_fees')
        .update({ 
          course_id: newFeeStructure.course_id,
          fee_structure_id: newFeeStructure.id,
          amount_due: newFeeStructure.amount,
        })
        .eq('user_id', student.id)
        .eq('course_id', oldCourseId);

      if (feeError) {
        console.error('Fee update error:', feeError);
        // Try to create a new fee record if update failed
        await supabase.from('student_fees').insert({
          user_id: student.id,
          fee_structure_id: newFeeStructure.id,
          course_id: newFeeStructure.course_id,
          amount_due: newFeeStructure.amount,
          amount_paid: 0,
          status: 'pending',
        });
      }

      toast.success('Enrollment changed successfully!');
      setEnrollmentChanges({});
      onStudentUpdated();
    } catch (error: any) {
      toast.error('Failed to change enrollment: ' + error.message);
    } finally {
      setChangingEnrollment(null);
    }
  };

  // Get fee structures for changing enrollment (exclude current enrollments except the one being changed)
  const getAvailableFeeStructuresForChange = (currentCourseId: string) => {
    return feeStructures.filter((f) => {
      if (!f.course_id) return false;
      // Allow the current course and any course the student is not enrolled in
      return f.course_id === currentCourseId || !student?.enrollments.some((e) => e.course_id === f.course_id);
    });
  };

  // Get courses the student is not enrolled in (only fee structures linked to a course)
  const availableFeeStructures = feeStructures.filter((f) => {
    if (!f.course_id) return false;
    return !student?.enrollments.some((e) => e.course_id === f.course_id);
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
                  <div className="space-y-3">
                    {student.enrollments.map((enrollment, index) => (
                      <div
                        key={index}
                        className="p-3 bg-muted/50 rounded-lg space-y-3"
                      >
                        <div className="flex items-center justify-between">
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
                            disabled={removingEnrollment === enrollment.course_id || changingEnrollment === enrollment.course_id}
                            className="text-destructive hover:text-destructive"
                          >
                            {removingEnrollment === enrollment.course_id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        
                        {/* Change Program Section */}
                        <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                          <RefreshCw className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Change to:</span>
                          <Select
                            value={enrollmentChanges[enrollment.course_id] || ''}
                            onValueChange={(value) => setEnrollmentChanges({
                              ...enrollmentChanges,
                              [enrollment.course_id]: value
                            })}
                          >
                            <SelectTrigger className="flex-1 h-8 text-xs">
                              <SelectValue placeholder="Select different program..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-[200px]">
                              {getAvailableFeeStructuresForChange(enrollment.course_id)
                                .filter(f => f.course_id !== enrollment.course_id)
                                .map((fee) => (
                                  <SelectItem key={fee.id} value={fee.id} className="text-xs">
                                    {fee.name} - {fee.currency} {fee.amount.toLocaleString()}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          {enrollmentChanges[enrollment.course_id] && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs"
                              onClick={() => handleChangeEnrollment(enrollment.course_id, enrollmentChanges[enrollment.course_id])}
                              disabled={changingEnrollment === enrollment.course_id}
                            >
                              {changingEnrollment === enrollment.course_id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                'Apply'
                              )}
                            </Button>
                          )}
                        </div>
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
