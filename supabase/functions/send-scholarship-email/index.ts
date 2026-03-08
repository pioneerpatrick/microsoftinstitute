import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ScholarshipEmailRequest {
  fullName: string;
  email: string;
  phone: string;
  course: string;
  educationLevel: string;
  statement: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fullName, email, phone, course, educationLevel, statement }: ScholarshipEmailRequest = await req.json();

    console.log(`Sending scholarship confirmation email to ${email}`);

    const institutionName = "Microsoft Institute Africa";
    const institutionPhone = "+254 711 577 338";

    // Send confirmation to the applicant
    await resend.emails.send({
      from: `${institutionName} <onboarding@resend.dev>`,
      to: [email],
      subject: `🎓 Scholarship Application Received - ${institutionName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
            .header { background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 50%, #3d7ab0 100%); color: white; padding: 40px; text-align: center; }
            .header h1 { margin: 0; font-size: 26px; font-weight: 700; }
            .header p { margin: 10px 0 0; opacity: 0.9; font-size: 15px; }
            .content { padding: 35px 40px; }
            .info-card { background: #f0f9ff; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #0284c7; }
            .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
            .info-row:last-child { border-bottom: none; }
            .info-label { font-size: 13px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; }
            .info-value { font-weight: 600; color: #1e3a5f; }
            .statement-box { background: #fefce8; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #f59e0b; }
            .next-steps { background: #f0fdf4; padding: 20px; border-radius: 10px; margin: 20px 0; }
            .next-steps h3 { margin: 0 0 12px; color: #166534; }
            .next-steps li { margin: 8px 0; color: #15803d; }
            .footer { background: #1e3a5f; color: white; padding: 25px 40px; text-align: center; font-size: 13px; }
            .footer a { color: #fcd34d; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div style="font-size: 48px; margin-bottom: 10px;">🎓</div>
              <h1>Scholarship Application Received!</h1>
              <p>Thank you for applying to our Sponsorship Program</p>
            </div>
            
            <div class="content">
              <p>Dear <strong>${fullName}</strong>,</p>
              
              <p>We have received your scholarship application at <strong>${institutionName}</strong>. Our admissions team will carefully review your application and get back to you within <strong>7 business days</strong>.</p>
              
              <div class="info-card">
                <h3 style="margin: 0 0 15px; color: #0369a1;">📋 Your Application Summary</h3>
                <div class="info-row">
                  <span class="info-label">Full Name</span>
                  <span class="info-value">${fullName}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Email</span>
                  <span class="info-value">${email}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Phone</span>
                  <span class="info-value">${phone}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Course</span>
                  <span class="info-value">${course}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Education Level</span>
                  <span class="info-value">${educationLevel}</span>
                </div>
              </div>

              <div class="statement-box">
                <h3 style="margin: 0 0 10px; color: #92400e;">📝 Your Statement</h3>
                <p style="margin: 0; color: #78350f; font-style: italic;">"${statement}"</p>
              </div>
              
              <div class="next-steps">
                <h3>✅ What Happens Next?</h3>
                <ol>
                  <li>Our admissions team reviews your application</li>
                  <li>We may contact you for additional information</li>
                  <li>You will receive an email with the outcome of your application</li>
                  <li>If approved, we will guide you through the enrollment process</li>
                </ol>
              </div>
              
              <p>If you have any questions in the meantime, feel free to contact us:</p>
              <p>
                📧 <a href="mailto:admissions@microsoftinstitute.africa">admissions@microsoftinstitute.africa</a><br>
                📱 <a href="tel:${institutionPhone.replace(/\s/g, '')}">${institutionPhone}</a>
              </p>
              
              <p>Best regards,<br><strong>The ${institutionName} Admissions Team</strong></p>
            </div>
            
            <div class="footer">
              <p><strong>${institutionName}</strong></p>
              <p>📧 <a href="mailto:admissions@microsoftinstitute.africa">admissions@microsoftinstitute.africa</a> | 📱 ${institutionPhone}</p>
              <p style="margin-top: 15px; opacity: 0.7;">© ${new Date().getFullYear()} ${institutionName}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    // Also notify admissions team
    try {
      await resend.emails.send({
        from: `${institutionName} <onboarding@resend.dev>`,
        to: ["admissions@microsoftinstitute.africa"],
        subject: `📥 New Scholarship Application: ${fullName} - ${course}`,
        html: `
          <h2>New Scholarship Application</h2>
          <table style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;">
            <tr><td style="padding:10px;border:1px solid #ddd;font-weight:bold;">Name</td><td style="padding:10px;border:1px solid #ddd;">${fullName}</td></tr>
            <tr><td style="padding:10px;border:1px solid #ddd;font-weight:bold;">Email</td><td style="padding:10px;border:1px solid #ddd;">${email}</td></tr>
            <tr><td style="padding:10px;border:1px solid #ddd;font-weight:bold;">Phone</td><td style="padding:10px;border:1px solid #ddd;">${phone}</td></tr>
            <tr><td style="padding:10px;border:1px solid #ddd;font-weight:bold;">Course</td><td style="padding:10px;border:1px solid #ddd;">${course}</td></tr>
            <tr><td style="padding:10px;border:1px solid #ddd;font-weight:bold;">Education</td><td style="padding:10px;border:1px solid #ddd;">${educationLevel}</td></tr>
            <tr><td style="padding:10px;border:1px solid #ddd;font-weight:bold;">Statement</td><td style="padding:10px;border:1px solid #ddd;">${statement}</td></tr>
          </table>
        `,
      });
    } catch (adminErr) {
      console.error("Failed to notify admissions (non-blocking):", adminErr);
    }

    console.log("Scholarship emails sent successfully");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-scholarship-email:", error);
    // Return success anyway so the form submission isn't blocked
    return new Response(
      JSON.stringify({ success: true, emailError: error.message }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
