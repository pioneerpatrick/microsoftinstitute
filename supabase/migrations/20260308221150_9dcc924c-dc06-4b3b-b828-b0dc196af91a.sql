CREATE POLICY "Staff can update profiles" 
ON public.profiles 
FOR UPDATE 
TO authenticated 
USING (is_staff(auth.uid()))
WITH CHECK (is_staff(auth.uid()));