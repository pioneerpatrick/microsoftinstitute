
-- Add sponsorship fields to student_fees
ALTER TABLE public.student_fees 
ADD COLUMN IF NOT EXISTS is_sponsored boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS sponsor_name text,
ADD COLUMN IF NOT EXISTS sponsorship_amount numeric DEFAULT 0;

-- Enable realtime for fee_payments so admin sees payments instantly
ALTER PUBLICATION supabase_realtime ADD TABLE public.fee_payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_fees;
