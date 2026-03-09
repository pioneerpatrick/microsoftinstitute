
-- Create a function to auto-grade MCQ exam attempts
CREATE OR REPLACE FUNCTION public.auto_grade_exam_attempt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_points int := 0;
  v_earned_points int := 0;
  v_max_score int;
  v_passing_score int;
  v_question record;
  v_student_answer int;
  v_correct_option_index int;
BEGIN
  -- Only auto-grade when completed_at is being set (exam submitted)
  IF NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL AND NEW.answers IS NOT NULL THEN
    -- Get exam scoring info
    SELECT max_score, passing_score INTO v_max_score, v_passing_score
    FROM exams WHERE id = NEW.exam_id;
    
    -- Loop through each question
    FOR v_question IN
      SELECT eq.id, eq.points, eq.order_index
      FROM exam_questions eq
      WHERE eq.exam_id = NEW.exam_id
      ORDER BY eq.order_index
    LOOP
      v_total_points := v_total_points + COALESCE(v_question.points, 1);
      
      -- Get student's answer for this question (answers stored as {"question_id": option_index})
      v_student_answer := (NEW.answers -> v_question.id::text)::int;
      
      -- Find the correct option index
      SELECT eo.order_index INTO v_correct_option_index
      FROM exam_options eo
      WHERE eo.question_id = v_question.id AND eo.is_correct = true
      LIMIT 1;
      
      -- Check if answer matches
      IF v_student_answer IS NOT NULL AND v_correct_option_index IS NOT NULL 
         AND v_student_answer = v_correct_option_index THEN
        v_earned_points := v_earned_points + COALESCE(v_question.points, 1);
      END IF;
    END LOOP;
    
    -- Calculate score as percentage of max_score
    IF v_total_points > 0 THEN
      NEW.score := ROUND((v_earned_points::numeric / v_total_points::numeric) * COALESCE(v_max_score, 100));
    ELSE
      NEW.score := 0;
    END IF;
    
    NEW.passed := NEW.score >= COALESCE(v_passing_score, 50);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto-grading BEFORE the row is updated (so score is set before certificate trigger)
CREATE TRIGGER auto_grade_exam_on_submit
BEFORE UPDATE ON exam_attempts
FOR EACH ROW
EXECUTE FUNCTION auto_grade_exam_attempt();

-- Also create the certificate trigger that was defined but not created
CREATE TRIGGER auto_certificate_on_exam_pass
AFTER INSERT OR UPDATE ON exam_attempts
FOR EACH ROW
EXECUTE FUNCTION auto_issue_certificate_on_exam_pass();

-- Create the attendance sync trigger
CREATE TRIGGER sync_attendance_on_session_join
AFTER INSERT ON live_session_attendance
FOR EACH ROW
EXECUTE FUNCTION sync_live_session_to_class_attendance();
