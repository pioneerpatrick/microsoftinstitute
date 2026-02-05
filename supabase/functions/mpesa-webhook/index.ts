import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Send confirmation email using Resend
const sendConfirmationEmail = async (
  resendApiKey: string,
  to: string,
  studentName: string,
  amount: number,
  currency: string,
  receiptNumber: string,
  transactionId: string,
  courseName: string,
  feeName: string,
  remainingBalance: number
) => {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Microsoft Institute <noreply@microsoftinstitute.co.ke>',
      to: [to],
      subject: `Payment Confirmation - Receipt ${receiptNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', sans-serif; background-color: #f4f4f4; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #0078D4, #00a2ed); padding: 30px; text-align: center; color: white; }
            .content { padding: 30px; }
            .receipt-box { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
            .row:last-child { border-bottom: none; }
            .label { color: #666; }
            .value { font-weight: 600; }
            .amount { font-size: 24px; color: #28a745; font-weight: bold; text-align: center; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin:0;">Payment Received!</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Thank you for your payment</p>
            </div>
            <div class="content">
              <p>Dear ${studentName},</p>
              <p>We have received your payment. Here are your receipt details:</p>
              
              <div class="receipt-box">
                <p class="amount">${currency} ${amount.toLocaleString()}</p>
                <div class="row">
                  <span class="label">Receipt Number:</span>
                  <span class="value">${receiptNumber}</span>
                </div>
                <div class="row">
                  <span class="label">Transaction ID:</span>
                  <span class="value">${transactionId}</span>
                </div>
                <div class="row">
                  <span class="label">Course:</span>
                  <span class="value">${courseName}</span>
                </div>
                <div class="row">
                  <span class="label">Fee Type:</span>
                  <span class="value">${feeName}</span>
                </div>
                <div class="row">
                  <span class="label">Payment Method:</span>
                  <span class="value">M-Pesa</span>
                </div>
                <div class="row">
                  <span class="label">Remaining Balance:</span>
                  <span class="value">${currency} ${remainingBalance.toLocaleString()}</span>
                </div>
              </div>
              
              <p>You can download your official receipt from the student portal.</p>
            </div>
            <div class="footer">
              <p>Microsoft Training Institute</p>
              <p>This is an automated confirmation. Please keep this for your records.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send email: ${error}`);
  }

  return response.json();
};

// Generate auto receipt number in format MT-YYYY-XXXXX
const generateReceiptNumber = async (supabase: any): Promise<string> => {
  const year = new Date().getFullYear();
  
  // Get the count of payments this year
  const { count } = await supabase
    .from('fee_payments')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', `${year}-01-01`)
    .lte('created_at', `${year}-12-31`);

  const nextNumber = (count || 0) + 1;
  const paddedNumber = nextNumber.toString().padStart(5, '0');
  
  return `MT-${year}-${paddedNumber}`;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json();
    console.log('M-Pesa webhook received:', JSON.stringify(payload));

    // Extract M-Pesa transaction details
    // Support multiple M-Pesa callback formats
    const transactionId = payload.TransactionId || payload.TransID || payload.transaction_id;
    const amount = parseFloat(payload.Amount || payload.TransAmount || payload.amount || '0');
    const phoneNumber = payload.MSISDN || payload.PhoneNumber || payload.phone_number || '';
    const accountNumber = payload.AccountNumber || payload.BillRefNumber || payload.account_reference || '';

    if (!transactionId || !amount) {
      return new Response(
        JSON.stringify({ error: 'Invalid payment data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if this transaction has already been processed
    const { data: existingPayment } = await supabase
      .from('fee_payments')
      .select('id')
      .eq('transaction_reference', transactionId)
      .single();

    if (existingPayment) {
      console.log('Transaction already processed:', transactionId);
      return new Response(
        JSON.stringify({ success: true, message: 'Transaction already processed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try to find student by account number (could be student email, phone, or ID)
    let studentFee = null;
    let profile = null;

    // First, try to find by account reference (student email or phone)
    const { data: profileByEmail } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .or(`email.ilike.%${accountNumber}%`)
      .single();

    if (profileByEmail) {
      profile = profileByEmail;
      
      // Find the oldest pending/partial fee for this student
      const { data: pendingFee } = await supabase
        .from('student_fees')
        .select('*, courses(title), fee_structures(name, currency)')
        .eq('user_id', profile.id)
        .in('status', ['pending', 'partial'])
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (pendingFee) {
        studentFee = pendingFee;
      }
    }

    if (!studentFee) {
      // Log unmatched payment for manual reconciliation
      console.log('Could not match payment to student. Transaction:', transactionId, 'Account:', accountNumber);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Payment received but could not be matched to a student account',
          transaction_id: transactionId 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate receipt number
    const receiptNumber = await generateReceiptNumber(supabase);

    // Record the payment
    const { error: paymentError } = await supabase
      .from('fee_payments')
      .insert({
        student_fee_id: studentFee.id,
        user_id: studentFee.user_id,
        amount,
        payment_method: 'mpesa',
        transaction_reference: transactionId,
        receipt_number: receiptNumber,
        notes: `Auto-recorded from M-Pesa. Phone: ${phoneNumber}`,
      });

    if (paymentError) {
      console.error('Error recording payment:', paymentError);
      throw paymentError;
    }

    // Update student fee - balance is auto-calculated as a generated column
    const newAmountPaid = studentFee.amount_paid + amount;
    const newStatus = newAmountPaid >= studentFee.amount_due ? 'paid' : 'partial';

    await supabase
      .from('student_fees')
      .update({ 
        amount_paid: newAmountPaid, 
        status: newStatus 
      })
      .eq('id', studentFee.id);

    // Send confirmation email if possible
    if (resendApiKey && profile?.email) {
      const currency = studentFee.fee_structures?.currency || 'KES';
      
      try {
        await sendConfirmationEmail(
          resendApiKey,
          profile.email,
          profile.full_name || 'Student',
          amount,
          currency,
          receiptNumber,
          transactionId,
          studentFee.courses?.title || 'General Fee',
          studentFee.fee_structures?.name || 'Course Fee',
          studentFee.amount_due - newAmountPaid
        );
        console.log('Confirmation email sent to:', profile.email);
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
      }
    }

    console.log('Payment processed successfully:', receiptNumber);

    return new Response(
      JSON.stringify({ 
        success: true, 
        receipt_number: receiptNumber,
        amount_recorded: amount,
        student_fee_id: studentFee.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
