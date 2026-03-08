export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          content: string
          course_id: string | null
          created_at: string
          created_by: string | null
          id: string
          is_global: boolean | null
          title: string
        }
        Insert: {
          content: string
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_global?: boolean | null
          title: string
        }
        Update: {
          content?: string
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_global?: boolean | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          course: string
          created_at: string
          education_level: string | null
          email: string
          full_name: string
          id: string
          message: string | null
          phone: string
          status: string
        }
        Insert: {
          course: string
          created_at?: string
          education_level?: string | null
          email: string
          full_name: string
          id?: string
          message?: string | null
          phone: string
          status?: string
        }
        Update: {
          course?: string
          created_at?: string
          education_level?: string | null
          email?: string
          full_name?: string
          id?: string
          message?: string | null
          phone?: string
          status?: string
        }
        Relationships: []
      }
      assignment_submissions: {
        Row: {
          assignment_id: string
          content: string | null
          feedback: string | null
          file_url: string | null
          graded_at: string | null
          graded_by: string | null
          id: string
          score: number | null
          status: string | null
          submitted_at: string
          user_id: string
        }
        Insert: {
          assignment_id: string
          content?: string | null
          feedback?: string | null
          file_url?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          score?: number | null
          status?: string | null
          submitted_at?: string
          user_id: string
        }
        Update: {
          assignment_id?: string
          content?: string | null
          feedback?: string | null
          file_url?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          score?: number | null
          status?: string | null
          submitted_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          is_published: boolean | null
          lesson_id: string | null
          max_score: number | null
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_published?: boolean | null
          lesson_id?: string | null
          max_score?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_published?: boolean | null
          lesson_id?: string | null
          max_score?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          attendance_id: string
          id: string
          marked_at: string | null
          marked_by: string | null
          notes: string | null
          status: string
          student_id: string
        }
        Insert: {
          attendance_id: string
          id?: string
          marked_at?: string | null
          marked_by?: string | null
          notes?: string | null
          status?: string
          student_id: string
        }
        Update: {
          attendance_id?: string
          id?: string
          marked_at?: string | null
          marked_by?: string | null
          notes?: string | null
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_attendance_id_fkey"
            columns: ["attendance_id"]
            isOneToOne: false
            referencedRelation: "class_attendance"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          certificate_number: string
          course_id: string
          id: string
          issued_at: string
          user_id: string
        }
        Insert: {
          certificate_number: string
          course_id: string
          id?: string
          issued_at?: string
          user_id: string
        }
        Update: {
          certificate_number?: string
          course_id?: string
          id?: string
          issued_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      class_attendance: {
        Row: {
          course_id: string
          created_at: string
          id: string
          instructor_id: string
          session_date: string
          session_time: string | null
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          instructor_id: string
          session_date: string
          session_time?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          instructor_id?: string
          session_date?: string
          session_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_attendance_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          status: string
          subject: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          status?: string
          subject: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          status?: string
          subject?: string
        }
        Relationships: []
      }
      course_modules: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          id: string
          order_index: number
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_resources: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          lesson_id: string | null
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          lesson_id?: string | null
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          lesson_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_resources_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_resources_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          difficulty_level: string | null
          duration_hours: number | null
          id: string
          instructor_id: string | null
          is_published: boolean | null
          price: number | null
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          duration_hours?: number | null
          id?: string
          instructor_id?: string | null
          is_published?: boolean | null
          price?: number | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          duration_hours?: number | null
          id?: string
          instructor_id?: string | null
          is_published?: boolean | null
          price?: number | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          completed_at: string | null
          course_id: string
          enrolled_at: string
          id: string
          progress_percentage: number | null
          status: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          enrolled_at?: string
          id?: string
          progress_percentage?: number | null
          status?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          enrolled_at?: string
          id?: string
          progress_percentage?: number | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_attempts: {
        Row: {
          answers: Json | null
          completed_at: string | null
          exam_id: string
          id: string
          passed: boolean | null
          score: number | null
          started_at: string
          user_id: string
        }
        Insert: {
          answers?: Json | null
          completed_at?: string | null
          exam_id: string
          id?: string
          passed?: boolean | null
          score?: number | null
          started_at?: string
          user_id: string
        }
        Update: {
          answers?: Json | null
          completed_at?: string | null
          exam_id?: string
          id?: string
          passed?: boolean | null
          score?: number | null
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_attempts_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_options: {
        Row: {
          id: string
          is_correct: boolean | null
          option_text: string
          order_index: number | null
          question_id: string
        }
        Insert: {
          id?: string
          is_correct?: boolean | null
          option_text: string
          order_index?: number | null
          question_id: string
        }
        Update: {
          id?: string
          is_correct?: boolean | null
          option_text?: string
          order_index?: number | null
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "exam_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_questions: {
        Row: {
          exam_id: string
          id: string
          order_index: number | null
          points: number | null
          question_text: string
          question_type: string | null
        }
        Insert: {
          exam_id: string
          id?: string
          order_index?: number | null
          points?: number | null
          question_text: string
          question_type?: string | null
        }
        Update: {
          exam_id?: string
          id?: string
          order_index?: number | null
          points?: number | null
          question_text?: string
          question_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_questions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          duration_minutes: number | null
          end_date: string | null
          id: string
          is_published: boolean | null
          max_score: number | null
          passing_score: number | null
          start_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          end_date?: string | null
          id?: string
          is_published?: boolean | null
          max_score?: number | null
          passing_score?: number | null
          start_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          end_date?: string | null
          id?: string
          is_published?: boolean | null
          max_score?: number | null
          passing_score?: number | null
          start_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          currency: string
          description: string
          expense_date: string
          id: string
          notes: string | null
          payment_method: string | null
          receipt_number: string | null
          recorded_by: string | null
          updated_at: string
          vendor: string | null
        }
        Insert: {
          amount?: number
          category: string
          created_at?: string
          currency?: string
          description: string
          expense_date?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          receipt_number?: string | null
          recorded_by?: string | null
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          currency?: string
          description?: string
          expense_date?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          receipt_number?: string | null
          recorded_by?: string | null
          updated_at?: string
          vendor?: string | null
        }
        Relationships: []
      }
      fee_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          payment_date: string
          payment_method: string | null
          receipt_number: string | null
          recorded_by: string | null
          student_fee_id: string
          transaction_reference: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          receipt_number?: string | null
          recorded_by?: string | null
          student_fee_id: string
          transaction_reference?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          receipt_number?: string | null
          recorded_by?: string | null
          student_fee_id?: string
          transaction_reference?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_payments_student_fee_id_fkey"
            columns: ["student_fee_id"]
            isOneToOne: false
            referencedRelation: "student_fees"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_structures: {
        Row: {
          amount: number
          course_id: string | null
          created_at: string
          currency: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          payment_frequency: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          course_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          payment_frequency?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          course_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          payment_frequency?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_structures_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_replies: {
        Row: {
          content: string
          created_at: string
          id: string
          is_solution: boolean | null
          topic_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_solution?: boolean | null
          topic_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_solution?: boolean | null
          topic_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_replies_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "forum_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_topics: {
        Row: {
          content: string
          course_id: string
          created_at: string
          id: string
          is_locked: boolean | null
          is_pinned: boolean | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          course_id: string
          created_at?: string
          id?: string
          is_locked?: boolean | null
          is_pinned?: boolean | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          course_id?: string
          created_at?: string
          id?: string
          is_locked?: boolean | null
          is_pinned?: boolean | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_topics_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      instructor_attendance: {
        Row: {
          check_in_time: string | null
          check_out_time: string | null
          created_at: string
          date: string
          id: string
          instructor_id: string
          notes: string | null
          status: string | null
        }
        Insert: {
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string
          date: string
          id?: string
          instructor_id: string
          notes?: string | null
          status?: string | null
        }
        Update: {
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string
          date?: string
          id?: string
          instructor_id?: string
          notes?: string | null
          status?: string | null
        }
        Relationships: []
      }
      instructor_reports: {
        Row: {
          attendance_summary: Json | null
          content: string
          course_id: string | null
          created_at: string
          feedback: string | null
          id: string
          instructor_id: string
          performance_summary: Json | null
          report_period_end: string
          report_period_start: string
          report_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          student_count: number | null
          submitted_at: string | null
        }
        Insert: {
          attendance_summary?: Json | null
          content: string
          course_id?: string | null
          created_at?: string
          feedback?: string | null
          id?: string
          instructor_id: string
          performance_summary?: Json | null
          report_period_end: string
          report_period_start: string
          report_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          student_count?: number | null
          submitted_at?: string | null
        }
        Update: {
          attendance_summary?: Json | null
          content?: string
          course_id?: string | null
          created_at?: string
          feedback?: string | null
          id?: string
          instructor_id?: string
          performance_summary?: Json | null
          report_period_end?: string
          report_period_start?: string
          report_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          student_count?: number | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instructor_reports_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          id: string
          lesson_id: string
          time_spent_seconds: number | null
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          id?: string
          lesson_id: string
          time_spent_seconds?: number | null
          user_id: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          id?: string
          lesson_id?: string
          time_spent_seconds?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          content: string | null
          created_at: string
          duration_minutes: number | null
          id: string
          is_preview: boolean | null
          module_id: string
          order_index: number
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          is_preview?: boolean | null
          module_id: string
          order_index?: number
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          is_preview?: boolean | null
          module_id?: string
          order_index?: number
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      live_session_attendance: {
        Row: {
          duration_seconds: number | null
          id: string
          joined_at: string
          left_at: string | null
          session_id: string
          user_id: string
        }
        Insert: {
          duration_seconds?: number | null
          id?: string
          joined_at?: string
          left_at?: string | null
          session_id: string
          user_id: string
        }
        Update: {
          duration_seconds?: number | null
          id?: string
          joined_at?: string
          left_at?: string | null
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_session_attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_session_requests: {
        Row: {
          id: string
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          session_id: string
          status: string
          user_id: string
        }
        Insert: {
          id?: string
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          session_id: string
          status?: string
          user_id: string
        }
        Update: {
          id?: string
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          session_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_session_requests_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_sessions: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          instructor_id: string | null
          meeting_url: string | null
          moderation_enabled: boolean | null
          recording_url: string | null
          scheduled_at: string
          status: string | null
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          instructor_id?: string | null
          meeting_url?: string | null
          moderation_enabled?: boolean | null
          recording_url?: string | null
          scheduled_at: string
          status?: string | null
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          instructor_id?: string | null
          meeting_url?: string | null
          moderation_enabled?: boolean | null
          recording_url?: string | null
          scheduled_at?: string
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean | null
          parent_id: string | null
          recipient_id: string
          sender_id: string
          subject: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          parent_id?: string | null
          recipient_id: string
          sender_id: string
          subject?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          parent_id?: string | null
          recipient_id?: string
          sender_id?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          email: string
          id: string
          is_active: boolean
          subscribed_at: string
        }
        Insert: {
          email: string
          id?: string
          is_active?: boolean
          subscribed_at?: string
        }
        Update: {
          email?: string
          id?: string
          is_active?: boolean
          subscribed_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          course_id: string | null
          created_at: string
          currency: string | null
          id: string
          metadata: Json | null
          mpesa_receipt_number: string | null
          payment_method: string | null
          status: string | null
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          course_id?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          metadata?: Json | null
          mpesa_receipt_number?: string | null
          payment_method?: string | null
          status?: string | null
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          course_id?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          metadata?: Json | null
          mpesa_receipt_number?: string | null
          payment_method?: string | null
          status?: string | null
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          status_reason: string | null
          status_updated_at: string | null
          status_updated_by: string | null
          student_status: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          status_reason?: string | null
          status_updated_at?: string | null
          status_updated_by?: string | null
          student_status?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          status_reason?: string | null
          status_updated_at?: string | null
          status_updated_by?: string | null
          student_status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          answers: Json | null
          completed_at: string | null
          id: string
          passed: boolean | null
          quiz_id: string
          score: number | null
          started_at: string
          user_id: string
        }
        Insert: {
          answers?: Json | null
          completed_at?: string | null
          id?: string
          passed?: boolean | null
          quiz_id: string
          score?: number | null
          started_at?: string
          user_id: string
        }
        Update: {
          answers?: Json | null
          completed_at?: string | null
          id?: string
          passed?: boolean | null
          quiz_id?: string
          score?: number | null
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_options: {
        Row: {
          id: string
          is_correct: boolean | null
          option_text: string
          order_index: number
          question_id: string
        }
        Insert: {
          id?: string
          is_correct?: boolean | null
          option_text: string
          order_index?: number
          question_id: string
        }
        Update: {
          id?: string
          is_correct?: boolean | null
          option_text?: string
          order_index?: number
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          id: string
          order_index: number
          points: number | null
          question_text: string
          question_type: string | null
          quiz_id: string
        }
        Insert: {
          id?: string
          order_index?: number
          points?: number | null
          question_text: string
          question_type?: string | null
          quiz_id: string
        }
        Update: {
          id?: string
          order_index?: number
          points?: number | null
          question_text?: string
          question_type?: string | null
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          course_id: string | null
          created_at: string
          description: string | null
          id: string
          lesson_id: string | null
          max_attempts: number | null
          passing_score: number | null
          time_limit_minutes: number | null
          title: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          lesson_id?: string | null
          max_attempts?: number | null
          passing_score?: number | null
          time_limit_minutes?: number | null
          title: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          lesson_id?: string | null
          max_attempts?: number | null
          passing_score?: number | null
          time_limit_minutes?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_payments: {
        Row: {
          amount: number
          contract_id: string | null
          created_at: string
          id: string
          notes: string | null
          payment_date: string
          payment_method: string | null
          recorded_by: string | null
          status: string | null
          transaction_reference: string | null
          user_id: string
        }
        Insert: {
          amount: number
          contract_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          payment_date: string
          payment_method?: string | null
          recorded_by?: string | null
          status?: string | null
          transaction_reference?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          contract_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          recorded_by?: string | null
          status?: string | null
          transaction_reference?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_payments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "staff_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      scholarship_applications: {
        Row: {
          course: string
          created_at: string
          education_level: string
          email: string
          full_name: string
          id: string
          phone: string
          statement: string
          status: string
        }
        Insert: {
          course: string
          created_at?: string
          education_level: string
          email: string
          full_name: string
          id?: string
          phone: string
          statement: string
          status?: string
        }
        Update: {
          course?: string
          created_at?: string
          education_level?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string
          statement?: string
          status?: string
        }
        Relationships: []
      }
      session_files: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          session_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          session_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          session_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_files_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          message_type: string
          session_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          message_type?: string
          session_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          message_type?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_notes: {
        Row: {
          content: string
          id: string
          session_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content?: string
          id?: string
          session_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: string
          id?: string
          session_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_notes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_poll_responses: {
        Row: {
          answer: number
          created_at: string
          id: string
          is_correct: boolean | null
          poll_id: string
          user_id: string
        }
        Insert: {
          answer: number
          created_at?: string
          id?: string
          is_correct?: boolean | null
          poll_id: string
          user_id: string
        }
        Update: {
          answer?: number
          created_at?: string
          id?: string
          is_correct?: boolean | null
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_poll_responses_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "session_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      session_polls: {
        Row: {
          correct_answer: number | null
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          options: Json
          poll_type: string
          question: string
          session_id: string
        }
        Insert: {
          correct_answer?: number | null
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          options?: Json
          poll_type?: string
          question: string
          session_id: string
        }
        Update: {
          correct_answer?: number | null
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          options?: Json
          poll_type?: string
          question?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_polls_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_contracts: {
        Row: {
          contract_type: string
          created_at: string
          created_by: string | null
          department: string | null
          end_date: string
          id: string
          payment_frequency: string | null
          position: string | null
          salary_amount: number
          salary_currency: string
          start_date: string
          status: string | null
          terms_accepted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          contract_type?: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          end_date: string
          id?: string
          payment_frequency?: string | null
          position?: string | null
          salary_amount?: number
          salary_currency?: string
          start_date: string
          status?: string | null
          terms_accepted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          contract_type?: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          end_date?: string
          id?: string
          payment_frequency?: string | null
          position?: string | null
          salary_amount?: number
          salary_currency?: string
          start_date?: string
          status?: string | null
          terms_accepted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      student_fees: {
        Row: {
          amount_due: number
          amount_paid: number
          balance: number | null
          course_id: string | null
          created_at: string
          due_date: string | null
          fee_structure_id: string | null
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_due?: number
          amount_paid?: number
          balance?: number | null
          course_id?: string | null
          created_at?: string
          due_date?: string | null
          fee_structure_id?: string | null
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_due?: number
          amount_paid?: number
          balance?: number | null
          course_id?: string | null
          created_at?: string
          due_date?: string | null
          fee_structure_id?: string | null
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_fees_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_fees_fee_structure_id_fkey"
            columns: ["fee_structure_id"]
            isOneToOne: false
            referencedRelation: "fee_structures"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "instructor" | "student"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "instructor", "student"],
    },
  },
} as const
