import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get all overdue fees with student info
    const today = new Date().toISOString();
    const { data: overdueFees, error: fetchError } = await supabase
      .from('student_fees')
      .select(`
        id,
        user_id,
        amount_due,
        amount_paid,
        balance,
        due_date,
        fee_structures(name, currency),
        courses(title)
      `)
      .lt('due_date', today)
      .gt('balance', 0)
      .in('status', ['pending', 'partial', 'overdue']);

    if (fetchError) {
      console.error("Error fetching overdue fees:", fetchError);
      throw fetchError;
    }

    if (!overdueFees || overdueFees.length === 0) {
      console.log("No overdue fees found");
      return new Response(
        JSON.stringify({ message: "No overdue fees to process", sent: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Found ${overdueFees.length} overdue fees`);

    // Group fees by user to send one email per student
    const feesByUser = new Map<string, typeof overdueFees>();
    for (const fee of overdueFees) {
      const userId = fee.user_id;
      if (!feesByUser.has(userId)) {
        feesByUser.set(userId, []);
      }
      feesByUser.get(userId)!.push(fee);
    }

    let emailsSent = 0;
    const errors: string[] = [];

    for (const [userId, userFees] of feesByUser) {
      // Get user profile and email
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', userId)
        .single();

      if (!profile?.email) {
        console.log(`No email found for user ${userId}`);
        continue;
      }

      const studentName = profile.full_name || 'Student';
      const totalBalance = userFees.reduce((sum, f) => sum + (f.balance || 0), 0);
      const feeStructure = userFees[0]?.fee_structures as unknown as { name: string; currency: string } | null;
      const currency = feeStructure?.currency || 'KES';

      // Build fee details table
      const feeRows = userFees.map(fee => {
        const fs = fee.fee_structures as unknown as { name: string; currency: string } | null;
        const course = fee.courses as unknown as { title: string } | null;
        return `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${fs?.name || 'Fee'}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${course?.title || 'General'}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">${formatCurrency(fee.balance || 0, currency)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${new Date(fee.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
        </tr>
      `;
      }).join('');

      try {
        await resend.emails.send({
          from: "Microsoft Institute Africa <onboarding@resend.dev>",
          to: [profile.email],
          subject: `⚠️ Payment Reminder - Outstanding Balance: ${formatCurrency(totalBalance, currency)}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 30px; text-align: center;">
                    <div style="font-size: 48px; margin-bottom: 10px;">⚠️</div>
                    <h1 style="color: white; margin: 0; font-size: 24px;">Payment Reminder</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">Your fees are overdue</p>
                  </div>

                  <!-- Content -->
                  <div style="padding: 30px;">
                    <p style="color: #374151; font-size: 16px;">Dear <strong>${studentName}</strong>,</p>
                    
                    <p style="color: #374151;">This is a friendly reminder that you have outstanding fee payments that are past their due date. Please make your payment as soon as possible to avoid any disruption to your studies.</p>

                    <!-- Outstanding Balance Card -->
                    <div style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; border: 1px solid #fecaca;">
                      <p style="color: #991b1b; margin: 0 0 5px; font-size: 14px;">Total Outstanding Balance</p>
                      <p style="color: #dc2626; font-size: 32px; font-weight: bold; margin: 0;">${formatCurrency(totalBalance, currency)}</p>
                    </div>

                    <!-- Fee Details Table -->
                    <h3 style="color: #374151; margin: 25px 0 15px;">Overdue Fees:</h3>
                    <table style="width: 100%; border-collapse: collapse; background: #f8fafc; border-radius: 8px; overflow: hidden;">
                      <thead>
                        <tr style="background: #e2e8f0;">
                          <th style="padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #64748b;">Fee Type</th>
                          <th style="padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #64748b;">Course</th>
                          <th style="padding: 12px; text-align: right; font-size: 12px; text-transform: uppercase; color: #64748b;">Balance</th>
                          <th style="padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #64748b;">Due Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${feeRows}
                      </tbody>
                    </table>

                    <!-- CTA Button -->
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="https://microsoftinstitute.lovable.app/lms/fees" 
                         style="display: inline-block; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                        View My Fees & Make Payment →
                      </a>
                    </div>

                    <!-- Payment Methods -->
                    <div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #bbf7d0;">
                      <h4 style="color: #166534; margin: 0 0 10px;">💳 Payment Methods:</h4>
                      <ul style="color: #374151; margin: 0; padding-left: 20px;">
                        <li>M-Pesa Paybill: <strong>889100</strong>, Account: 9067620016</li>
                        <li>Bank Transfer: NCBA BANK, ACC: 9067620016</li>
                        <li>Visit our finance office during working hours</li>
                      </ul>
                    </div>

                    <p style="color: #6b7280; font-size: 14px;">
                      If you have already made this payment, please disregard this email. For any questions or payment plans, contact our finance department.
                    </p>

                    <p style="color: #374151;">
                      Best regards,<br>
                      <strong>Finance Department</strong><br>
                      Microsoft Institute
                    </p>
                  </div>

                  <!-- Footer -->
                  <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="color: #64748b; font-size: 12px; margin: 0;">
                      Contact: finance@microsoftinstitute.africa | +254 723 821 798
                    </p>
                  </div>
                </div>
              </div>
            </body>
            </html>
          `,
        });

        emailsSent++;
        console.log(`Reminder sent to ${profile.email}`);

        // Update fee status to overdue
        for (const fee of userFees) {
          await supabase
            .from('student_fees')
            .update({ status: 'overdue' })
            .eq('id', fee.id);
        }
      } catch (emailError: any) {
        console.error(`Failed to send email to ${profile.email}:`, emailError);
        errors.push(`${profile.email}: ${emailError.message}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        message: "Overdue reminders processed", 
        sent: emailsSent,
        totalOverdue: overdueFees.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-overdue-reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
