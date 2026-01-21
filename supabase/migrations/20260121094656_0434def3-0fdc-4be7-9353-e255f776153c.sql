-- Create fee_structures table for course fees
CREATE TABLE public.fee_structures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'KES',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create student_fees table to track individual student fee assignments
CREATE TABLE public.student_fees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  fee_structure_id UUID REFERENCES public.fee_structures(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  amount_due NUMERIC NOT NULL DEFAULT 0,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  balance NUMERIC GENERATED ALWAYS AS (amount_due - amount_paid) STORED,
  status TEXT NOT NULL DEFAULT 'pending',
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create fee_payments table for payment records
CREATE TABLE public.fee_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_fee_id UUID REFERENCES public.student_fees(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  payment_method TEXT,
  transaction_reference TEXT,
  receipt_number TEXT,
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  recorded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;

-- Fee structures policies (admin only)
CREATE POLICY "Admins can manage fee structures"
ON public.fee_structures
FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can view fee structures"
ON public.fee_structures
FOR SELECT
USING (is_staff(auth.uid()));

-- Student fees policies
CREATE POLICY "Admins can manage student fees"
ON public.student_fees
FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can view student fees"
ON public.student_fees
FOR SELECT
USING (is_staff(auth.uid()));

CREATE POLICY "Students can view own fees"
ON public.student_fees
FOR SELECT
USING (auth.uid() = user_id);

-- Fee payments policies
CREATE POLICY "Admins can manage fee payments"
ON public.fee_payments
FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can view fee payments"
ON public.fee_payments
FOR SELECT
USING (is_staff(auth.uid()));

CREATE POLICY "Students can view own payments"
ON public.fee_payments
FOR SELECT
USING (auth.uid() = user_id);

-- Add triggers for updated_at
CREATE TRIGGER update_fee_structures_updated_at
BEFORE UPDATE ON public.fee_structures
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_student_fees_updated_at
BEFORE UPDATE ON public.student_fees
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();