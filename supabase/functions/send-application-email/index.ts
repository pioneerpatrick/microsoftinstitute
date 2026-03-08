import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ApplicationEmailRequest {
  fullName: string;
  email: string;
  phone: string;
  course: string;
  education: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fullName, email, phone, course, education }: ApplicationEmailRequest = await req.json();

    console.log("Processing application email for:", email);

    let applicantEmailSent = false;
    let adminEmailSent = false;
    let applicantError = null;
    let adminError = null;

    // Send confirmation to applicant
    try {
      const applicantEmail = await resend.emails.send({
        from: "Microsoft Institute Africa <admissions@mail.microsoftinstitute.africa>",
        to: [email],
        subject: "Application Received - Microsoft Institute Africa",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #1e3a5f, #2d5a87); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .highlight { background: #e8f4f8; padding: 15px; border-radius: 8px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              h1 { margin: 0; font-size: 24px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎓 Application Received!</h1>
              </div>
              <div class="content">
                <p>Dear <strong>${fullName}</strong>,</p>
                
                <p>Thank you for applying to <strong>Microsoft Institute Africa</strong>! We're excited about your interest in joining our learning community.</p>
                
                <div class="highlight">
                  <h3 style="margin-top: 0;">Your Application Details:</h3>
                  <p><strong>Course:</strong> ${course}</p>
                  <p><strong>Education Level:</strong> ${education}</p>
                  <p><strong>Phone:</strong> ${phone}</p>
                  <p><strong>Status:</strong> Pending Review</p>
                </div>
                
                <p><strong>What happens next?</strong></p>
                <ul>
                  <li>Our admissions team will review your application</li>
                  <li>You'll receive a call within 24-48 hours</li>
                  <li>We'll guide you through the enrollment process</li>
                </ul>
                
                <p>Have questions? Reply to this email or call us at <strong>+254 711 577 338</strong></p>
                
                <p>Best regards,<br><strong>Microsoft Institute Africa Admissions Team</strong></p>
              </div>
              <div class="footer">
                <p>© ${new Date().getFullYear()} Microsoft Institute Africa. All rights reserved.</p>
                <p>This email was sent because you submitted an application on our website.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      if (applicantEmail.error) {
        applicantError = applicantEmail.error;
        console.log("Applicant email failed:", applicantEmail.error);
      } else {
        applicantEmailSent = true;
        console.log("Applicant email sent successfully:", applicantEmail.data);
      }
    } catch (err: any) {
      applicantError = err.message;
      console.error("Applicant email error:", err);
    }

    // Send notification to admin
    try {
      const adminEmail = await resend.emails.send({
        from: "Microsoft Institute Africa <admissions@mail.microsoftinstitute.africa>",
        to: ["admissions@microsoftinstitute.africa"],
        subject: `New Application: ${fullName} - ${course}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #1e3a5f; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              table { width: 100%; border-collapse: collapse; }
              td { padding: 10px; border-bottom: 1px solid #eee; }
              .label-cell { font-weight: bold; color: #555; width: 40%; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2 style="margin: 0;">📋 New Application Received</h2>
              </div>
              <div class="content">
                <table>
                  <tr><td class="label-cell">Full Name:</td><td>${fullName}</td></tr>
                  <tr><td class="label-cell">Email:</td><td><a href="mailto:${email}">${email}</a></td></tr>
                  <tr><td class="label-cell">Phone:</td><td><a href="tel:${phone}">${phone}</a></td></tr>
                  <tr><td class="label-cell">Course:</td><td>${course}</td></tr>
                  <tr><td class="label-cell">Education:</td><td>${education}</td></tr>
                  <tr><td class="label-cell">Submitted:</td><td>${new Date().toLocaleString()}</td></tr>
                </table>
                
                <p style="margin-top: 20px;"><strong>Action Required:</strong> Please contact the applicant within 24-48 hours.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      });

      if (adminEmail.error) {
        adminError = adminEmail.error;
        console.log("Admin email failed:", adminEmail.error);
      } else {
        adminEmailSent = true;
        console.log("Admin email sent successfully:", adminEmail.data);
      }
    } catch (err: any) {
      adminError = err.message;
      console.error("Admin email error:", err);
    }

    console.log("Email status:", { applicantEmailSent, adminEmailSent });

    return new Response(
      JSON.stringify({ 
        success: true,
        emailStatus: {
          applicantEmailSent,
          adminEmailSent,
          note: !applicantEmailSent 
            ? "Confirmation email could not be sent. Please verify your domain at resend.com/domains to enable email delivery to all recipients."
            : null
        }
      }), 
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-application-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
