-- Add RLS policy to allow authenticated users to enroll themselves in courses
CREATE POLICY "Users can enroll themselves"
ON public.enrollments
FOR INSERT
WITH CHECK (auth.uid() = user_id);