import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ApprovalEmailRequest {
  studentEmail: string;
  studentName: string;
  sessionTitle: string;
  sessionDate: string;
  meetingUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-session-approval function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the user is authenticated and is staff
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header");
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
      console.error("Auth error:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check if user is staff
    const { data: isStaff } = await supabase.rpc('is_staff', { _user_id: user.id });
    if (!isStaff) {
      console.error("User is not staff");
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { studentEmail, studentName, sessionTitle, sessionDate, meetingUrl }: ApprovalEmailRequest = await req.json();
    
    console.log(`Sending approval email to ${studentEmail} for session: ${sessionTitle}`);

    if (!studentEmail) {
      console.error("No student email provided");
      return new Response(JSON.stringify({ error: "Student email is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const emailResponse = await resend.emails.send({
      from: "Microsoft Institute <onboarding@resend.dev>",
      to: [studentEmail],
      subject: `✅ You're approved to join: ${sessionTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #0078D4 0%, #00BCF2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🎉 You're Approved!</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
            <p style="font-size: 16px;">Hello <strong>${studentName || 'Student'}</strong>,</p>
            
            <p style="font-size: 16px;">Great news! You've been approved to join the live session:</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #0078D4; margin: 20px 0;">
              <h2 style="color: #0078D4; margin: 0 0 10px 0; font-size: 20px;">${sessionTitle}</h2>
              <p style="margin: 5px 0; color: #666;">
                <strong>📅 Date:</strong> ${sessionDate}
              </p>
            </div>
            
            <p style="font-size: 16px;">You can now join the session when it starts. Click the button below or use the link in your LMS dashboard:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${meetingUrl}" style="background: linear-gradient(135deg, #0078D4 0%, #00BCF2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
                Join Session
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666;">
              <strong>Tips for a great session:</strong>
            </p>
            <ul style="font-size: 14px; color: #666;">
              <li>Join a few minutes early to test your audio/video</li>
              <li>Use a quiet environment with good lighting</li>
              <li>Have your questions ready!</li>
            </ul>
            
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #999; text-align: center;">
              This email was sent by Microsoft Institute Africa<br>
              If you have questions, contact your instructor through the LMS.
            </p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-session-approval function:", error);
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
