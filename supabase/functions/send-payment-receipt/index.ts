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
  studentName?: string;
  receiptNumber: string;
  amount: number;
  currency: string;
  courseName: string;
  feeName: string;
  paymentMethod: string | null;
  paymentDate: string;
  transactionRef: string | null;
  totalFees?: number;
  totalPaid?: number;
  balance?: number;
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
      studentName,
      receiptNumber,
      amount,
      currency,
      courseName,
      feeName,
      paymentMethod,
      paymentDate,
      transactionRef,
      totalFees = amount,
      totalPaid = amount,
      balance = 0,
    }: ReceiptEmailRequest = await req.json();

    const isPaidInFull = balance <= 0;

    const emailResponse = await resend.emails.send({
      from: "Microsoft Training Institute <admissions@microsoftinstitute.africa>",
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
              <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">🎓 Microsoft Training Institute</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-style: italic;">"Quest for Excellence"</p>
              </div>

              <!-- Receipt Title -->
              <div style="background-color: #f59e0b; padding: 15px; text-align: center;">
                <h2 style="color: white; margin: 0; font-size: 20px;">📄 PAYMENT RECEIPT</h2>
              </div>

              <!-- Receipt Content -->
              <div style="padding: 30px;">
                <div style="text-align: center; margin-bottom: 25px;">
                  <div style="display: inline-block; background-color: ${isPaidInFull ? '#10b981' : '#f59e0b'}; color: white; padding: 10px 25px; border-radius: 25px; font-weight: bold; font-size: 14px;">
                    ${isPaidInFull ? '✓ PAID IN FULL' : '⏳ PARTIAL PAYMENT'}
                  </div>
                </div>

                <!-- Student Info -->
                <div style="background-color: #f8fafc; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                  <p style="margin: 0 0 5px; color: #64748b; font-size: 12px; text-transform: uppercase;">Received From</p>
                  <p style="margin: 0; font-size: 18px; font-weight: bold; color: #1e3a5f;">${studentName || 'Student'}</p>
                  <p style="margin: 5px 0 0; color: #64748b; font-size: 14px;">${email}</p>
                </div>

                <!-- Receipt Details -->
                <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 10px 0; color: #64748b; font-size: 14px;">Receipt Number</td>
                      <td style="padding: 10px 0; text-align: right; font-weight: bold; font-family: monospace; color: #1e3a5f;">${receiptNumber}</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 0; color: #64748b; font-size: 14px;">Date</td>
                      <td style="padding: 10px 0; text-align: right;">${formatDate(paymentDate)}</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 0; color: #64748b; font-size: 14px;">Course/Program</td>
                      <td style="padding: 10px 0; text-align: right;">${courseName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 0; color: #64748b; font-size: 14px;">Fee Type</td>
                      <td style="padding: 10px 0; text-align: right;">${feeName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 0; color: #64748b; font-size: 14px;">Payment Method</td>
                      <td style="padding: 10px 0; text-align: right;">${paymentMethod?.toUpperCase() || 'N/A'}</td>
                    </tr>
                    ${transactionRef ? `
                    <tr>
                      <td style="padding: 10px 0; color: #64748b; font-size: 14px;">Transaction Ref</td>
                      <td style="padding: 10px 0; text-align: right; font-family: monospace;">${transactionRef}</td>
                    </tr>
                    ` : ''}
                  </table>
                </div>

                <!-- Amount Box -->
                <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 8px; padding: 25px; margin-bottom: 20px;">
                  <table style="width: 100%;">
                    <tr>
                      <td style="color: rgba(255,255,255,0.9); font-size: 14px;">Amount Paid</td>
                      <td style="text-align: right; color: white; font-size: 28px; font-weight: bold;">${formatCurrency(amount, currency)}</td>
                    </tr>
                  </table>
                </div>

                <!-- Financial Summary -->
                <div style="border: 2px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                  <h3 style="margin: 0 0 15px; color: #1e3a5f; font-size: 14px; text-transform: uppercase;">Fee Summary</h3>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #64748b;">Total Fees</td>
                      <td style="padding: 8px 0; text-align: right; font-weight: bold;">${formatCurrency(totalFees, currency)}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #64748b;">Total Paid</td>
                      <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #10b981;">${formatCurrency(totalPaid, currency)}</td>
                    </tr>
                    <tr style="border-top: 2px dashed #e2e8f0;">
                      <td style="padding: 12px 0; color: #1e3a5f; font-weight: bold;">Balance Due</td>
                      <td style="padding: 12px 0; text-align: right; font-weight: bold; font-size: 18px; color: ${isPaidInFull ? '#10b981' : '#ef4444'};">
                        ${formatCurrency(balance, currency)}
                      </td>
                    </tr>
                  </table>
                </div>

                ${isPaidInFull ? `
                <!-- PAID Stamp -->
                <div style="text-align: center; margin: 30px 0;">
                  <div style="display: inline-block; border: 4px solid #10b981; border-radius: 10px; padding: 15px 30px; transform: rotate(-5deg);">
                    <p style="margin: 0; color: #10b981; font-size: 28px; font-weight: bold; letter-spacing: 3px;">PAID</p>
                    <p style="margin: 5px 0 0; color: #10b981; font-size: 10px; text-transform: uppercase;">Microsoft Training Institute</p>
                  </div>
                </div>
                ` : ''}

                <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 20px;">
                  This is an official receipt from Microsoft Training Institute.<br>
                  Please keep this for your records.
                </p>
              </div>

              <!-- Footer -->
              <div style="background-color: #1e3a5f; padding: 25px; text-align: center;">
                <p style="color: white; font-size: 14px; font-weight: bold; margin: 0;">Microsoft Training Institute</p>
                <p style="color: rgba(255,255,255,0.8); font-size: 12px; margin: 8px 0 0;">Nairobi, Kenya</p>
                <p style="color: rgba(255,255,255,0.8); font-size: 12px; margin: 8px 0 0;">
                  📧 finance@microsoftinstitute.africa | 📱 +254 711 577 338
                </p>
                <p style="color: rgba(255,255,255,0.6); font-size: 11px; margin: 15px 0 0;">
                  © ${new Date().getFullYear()} Microsoft Training Institute. All rights reserved.
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
