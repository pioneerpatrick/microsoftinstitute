-- Add SELECT policies so authenticated admins can read submissions
CREATE POLICY "Authenticated users can view applications" 
ON public.applications 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can update applications" 
ON public.applications 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view contacts" 
ON public.contacts 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can update contacts" 
ON public.contacts 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view newsletter subscribers" 
ON public.newsletter_subscribers 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can update newsletter subscribers" 
ON public.newsletter_subscribers 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete newsletter subscribers" 
ON public.newsletter_subscribers 
FOR DELETE 
TO authenticated
USING (true);