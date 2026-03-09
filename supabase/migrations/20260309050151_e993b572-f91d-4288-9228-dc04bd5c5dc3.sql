
-- Sponsors/Donors table
CREATE TABLE public.sponsors (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  contact_email text,
  contact_phone text,
  organization text,
  total_pledged numeric NOT NULL DEFAULT 0,
  total_disbursed numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'KES',
  notes text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Sponsor disbursements / fund allocations
CREATE TABLE public.sponsor_disbursements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sponsor_id uuid NOT NULL REFERENCES public.sponsors(id) ON DELETE CASCADE,
  student_fee_id uuid REFERENCES public.student_fees(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'KES',
  purpose text NOT NULL,
  disbursement_date date NOT NULL DEFAULT CURRENT_DATE,
  receipt_number text,
  payment_method text,
  recorded_by uuid,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_disbursements ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Admin only management
CREATE POLICY "Admins can manage sponsors" ON public.sponsors FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Staff can view sponsors" ON public.sponsors FOR SELECT USING (is_staff(auth.uid()));

CREATE POLICY "Admins can manage disbursements" ON public.sponsor_disbursements FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Staff can view disbursements" ON public.sponsor_disbursements FOR SELECT USING (is_staff(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_sponsors_updated_at BEFORE UPDATE ON public.sponsors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
