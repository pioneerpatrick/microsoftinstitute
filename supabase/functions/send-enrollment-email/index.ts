import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EnrollmentEmailRequest {
  studentEmail: string;
  studentName: string;
  courseTitle: string;
  courseDescription?: string;
  courseDuration?: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { studentEmail, studentName, courseTitle, courseDescription, courseDuration }: EnrollmentEmailRequest = await req.json();

    console.log(`Sending enrollment email to ${studentEmail} for course: ${courseTitle}`);

    const emailResponse = await resend.emails.send({
      from: "Microsoft Institute Africa <onboarding@resend.dev>",
      to: [studentEmail],
      subject: `🎉 You're enrolled: ${courseTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1e3a5f, #2d5a87); color: white; padding: 40px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .course-card { background: white; padding: 25px; border-radius: 10px; border-left: 4px solid #f59e0b; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            h1 { margin: 0; font-size: 28px; }
            .btn { display: inline-block; background: #f59e0b; color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 10px 0; }
            .emoji { font-size: 48px; margin-bottom: 15px; }
            .tips { background: #e8f4f8; padding: 20px; border-radius: 8px; margin: 20px 0; }
            ul { padding-left: 20px; }
            li { margin: 8px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="emoji">🎓</div>
              <h1>Enrollment Confirmed!</h1>
              <p style="margin: 10px 0 0; opacity: 0.9;">Welcome to your learning journey</p>
            </div>
            <div class="content">
              <p>Hello <strong>${studentName || 'Student'}</strong>,</p>
              
              <p>Congratulations! You've been successfully enrolled in a new course at <strong>Microsoft Institute Africa</strong>.</p>
              
              <div class="course-card">
                <h2 style="margin-top: 0; color: #1e3a5f;">📚 ${courseTitle}</h2>
                ${courseDescription ? `<p style="color: #666;">${courseDescription}</p>` : ''}
                ${courseDuration ? `<p><strong>⏱️ Duration:</strong> ${courseDuration} hours</p>` : ''}
              </div>
              
              <div class="tips">
                <h3 style="margin-top: 0;">💡 Tips for Success:</h3>
                <ul>
                  <li>Set a regular study schedule</li>
                  <li>Complete lessons in order for best results</li>
                  <li>Participate in discussion forums</li>
                  <li>Don't hesitate to ask questions</li>
                  <li>Track your progress through the dashboard</li>
                </ul>
              </div>
              
              <p style="text-align: center;">
                <a href="https://microsoftinstitute.lovable.app/lms/my-courses" class="btn">Start Learning Now →</a>
              </p>
              
              <p>Need assistance? Contact us at <a href="mailto:admissions@microsoftinstitute.africa">admissions@microsoftinstitute.africa</a> or call <strong>+254 723 821 798</strong>.</p>
              
              <p>Happy learning!</p>
              
              <p>Best regards,<br><strong>Microsoft Institute Africa Team</strong></p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Microsoft Institute Africa. All rights reserved.</p>
              <p>You're receiving this because you enrolled in a course.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Enrollment email sent:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-enrollment-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
