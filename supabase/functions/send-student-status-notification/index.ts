import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface StatusNotificationRequest {
  email: string;
  studentName: string;
  status: 'suspended' | 'expelled' | 'deferred' | 'active';
  reason?: string;
  effectiveDate?: string;
  returnDate?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, studentName, status, reason, effectiveDate, returnDate }: StatusNotificationRequest = await req.json();

    const statusInfo = {
      suspended: {
        title: 'Account Suspended',
        icon: '⚠️',
        color: '#f59e0b',
        message: 'Your student account has been temporarily suspended.',
        details: 'During this suspension period, you will not have access to courses, assignments, or live sessions.'
      },
      expelled: {
        title: 'Enrollment Terminated',
        icon: '❌',
        color: '#ef4444',
        message: 'Your enrollment at Techno Panaly Institute of Technology has been terminated.',
        details: 'Your access to all courses and LMS features has been revoked. Please contact the admissions office for more information.'
      },
      deferred: {
        title: 'Enrollment Deferred',
        icon: '⏸️',
        color: '#3b82f6',
        message: 'Your enrollment has been deferred.',
        details: 'Your courses will be paused and you can resume your studies at the specified date.'
      },
      active: {
        title: 'Account Reinstated',
        icon: '✅',
        color: '#22c55e',
        message: 'Your student account has been reinstated.',
        details: 'You now have full access to your courses and all LMS features.'
      }
    };

    const info = statusInfo[status];

    const emailResponse = await resend.emails.send({
      from: "Techno Panaly Institute of Technology <admissions@mail.microsoftinstitute.africa>",
      to: [email],
      subject: `${info.icon} ${info.title} - Techno Panaly Institute of Technology`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${info.color}; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${info.color}; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            h1 { margin: 0; font-size: 24px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${info.icon} ${info.title}</h1>
            </div>
            <div class="content">
              <p>Dear <strong>${studentName}</strong>,</p>
              
              <p>${info.message}</p>
              
              <div class="info-box">
                <h3 style="margin-top: 0;">Status Details</h3>
                <p><strong>New Status:</strong> ${status.charAt(0).toUpperCase() + status.slice(1)}</p>
                ${effectiveDate ? `<p><strong>Effective Date:</strong> ${effectiveDate}</p>` : ''}
                ${returnDate ? `<p><strong>Expected Return:</strong> ${returnDate}</p>` : ''}
                ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
              </div>
              
              <p>${info.details}</p>
              
              ${status !== 'expelled' ? `
                <p>If you have any questions or need clarification, please contact us:</p>
                <ul>
                  <li>Email: <strong>admissions@microsoftinstitute.africa</strong></li>
                  <li>Phone: <strong>+254 711 577 338</strong></li>
                </ul>
              ` : ''}
              
              <p>Best regards,<br><strong>Techno Panaly Institute of Technology Administration</strong></p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Techno Panaly Institute of Technology. All rights reserved.</p>
              <p>This is an official administrative notification.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Student status notification sent:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending status notification:", error);
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
