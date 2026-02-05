import { jsPDF } from 'jspdf';
import { supabase } from '@/integrations/supabase/client';
import logoImage from '@/assets/logo.png';

interface PaymentData {
  id: string;
  receipt_number: string;
  amount: number;
  payment_date: string;
  payment_method: string | null;
  transaction_reference: string | null;
  notes: string | null;
}

interface StudentData {
  full_name: string | null;
  email: string | null;
}

interface FeeData {
  amount_due: number;
  amount_paid: number;
  balance: number;
  fee_structures?: { name: string; currency: string } | null;
  courses?: { title: string } | null;
}

interface PaymentHistoryItem {
  receipt_number: string | null;
  amount: number;
  payment_date: string;
  payment_method: string | null;
}

export const generateReceiptPDF = async (
  payment: PaymentData,
  student: StudentData,
  fee: FeeData,
  paymentHistory: PaymentHistoryItem[]
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const currency = fee.fee_structures?.currency || 'KES';
  
  // Colors
  const primaryBlue = [30, 58, 95]; // #1e3a5f
  const accentOrange = [245, 158, 11]; // #f59e0b
  const greenColor = [22, 163, 74]; // #16a34a
  const grayText = [100, 100, 100];
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Load logo as base64
  let logoBase64 = '';
  try {
    const response = await fetch(logoImage);
    const blob = await response.blob();
    logoBase64 = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error('Could not load logo:', e);
  }

  // Header background
  doc.setFillColor(...primaryBlue as [number, number, number]);
  doc.rect(0, 0, pageWidth, 45, 'F');

  // Logo
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', 15, 5, 35, 35);
    } catch (e) {
      console.error('Could not add logo to PDF:', e);
    }
  }

  // Header text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYMENT RECEIPT', pageWidth / 2, 18, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Microsoft Training Institute', pageWidth / 2, 26, { align: 'center' });
  doc.text('"Quest for Excellence"', pageWidth / 2, 32, { align: 'center' });
  
  // Receipt number box
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(pageWidth - 65, 8, 55, 18, 3, 3, 'F');
  doc.setTextColor(...primaryBlue as [number, number, number]);
  doc.setFontSize(8);
  doc.text('RECEIPT NO.', pageWidth - 60, 14);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(payment.receipt_number || 'N/A', pageWidth - 60, 22);

  let yPos = 55;

  // Student Details Section
  doc.setFillColor(248, 249, 250);
  doc.roundedRect(15, yPos, pageWidth - 30, 35, 3, 3, 'F');
  
  doc.setTextColor(...grayText as [number, number, number]);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('RECEIVED FROM', 20, yPos + 8);
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(student.full_name || 'Student', 20, yPos + 17);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grayText as [number, number, number]);
  doc.text(student.email || '', 20, yPos + 25);
  
  // Payment Date
  doc.setTextColor(...grayText as [number, number, number]);
  doc.setFontSize(8);
  doc.text('DATE', pageWidth - 60, yPos + 8);
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(formatDate(payment.payment_date), pageWidth - 60, yPos + 17);

  yPos += 45;

  // Payment Details Section
  doc.setTextColor(...primaryBlue as [number, number, number]);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYMENT DETAILS', 15, yPos);

  yPos += 8;
  
  // Details table
  const detailsData = [
    ['Course/Program', fee.courses?.title || fee.fee_structures?.name || 'General Fee'],
    ['Fee Type', fee.fee_structures?.name || 'Custom Fee'],
    ['Payment Method', payment.payment_method?.toUpperCase() || 'N/A'],
    ['Transaction Ref', payment.transaction_reference || 'N/A'],
  ];

  doc.setFontSize(9);
  detailsData.forEach(([label, value], index) => {
    const rowY = yPos + (index * 8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...grayText as [number, number, number]);
    doc.text(label, 20, rowY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    const truncatedValue = value.length > 50 ? value.substring(0, 47) + '...' : value;
    doc.text(truncatedValue, 70, rowY);
  });

  yPos += 40;

  // Financial Summary Box
  doc.setFillColor(...accentOrange as [number, number, number]);
  doc.roundedRect(15, yPos, pageWidth - 30, 45, 3, 3, 'F');
  
  // Amount Paid (large)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('AMOUNT PAID', 25, yPos + 12);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(payment.amount), 25, yPos + 28);

  // Financial summary on the right
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const summaryX = pageWidth - 70;
  doc.text('Total Fees:', summaryX, yPos + 12);
  doc.text('Amount Paid:', summaryX, yPos + 22);
  doc.text('Balance Due:', summaryX, yPos + 32);
  
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(fee.amount_due), summaryX + 40, yPos + 12);
  doc.text(formatCurrency(fee.amount_paid), summaryX + 40, yPos + 22);
  doc.text(formatCurrency(fee.balance), summaryX + 40, yPos + 32);

  yPos += 55;

  // PAID Stamp
  if (fee.balance <= 0) {
    doc.setDrawColor(...greenColor as [number, number, number]);
    doc.setLineWidth(3);
    doc.setTextColor(...greenColor as [number, number, number]);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    
    // Rotate and draw stamp
    doc.saveGraphicsState();
    const stampX = pageWidth - 50;
    const stampY = yPos - 15;
    doc.text('PAID', stampX, stampY, { angle: -15 });
    doc.setFontSize(8);
    doc.text('MICROSOFT TRAINING', stampX - 10, stampY + 8, { angle: -15 });
    doc.text('INSTITUTE', stampX, stampY + 14, { angle: -15 });
    doc.restoreGraphicsState();
  }

  // Payment History
  if (paymentHistory.length > 0) {
    doc.setTextColor(...primaryBlue as [number, number, number]);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT HISTORY', 15, yPos);

    yPos += 8;
    
    // Table header
    doc.setFillColor(240, 240, 240);
    doc.rect(15, yPos, pageWidth - 30, 8, 'F');
    doc.setFontSize(8);
    doc.setTextColor(...grayText as [number, number, number]);
    doc.text('DATE', 20, yPos + 5);
    doc.text('RECEIPT', 60, yPos + 5);
    doc.text('METHOD', 110, yPos + 5);
    doc.text('AMOUNT', 155, yPos + 5);

    yPos += 10;

    doc.setTextColor(0, 0, 0);
    paymentHistory.slice(0, 5).forEach((item, index) => {
      const rowY = yPos + (index * 7);
      doc.setFont('helvetica', 'normal');
      doc.text(formatDate(item.payment_date).substring(0, 12), 20, rowY);
      doc.text(item.receipt_number || 'N/A', 60, rowY);
      doc.text(item.payment_method || 'N/A', 110, rowY);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...greenColor as [number, number, number]);
      doc.text(formatCurrency(item.amount), 155, rowY);
      doc.setTextColor(0, 0, 0);
    });

    yPos += (Math.min(paymentHistory.length, 5) * 7) + 10;
  }

  // QR Code placeholder (a square with text since jsPDF doesn't have native QR support)
  const qrSize = 30;
  const qrX = pageWidth - qrSize - 20;
  const qrY = yPos;
  
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(200, 200, 200);
  doc.rect(qrX, qrY, qrSize, qrSize, 'FD');
  
  doc.setFontSize(6);
  doc.setTextColor(100, 100, 100);
  doc.text('Scan to verify', qrX + qrSize/2, qrY + qrSize/2 - 3, { align: 'center' });
  doc.text(payment.receipt_number || '', qrX + qrSize/2, qrY + qrSize/2 + 3, { align: 'center' });

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 25;
  
  doc.setDrawColor(200, 200, 200);
  doc.line(15, footerY - 5, pageWidth - 15, footerY - 5);
  
  doc.setFillColor(...primaryBlue as [number, number, number]);
  doc.rect(0, footerY, pageWidth, 25, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Microsoft Training Institute | Nairobi, Kenya', pageWidth / 2, footerY + 6, { align: 'center' });
  doc.text('📧 finance@microsoftinstitute.africa | 📱 +254 723 821 798', pageWidth / 2, footerY + 12, { align: 'center' });
  doc.text('www.microsoftinstitute.africa', pageWidth / 2, footerY + 18, { align: 'center' });

  // Save
  doc.save(`Receipt-${payment.receipt_number || payment.id}.pdf`);
};

export const downloadReceiptForPayment = async (paymentId: string) => {
  try {
    // Fetch payment
    const { data: payment, error: paymentError } = await supabase
      .from('fee_payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) throw new Error('Payment not found');

    // Fetch student fee
    const { data: studentFee, error: feeError } = await supabase
      .from('student_fees')
      .select('*, fee_structures(name, currency), courses(title)')
      .eq('id', payment.student_fee_id)
      .single();

    if (feeError || !studentFee) throw new Error('Fee record not found');

    // Fetch student profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', payment.user_id)
      .single();

    // Fetch payment history
    const { data: history } = await supabase
      .from('fee_payments')
      .select('receipt_number, amount, payment_date, payment_method')
      .eq('student_fee_id', payment.student_fee_id)
      .order('payment_date', { ascending: false });

    await generateReceiptPDF(
      payment,
      profile || { full_name: null, email: null },
      studentFee,
      history || []
    );
  } catch (error) {
    console.error('Error generating receipt:', error);
    throw error;
  }
};
