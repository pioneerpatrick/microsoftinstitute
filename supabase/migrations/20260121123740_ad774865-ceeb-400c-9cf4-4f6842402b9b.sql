-- Add payment_frequency column to fee_structures table
ALTER TABLE public.fee_structures 
ADD COLUMN IF NOT EXISTS payment_frequency text DEFAULT 'per_term';

-- Add comment explaining the values
COMMENT ON COLUMN public.fee_structures.payment_frequency IS 'Payment frequency: per_month, per_term (3 months), or one_time';