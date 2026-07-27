import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface WelcomeEmailRequest {
  email: string;
  fullName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName }: WelcomeEmailRequest = await req.json();

    const emailResponse = await resend.emails.send({
      from: "Techno Panaly Institute of Technology <admissions@mail.microsoftinstitute.africa>",
      to: [email],
      subject: "Welcome to Techno Panaly Institute of Technology LMS! 🎓",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1e3a5f, #2d5a87); color: white; padding: 40px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .steps { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .step { display: flex; margin: 15px 0; align-items: flex-start; }
            .step-num { background: #f59e0b; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px; flex-shrink: 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            h1 { margin: 0; font-size: 28px; }
            .btn { display: inline-block; background: #f59e0b; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome, ${fullName}! 🎉</h1>
              <p style="margin: 10px 0 0; opacity: 0.9;">Your learning journey starts now</p>
            </div>
            <div class="content">
              <p>Dear <strong>${fullName}</strong>,</p>
              
              <p>Welcome to <strong>Techno Panaly Institute of Technology</strong>! Your account has been successfully created and you're now part of our growing community of learners.</p>
              
              <div class="steps">
                <h3 style="margin-top: 0;">🚀 Get Started in 3 Easy Steps:</h3>
                <div class="step">
                  <span class="step-num">1</span>
                  <div><strong>Complete Your Profile</strong><br>Add your photo and bio to personalize your learning experience.</div>
                </div>
                <div class="step">
                  <span class="step-num">2</span>
                  <div><strong>Browse Our Courses</strong><br>Explore our catalog and find courses that match your career goals.</div>
                </div>
                <div class="step">
                  <span class="step-num">3</span>
                  <div><strong>Start Learning</strong><br>Enroll in your first course and begin your journey to success!</div>
                </div>
              </div>
              
              <p style="text-align: center;">
                <a href="https://microsoftinstitute.lovable.app/lms/login" class="btn">Access Your Dashboard →</a>
              </p>
              
              <p><strong>Need Help?</strong></p>
              <ul>
                <li>Email: <a href="mailto:support@microsoftinstitute.africa">support@microsoftinstitute.africa</a></li>
                <li>Phone: +254 711 577 338</li>
                <li>WhatsApp: <a href="https://wa.me/254711577338">+254 711 577 338</a></li>
              </ul>
              
              <p>We're excited to have you on board!</p>
              
              <p>Best regards,<br><strong>Techno Panaly Institute of Technology Team</strong></p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Techno Panaly Institute of Technology. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Welcome email sent:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-welcome-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
