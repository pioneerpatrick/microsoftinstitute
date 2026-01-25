-- Add student status to profiles for suspend/expel/defer
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS student_status text DEFAULT 'active',
ADD COLUMN IF NOT EXISTS status_updated_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS status_updated_by uuid,
ADD COLUMN IF NOT EXISTS status_reason text;

-- Create staff contracts table for HR management
CREATE TABLE public.staff_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  contract_type text NOT NULL DEFAULT 'full_time',
  start_date date NOT NULL,
  end_date date NOT NULL,
  salary_amount numeric NOT NULL DEFAULT 0,
  salary_currency text NOT NULL DEFAULT 'KES',
  payment_frequency text DEFAULT 'monthly',
  department text,
  position text,
  status text DEFAULT 'active',
  terms_accepted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid
);

-- Create staff salary payments table
CREATE TABLE public.salary_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid REFERENCES public.staff_contracts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  payment_date date NOT NULL,
  payment_method text,
  transaction_reference text,
  notes text,
  status text DEFAULT 'paid',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  recorded_by uuid
);

-- Create instructor reports table
CREATE TABLE public.instructor_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id uuid NOT NULL,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  report_type text NOT NULL DEFAULT 'monthly',
  report_period_start date NOT NULL,
  report_period_end date NOT NULL,
  content text NOT NULL,
  student_count integer DEFAULT 0,
  attendance_summary jsonb,
  performance_summary jsonb,
  status text DEFAULT 'submitted',
  submitted_at timestamp with time zone DEFAULT now(),
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  feedback text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create class attendance table for manual attendance marking
CREATE TABLE public.class_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  session_date date NOT NULL,
  session_time time,
  instructor_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create attendance records for students
CREATE TABLE public.attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_id uuid REFERENCES public.class_attendance(id) ON DELETE CASCADE NOT NULL,
  student_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'present',
  notes text,
  marked_at timestamp with time zone DEFAULT now(),
  marked_by uuid
);

-- Create instructor attendance table
CREATE TABLE public.instructor_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id uuid NOT NULL,
  date date NOT NULL,
  check_in_time timestamp with time zone,
  check_out_time timestamp with time zone,
  status text DEFAULT 'present',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(instructor_id, date)
);

-- Enable RLS on all new tables
ALTER TABLE public.staff_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructor_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructor_attendance ENABLE ROW LEVEL SECURITY;

-- RLS policies for staff_contracts
CREATE POLICY "Admins can manage contracts" ON public.staff_contracts FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Staff can view own contract" ON public.staff_contracts FOR SELECT USING (auth.uid() = user_id);

-- RLS policies for salary_payments
CREATE POLICY "Admins can manage salaries" ON public.salary_payments FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Staff can view own payments" ON public.salary_payments FOR SELECT USING (auth.uid() = user_id);

-- RLS policies for instructor_reports
CREATE POLICY "Admins can manage reports" ON public.instructor_reports FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Instructors can create own reports" ON public.instructor_reports FOR INSERT WITH CHECK (auth.uid() = instructor_id);
CREATE POLICY "Instructors can view own reports" ON public.instructor_reports FOR SELECT USING (auth.uid() = instructor_id);
CREATE POLICY "Instructors can update own pending reports" ON public.instructor_reports FOR UPDATE USING (auth.uid() = instructor_id AND status = 'submitted');

-- RLS policies for class_attendance
CREATE POLICY "Staff can manage class attendance" ON public.class_attendance FOR ALL USING (is_staff(auth.uid()));
CREATE POLICY "Students can view attendance" ON public.class_attendance FOR SELECT USING (true);

-- RLS policies for attendance_records
CREATE POLICY "Staff can manage attendance records" ON public.attendance_records FOR ALL USING (is_staff(auth.uid()));
CREATE POLICY "Students can view own attendance" ON public.attendance_records FOR SELECT USING (auth.uid() = student_id);

-- RLS policies for instructor_attendance
CREATE POLICY "Admins can manage instructor attendance" ON public.instructor_attendance FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Instructors can view own attendance" ON public.instructor_attendance FOR SELECT USING (auth.uid() = instructor_id);
CREATE POLICY "Instructors can mark own attendance" ON public.instructor_attendance FOR INSERT WITH CHECK (auth.uid() = instructor_id);
CREATE POLICY "Instructors can update own attendance" ON public.instructor_attendance FOR UPDATE USING (auth.uid() = instructor_id);

-- Allow students to update their own fees (for self-payment)
CREATE POLICY "Students can update own fees for payment" ON public.student_fees FOR UPDATE USING (auth.uid() = user_id);

-- Allow students to record own payments
CREATE POLICY "Students can record own payments" ON public.fee_payments FOR INSERT WITH CHECK (auth.uid() = user_id);