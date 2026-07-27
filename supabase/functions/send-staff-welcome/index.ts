import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface StaffWelcomeRequest {
  email: string;
  fullName: string;
  role: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName, role }: StaffWelcomeRequest = await req.json();

    const roleTitle = role === 'admin' ? 'Administrator' : role === 'instructor' ? 'Instructor' : 'Staff Member';
    const lmsUrl = "https://microsoftinstitute.lovable.app/lms/login";

    const emailResponse = await resend.emails.send({
      from: "Techno Panaly Institute of Technology <admissions@mail.microsoftinstitute.africa>",
      to: [email],
      subject: `Welcome to Techno Panaly Institute of Technology - ${roleTitle} Account Created`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1e3a5f, #2d5a87); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .highlight { background: #e8f4f8; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .btn { display: inline-block; background: #f59e0b; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            h1 { margin: 0; font-size: 24px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome to the Team!</h1>
            </div>
            <div class="content">
              <p>Dear <strong>${fullName}</strong>,</p>
              
              <p>Welcome to <strong>Techno Panaly Institute of Technology</strong>! Your ${roleTitle.toLowerCase()} account has been successfully created.</p>
              
              <div class="highlight">
                <h3 style="margin-top: 0;">Your Role: ${roleTitle}</h3>
                ${role === 'instructor' ? `
                  <p>As an instructor, you can:</p>
                  <ul>
                    <li>Create and manage courses</li>
                    <li>Enroll and track student progress</li>
                    <li>Host live sessions and classes</li>
                    <li>Grade assignments and exams</li>
                    <li>Submit departmental reports</li>
                  </ul>
                ` : role === 'admin' ? `
                  <p>As an administrator, you have full access to:</p>
                  <ul>
                    <li>Manage all users and roles</li>
                    <li>Configure fee structures and accounting</li>
                    <li>View all reports and analytics</li>
                    <li>Manage staff contracts and salaries</li>
                    <li>System-wide configurations</li>
                  </ul>
                ` : `
                  <p>You now have access to the Learning Management System with staff privileges.</p>
                `}
              </div>
              
              <p style="text-align: center;">
                <a href="${lmsUrl}" class="btn">Access LMS Dashboard</a>
              </p>
              
              <p><strong>Next Steps:</strong></p>
              <ol>
                <li>Log in to the LMS using your email and password</li>
                <li>Complete your profile setup</li>
                <li>Explore the dashboard and available features</li>
              </ol>
              
              <p>Need assistance? Contact HR at <strong>admissions@microsoftinstitute.africa</strong> or call <strong>+254 711 577 338</strong></p>
              
              <p>Best regards,<br><strong>Techno Panaly Institute of Technology Administration</strong></p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Techno Panaly Institute of Technology. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Staff welcome email sent:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending staff welcome email:", error);
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
