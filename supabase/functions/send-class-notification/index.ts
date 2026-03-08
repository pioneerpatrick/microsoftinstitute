import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ClassNotificationRequest {
  courseId: string;
  sessionId: string;
  sessionTitle: string;
  instructorName: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-class-notification function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check if user is staff
    const { data: isStaff } = await supabase.rpc('is_staff', { _user_id: user.id });
    if (!isStaff) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { courseId, sessionId, sessionTitle, instructorName }: ClassNotificationRequest = await req.json();
    
    console.log(`Notifying students for course ${courseId} about session: ${sessionTitle}`);

    // Use service role to get enrolled students
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get all enrolled students for this course
    const { data: enrollments, error: enrollError } = await adminSupabase
      .from('enrollments')
      .select('user_id')
      .eq('course_id', courseId)
      .eq('status', 'active');

    if (enrollError) {
      console.error("Error fetching enrollments:", enrollError);
      return new Response(JSON.stringify({ error: "Failed to fetch students" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get profiles for enrolled students
    const userIds = enrollments?.map(e => e.user_id) || [];
    
    if (userIds.length === 0) {
      console.log("No enrolled students found");
      return new Response(JSON.stringify({ 
        success: true, 
        emailsSent: 0, 
        emailsFailed: 0,
        totalStudents: 0
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: profiles, error: profilesError } = await adminSupabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
    }

    const profilesMap = new Map((profiles || []).map(p => [p.id, p]));

    console.log(`Found ${enrollments?.length || 0} enrolled students`);

    const meetingUrl = `https://microsoftinstitute.lovable.app/lms/meet/${sessionId}`;
    let emailsSent = 0;
    let emailsFailed = 0;

    // Send emails to all enrolled students
    for (const enrollment of enrollments || []) {
      const profile = profilesMap.get(enrollment.user_id);
      const studentEmail = profile?.email;
      const studentName = profile?.full_name || 'Student';

      if (!studentEmail) {
        console.log(`Skipping student ${enrollment.user_id} - no email`);
        continue;
      }

      try {
        await resend.emails.send({
          from: "Microsoft Institute <onboarding@resend.dev>",
          to: [studentEmail],
          subject: `🔴 LIVE NOW: ${sessionTitle} - Join Class!`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #DC2626 0%, #EF4444 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                <div style="display: inline-block; background: white; padding: 8px 16px; border-radius: 20px; margin-bottom: 15px;">
                  <span style="color: #DC2626; font-weight: bold;">🔴 LIVE NOW</span>
                </div>
                <h1 style="color: white; margin: 0; font-size: 24px;">Class is Starting!</h1>
              </div>
              
              <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
                <p style="font-size: 16px;">Hello <strong>${studentName}</strong>,</p>
                
                <p style="font-size: 16px;">Your instructor <strong>${instructorName}</strong> has started a live class session!</p>
                
                <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #DC2626; margin: 20px 0;">
                  <h2 style="color: #DC2626; margin: 0 0 10px 0; font-size: 20px;">${sessionTitle}</h2>
                  <p style="margin: 5px 0; color: #666;">
                    <strong>⏰ Status:</strong> Starting now!
                  </p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${meetingUrl}" style="background: linear-gradient(135deg, #DC2626 0%, #EF4444 100%); color: white; padding: 18px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 18px; box-shadow: 0 4px 15px rgba(220, 38, 38, 0.3);">
                    🎥 Join Class Now
                  </a>
                </div>
                
                <p style="font-size: 14px; color: #666; text-align: center;">
                  Don't miss out! Click the button above to join the live session.
                </p>
                
                <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
                
                <p style="font-size: 12px; color: #999; text-align: center;">
                  Microsoft Institute Africa<br>
                  <a href="mailto:support@microsoftinstitute.africa" style="color: #0078D4;">support@microsoftinstitute.africa</a>
                </p>
              </div>
            </body>
            </html>
          `,
        });
        emailsSent++;
        console.log(`Email sent to ${studentEmail}`);
      } catch (emailError) {
        emailsFailed++;
        console.error(`Failed to send to ${studentEmail}:`, emailError);
      }
    }

    console.log(`Emails sent: ${emailsSent}, failed: ${emailsFailed}`);

    return new Response(JSON.stringify({ 
      success: true, 
      emailsSent, 
      emailsFailed,
      totalStudents: enrollments?.length || 0
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-class-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
