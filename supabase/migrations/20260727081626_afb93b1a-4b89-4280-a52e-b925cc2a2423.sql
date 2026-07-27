-- Applications: staff only
DROP POLICY IF EXISTS "Authenticated users can view applications" ON public.applications;
DROP POLICY IF EXISTS "Authenticated users can update applications" ON public.applications;
CREATE POLICY "Staff can view applications" ON public.applications FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update applications" ON public.applications FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- Contacts: staff only
DROP POLICY IF EXISTS "Authenticated users can view contacts" ON public.contacts;
DROP POLICY IF EXISTS "Authenticated users can update contacts" ON public.contacts;
CREATE POLICY "Staff can view contacts" ON public.contacts FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update contacts" ON public.contacts FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- Exam questions/options: authenticated only, published exams only
DROP POLICY IF EXISTS "Questions viewable" ON public.exam_questions;
DROP POLICY IF EXISTS "Options viewable" ON public.exam_options;
CREATE POLICY "Questions viewable by authenticated for published exams" ON public.exam_questions FOR SELECT TO authenticated
USING (
  public.is_staff(auth.uid())
  OR EXISTS (SELECT 1 FROM public.exams e WHERE e.id = exam_questions.exam_id AND e.is_published = true)
);
CREATE POLICY "Options viewable by authenticated for published exams" ON public.exam_options FOR SELECT TO authenticated
USING (
  public.is_staff(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.exam_questions q JOIN public.exams e ON e.id = q.exam_id
    WHERE q.id = exam_options.question_id AND e.is_published = true
  )
);
REVOKE SELECT ON public.exam_questions FROM anon;
REVOKE SELECT ON public.exam_options FROM anon;