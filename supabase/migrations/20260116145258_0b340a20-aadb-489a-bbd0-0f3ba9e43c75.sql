-- Create exams table
CREATE TABLE public.exams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER DEFAULT 60,
  max_score INTEGER DEFAULT 100,
  passing_score INTEGER DEFAULT 50,
  is_published BOOLEAN DEFAULT false,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create exam attempts table
CREATE TABLE public.exam_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  score INTEGER,
  passed BOOLEAN,
  answers JSONB,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create exam questions table
CREATE TABLE public.exam_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT DEFAULT 'multiple_choice',
  points INTEGER DEFAULT 1,
  order_index INTEGER DEFAULT 0
);

-- Create exam options table
CREATE TABLE public.exam_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.exam_questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_options ENABLE ROW LEVEL SECURITY;

-- RLS policies for exams
CREATE POLICY "Staff can manage exams" ON public.exams FOR ALL USING (is_staff(auth.uid()));
CREATE POLICY "Published exams viewable" ON public.exams FOR SELECT USING (is_published = true);

-- RLS policies for exam_attempts
CREATE POLICY "Users can create own attempts" ON public.exam_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own attempts" ON public.exam_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own attempts" ON public.exam_attempts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Staff can view all attempts" ON public.exam_attempts FOR SELECT USING (is_staff(auth.uid()));

-- RLS policies for exam_questions
CREATE POLICY "Staff can manage questions" ON public.exam_questions FOR ALL USING (is_staff(auth.uid()));
CREATE POLICY "Questions viewable" ON public.exam_questions FOR SELECT USING (true);

-- RLS policies for exam_options
CREATE POLICY "Staff can manage options" ON public.exam_options FOR ALL USING (is_staff(auth.uid()));
CREATE POLICY "Options viewable" ON public.exam_options FOR SELECT USING (true);

-- Create triggers for updated_at
CREATE TRIGGER update_exams_updated_at BEFORE UPDATE ON public.exams
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();