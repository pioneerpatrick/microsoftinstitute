import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ReceiptEmailRequest {
  paymentId: string;
  email: string;
  receiptNumber: string;
  amount: number;
  currency: string;
  courseName: string;
  feeName: string;
  paymentMethod: string | null;
  paymentDate: string;
  transactionRef: string | null;
}

const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      email,
      receiptNumber,
      amount,
      currency,
      courseName,
      feeName,
      paymentMethod,
      paymentDate,
      transactionRef,
    }: ReceiptEmailRequest = await req.json();

    const emailResponse = await resend.emails.send({
      from: "Microsoft Institute <noreply@resend.dev>",
      to: [email],
      subject: `Payment Receipt - ${receiptNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Receipt</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">Payment Receipt</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">Microsoft Institute</p>
              </div>

              <!-- Receipt Content -->
              <div style="padding: 30px;">
                <div style="text-align: center; margin-bottom: 30px;">
                  <div style="display: inline-block; background-color: #10b981; color: white; padding: 8px 20px; border-radius: 20px; font-weight: bold;">
                    ✓ Payment Successful
                  </div>
                </div>

                <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 10px 0; color: #64748b; font-size: 14px;">Receipt Number</td>
                      <td style="padding: 10px 0; text-align: right; font-weight: bold; font-family: monospace;">${receiptNumber}</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 0; color: #64748b; font-size: 14px;">Date</td>
                      <td style="padding: 10px 0; text-align: right;">${formatDate(paymentDate)}</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 0; color: #64748b; font-size: 14px;">Course</td>
                      <td style="padding: 10px 0; text-align: right;">${courseName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 0; color: #64748b; font-size: 14px;">Fee Type</td>
                      <td style="padding: 10px 0; text-align: right;">${feeName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 0; color: #64748b; font-size: 14px;">Payment Method</td>
                      <td style="padding: 10px 0; text-align: right;">${paymentMethod || 'N/A'}</td>
                    </tr>
                    ${transactionRef ? `
                    <tr>
                      <td style="padding: 10px 0; color: #64748b; font-size: 14px;">Transaction Ref</td>
                      <td style="padding: 10px 0; text-align: right; font-family: monospace;">${transactionRef}</td>
                    </tr>
                    ` : ''}
                  </table>
                </div>

                <div style="border-top: 2px dashed #e2e8f0; padding-top: 20px; text-align: center;">
                  <p style="color: #64748b; margin: 0 0 5px; font-size: 14px;">Amount Paid</p>
                  <p style="color: #10b981; font-size: 32px; font-weight: bold; margin: 0;">${formatCurrency(amount, currency)}</p>
                </div>
              </div>

              <!-- Footer -->
              <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
                <p style="color: #64748b; font-size: 12px; margin: 0;">
                  This is an official receipt from Microsoft Institute.<br>
                  Please keep this for your records.
                </p>
                <p style="color: #94a3b8; font-size: 11px; margin: 15px 0 0;">
                  Questions? Contact us at support@microsoftinstitute.ac.ke
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Receipt email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending receipt email:", error);
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
