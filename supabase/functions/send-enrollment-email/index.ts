import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface EnrollmentEmailRequest {
  studentEmail: string;
  studentName: string;
  courseTitle: string;
  courseDescription?: string;
  courseDuration?: number;
  courseCategory?: string;
  courseSchedule?: string;
  startDate?: string;
  credentials?: {
    email: string;
    password: string;
  };
  enrollmentDate?: string;
  feeStructure?: {
    name: string;
    amount: number;
    currency: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      studentEmail, 
      studentName, 
      courseTitle, 
      courseDescription, 
      courseDuration,
      courseCategory,
      courseSchedule,
      startDate,
      credentials,
      enrollmentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      feeStructure,
    }: EnrollmentEmailRequest = await req.json();

    console.log(`Sending enrollment email to ${studentEmail} for course: ${courseTitle}`);

    const institutionName = "Microsoft Training Institute";
    const institutionPhone = "+254 711 577 338";
    const lmsUrl = "https://microsoftinstitute.lovable.app/lms/login";

    const formatCurrency = (amount: number, currency: string) => {
      return `${currency} ${amount.toLocaleString('en-KE')}`;
    };

    const emailResponse = await resend.emails.send({
      from: "Microsoft Training Institute <admissions@microsoftinstitute.africa>",
      to: [studentEmail],
      subject: `🎓 Welcome to ${institutionName} - Enrollment Confirmed!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
            .container { max-width: 650px; margin: 0 auto; background: #ffffff; }
            .header { background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 50%, #3d7ab0 100%); color: white; padding: 50px 40px; text-align: center; }
            .header-logo { font-size: 42px; margin-bottom: 15px; }
            .header h1 { margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -0.5px; }
            .header p { margin: 15px 0 0; opacity: 0.9; font-size: 16px; }
            .welcome-badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 8px 20px; border-radius: 25px; margin-top: 15px; font-size: 14px; }
            .content { padding: 40px; }
            .greeting { font-size: 20px; margin-bottom: 20px; }
            .info-card { background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 25px; border-radius: 12px; margin: 25px 0; border-left: 5px solid #f59e0b; }
            .info-card h2 { margin: 0 0 15px; color: #1e3a5f; font-size: 20px; display: flex; align-items: center; gap: 10px; }
            .info-card p { margin: 8px 0; color: #555; }
            .credentials-box { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 25px; border-radius: 12px; margin: 25px 0; border: 2px solid #f59e0b; }
            .credentials-box h3 { margin: 0 0 20px; color: #92400e; font-size: 18px; display: flex; align-items: center; gap: 10px; }
            .credential-item { background: white; padding: 15px; border-radius: 8px; margin: 10px 0; display: flex; justify-content: space-between; align-items: center; }
            .credential-label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
            .credential-value { font-family: 'Consolas', monospace; font-size: 16px; font-weight: bold; color: #1e3a5f; }
            .warning-text { font-size: 13px; color: #92400e; margin-top: 15px; padding: 10px; background: rgba(255,255,255,0.5); border-radius: 6px; }
            .fee-card { background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); padding: 25px; border-radius: 12px; margin: 25px 0; border: 2px solid #3b82f6; }
            .fee-card h3 { margin: 0 0 15px; color: #1e40af; font-size: 18px; }
            .fee-amount { font-size: 28px; font-weight: bold; color: #1e3a5f; margin: 10px 0; }
            .fee-note { font-size: 13px; color: #1e40af; background: rgba(255,255,255,0.5); padding: 10px; border-radius: 6px; margin-top: 15px; }
            .steps-card { background: #e0f2fe; padding: 25px; border-radius: 12px; margin: 25px 0; }
            .steps-card h3 { margin: 0 0 15px; color: #0369a1; }
            .steps-list { list-style: none; padding: 0; margin: 0; }
            .steps-list li { padding: 10px 0; padding-left: 35px; position: relative; color: #0c4a6e; }
            .steps-list li::before { content: '✓'; position: absolute; left: 0; width: 24px; height: 24px; background: #0284c7; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; top: 8px; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 16px 35px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 20px 0; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3); }
            .cta-button:hover { background: linear-gradient(135deg, #d97706 0%, #b45309 100%); }
            .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
            .detail-item { background: #f8f9fa; padding: 15px; border-radius: 8px; }
            .detail-label { font-size: 12px; color: #666; margin-bottom: 5px; }
            .detail-value { font-weight: 600; color: #1e3a5f; }
            .support-card { background: #f0fdf4; padding: 20px; border-radius: 12px; margin: 25px 0; border: 1px solid #86efac; }
            .support-card h4 { margin: 0 0 10px; color: #166534; }
            .footer { background: #1e3a5f; color: white; padding: 30px 40px; text-align: center; }
            .footer p { margin: 5px 0; opacity: 0.8; font-size: 14px; }
            .footer a { color: #fcd34d; }
            .social-links { margin: 15px 0; }
            .social-links a { display: inline-block; margin: 0 5px; padding: 8px 15px; background: rgba(255,255,255,0.1); border-radius: 5px; color: white; text-decoration: none; font-size: 12px; }
            @media (max-width: 600px) {
              .content { padding: 25px; }
              .header { padding: 35px 25px; }
              .details-grid { grid-template-columns: 1fr; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="header-logo">🎓</div>
              <h1>Welcome to ${institutionName}!</h1>
              <p>"Quest for Excellence"</p>
              <div class="welcome-badge">📚 Enrollment Confirmed</div>
            </div>
            
            <div class="content">
              <p class="greeting">Dear <strong>${studentName || 'Student'}</strong>,</p>
              
              <p>Congratulations! 🎉 We are thrilled to inform you that your enrollment at <strong>${institutionName}</strong> has been successfully processed. You are now officially part of our learning community!</p>
              
              <div class="info-card">
                <h2>📚 Your Course Details</h2>
                <div class="details-grid">
                  <div class="detail-item">
                    <div class="detail-label">Course Name</div>
                    <div class="detail-value">${courseTitle}</div>
                  </div>
                  <div class="detail-item">
                    <div class="detail-label">Enrollment Date</div>
                    <div class="detail-value">${enrollmentDate}</div>
                  </div>
                  ${courseDuration ? `
                  <div class="detail-item">
                    <div class="detail-label">Duration</div>
                    <div class="detail-value">${courseDuration} Hours</div>
                  </div>
                  ` : ''}
                  ${courseCategory ? `
                  <div class="detail-item">
                    <div class="detail-label">Category</div>
                    <div class="detail-value">${courseCategory}</div>
                  </div>
                  ` : ''}
                  ${startDate ? `
                  <div class="detail-item">
                    <div class="detail-label">Start Date</div>
                    <div class="detail-value">${startDate}</div>
                  </div>
                  ` : ''}
                  <div class="detail-item">
                    <div class="detail-label">Status</div>
                    <div class="detail-value" style="color: #16a34a;">✓ Active</div>
                  </div>
                </div>
                ${courseDescription ? `<p style="margin-top: 15px; font-style: italic; color: #666;">${courseDescription}</p>` : ''}
                ${courseSchedule ? `
                <div style="margin-top: 15px; padding: 12px; background: #f0f9ff; border-radius: 8px; border-left: 4px solid #0284c7;">
                  <p style="margin: 0; font-weight: 600; color: #0369a1;">📅 Schedule Information</p>
                  <p style="margin: 8px 0 0; color: #0c4a6e;">${courseSchedule}</p>
                </div>
                ` : ''}
              </div>

              ${feeStructure ? `
              <div class="fee-card">
                <h3>💰 Fee Structure Information</h3>
                <p style="margin: 0; color: #1e40af;">Your enrolled program fee:</p>
                <div class="fee-amount">${formatCurrency(feeStructure.amount, feeStructure.currency)}</div>
                <p style="margin: 5px 0 0; color: #3b82f6;">${feeStructure.name}</p>
                <div class="fee-note">
                  <strong>Payment Options:</strong><br>
                  📱 M-Pesa: Paybill 889100, Account: 9067620016<br>
                  🏦 Bank Transfer: NCBA Bank, Branch 216, Account: 9067620016<br><br>
                  Please ensure to use your email or student ID as reference when making payments.
                </div>
              </div>
              ` : ''}
              
              ${credentials ? `
              <div class="credentials-box">
                <h3>🔐 Your LMS Login Credentials</h3>
                <p style="margin: 0 0 15px; color: #78350f;">Use these details to access the Learning Management System:</p>
                
                <div class="credential-item">
                  <div>
                    <div class="credential-label">Email Address</div>
                    <div class="credential-value">${credentials.email}</div>
                  </div>
                </div>
                
                <div class="credential-item">
                  <div>
                    <div class="credential-label">Password</div>
                    <div class="credential-value">${credentials.password}</div>
                  </div>
                </div>
                
                <div class="warning-text">
                  ⚠️ <strong>Security Notice:</strong> Please change your password immediately after your first login for your account security. Do not share these credentials with anyone.
                </div>
              </div>
              ` : ''}
              
              <div class="steps-card">
                <h3>🚀 Getting Started</h3>
                <ol class="steps-list">
                  <li>Visit our Learning Portal at the link below</li>
                  <li>Log in using your credentials above</li>
                  <li>Complete your profile setup</li>
                  <li>Access your enrolled course from "My Courses"</li>
                  <li>Start learning and track your progress!</li>
                </ol>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${lmsUrl}" class="cta-button">Access Learning Portal →</a>
              </div>
              
              <div class="support-card">
                <h4>📞 Need Help?</h4>
                <p style="margin: 0;">Our support team is here to assist you throughout your learning journey.</p>
                <p style="margin: 10px 0 0;">
                  📧 Email: <a href="mailto:support@microsoftinstitute.africa">support@microsoftinstitute.africa</a><br>
                  💰 Finance: <a href="mailto:finance@microsoftinstitute.africa">finance@microsoftinstitute.africa</a><br>
                  📱 Phone: <a href="tel:${institutionPhone.replace(/\s/g, '')}">${institutionPhone}</a>
                </p>
              </div>
              
              <p>We wish you the very best in your studies. Should you have any questions, don't hesitate to reach out!</p>
              
              <p style="margin-top: 30px;">
                Warm regards,<br>
                <strong>The ${institutionName} Team</strong>
              </p>
            </div>
            
            <div class="footer">
              <p><strong>${institutionName}</strong></p>
              <p>Nairobi, Kenya</p>
              <p>📧 support@microsoftinstitute.africa | 💰 finance@microsoftinstitute.africa</p>
              <p>📱 ${institutionPhone}</p>
              <div class="social-links">
                <a href="${lmsUrl}">🌐 Visit Portal</a>
              </div>
              <p style="margin-top: 20px; font-size: 12px; opacity: 0.7;">
                © ${new Date().getFullYear()} ${institutionName}. All rights reserved.<br>
                You received this email because you enrolled in a course at our institution.
              </p>
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