import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ContactEmailRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, subject, message }: ContactEmailRequest = await req.json();

    // Send confirmation to the person who contacted
    const confirmationEmail = await resend.emails.send({
      from: "Microsoft Institute Africa <admissions@microsoftinstitute.africa>",
      to: [email],
      subject: "We received your message - Microsoft Institute Africa",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1e3a5f, #2d5a87); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .message-box { background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            h1 { margin: 0; font-size: 24px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✉️ Message Received!</h1>
            </div>
            <div class="content">
              <p>Dear <strong>${name}</strong>,</p>
              
              <p>Thank you for contacting <strong>Microsoft Institute Africa</strong>. We have received your message and our team will get back to you as soon as possible.</p>
              
              <div class="message-box">
                <h4 style="margin-top: 0;">Your Message:</h4>
                <p><strong>Subject:</strong> ${subject}</p>
                <p>${message}</p>
              </div>
              
              <p>For urgent inquiries, you can also reach us at:</p>
              <ul>
                <li>Phone: <strong>+254 723 821 798</strong></li>
                <li>WhatsApp: <a href="https://wa.me/254723821798">+254 723 821 798</a></li>
              </ul>
              
              <p>Best regards,<br><strong>Microsoft Institute Africa Team</strong></p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Microsoft Institute Africa. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    // Send notification to admin
    const adminEmail = await resend.emails.send({
      from: "Microsoft Institute Africa <admissions@microsoftinstitute.africa>",
      to: ["admissions@microsoftinstitute.africa"],
      subject: `New Contact: ${subject || "Website Inquiry"} from ${name}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1e3a5f; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .message-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 10px; border-bottom: 1px solid #eee; }
            .label-cell { font-weight: bold; color: #555; width: 30%; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0;">📬 New Contact Form Submission</h2>
            </div>
            <div class="content">
              <table>
                <tr><td class="label-cell">Name:</td><td>${name}</td></tr>
                <tr><td class="label-cell">Email:</td><td><a href="mailto:${email}">${email}</a></td></tr>
                <tr><td class="label-cell">Subject:</td><td>${subject || "Website Inquiry"}</td></tr>
                <tr><td class="label-cell">Received:</td><td>${new Date().toLocaleString()}</td></tr>
              </table>
              
              <div class="message-box">
                <h4 style="margin-top: 0;">Message:</h4>
                <p>${message}</p>
              </div>
              
              <p><a href="mailto:${email}?subject=Re: ${subject || "Your Inquiry"}" style="background: #1e3a5f; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">Reply to ${name}</a></p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Contact emails sent:", { confirmationEmail, adminEmail });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-contact-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
