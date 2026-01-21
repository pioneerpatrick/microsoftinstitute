import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NewsletterEmailRequest {
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: NewsletterEmailRequest = await req.json();

    const emailResponse = await resend.emails.send({
      from: "Microsoft Institute Africa <onboarding@resend.dev>",
      to: [email],
      subject: "Welcome to Microsoft Institute Africa Newsletter! 🎓",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1e3a5f, #2d5a87); color: white; padding: 40px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .highlight { background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            h1 { margin: 0; font-size: 28px; }
            .emoji { font-size: 48px; margin-bottom: 10px; }
            ul { padding-left: 20px; }
            li { margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="emoji">🎉</div>
              <h1>Welcome to Our Newsletter!</h1>
            </div>
            <div class="content">
              <p>Hello there!</p>
              
              <p>Thank you for subscribing to the <strong>Microsoft Institute Africa</strong> newsletter! You've joined a community of learners committed to advancing their careers through quality education.</p>
              
              <div class="highlight">
                <h3 style="margin-top: 0;">🎁 What you'll receive:</h3>
                <ul>
                  <li>📚 Updates on new courses and programs</li>
                  <li>💰 Exclusive scholarship opportunities</li>
                  <li>💡 Learning tips and career advice</li>
                  <li>🎓 Success stories from our graduates</li>
                  <li>📅 Webinar and event invitations</li>
                </ul>
              </div>
              
              <p><strong>Ready to start learning?</strong></p>
              <p>Explore our courses and take the first step towards your dream career:</p>
              
              <p style="text-align: center;">
                <a href="https://microsoftinstitute.lovable.app/#courses" style="background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Browse Courses</a>
              </p>
              
              <p>Questions? Contact us anytime at <a href="mailto:admissions@microsoftinstitute.africa">admissions@microsoftinstitute.africa</a></p>
              
              <p>Best regards,<br><strong>Microsoft Institute Africa Team</strong></p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Microsoft Institute Africa. All rights reserved.</p>
              <p>You're receiving this because you subscribed to our newsletter.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Newsletter welcome email sent:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-newsletter-welcome:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
