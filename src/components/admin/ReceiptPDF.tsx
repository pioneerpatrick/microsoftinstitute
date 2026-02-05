import { jsPDF } from 'jspdf';
import { supabase } from '@/integrations/supabase/client';

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
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const currency = fee.fee_structures?.currency || 'KES';
  const isPaidInFull = fee.balance <= 0;
  
  // Colors matching email design
  const primaryBlue = [30, 58, 95] as [number, number, number];
  const accentOrange = [245, 158, 11] as [number, number, number];
  const darkOrange = [217, 119, 6] as [number, number, number];
  const greenColor = [16, 185, 129] as [number, number, number];
  const redColor = [239, 68, 68] as [number, number, number];
  const grayText = [100, 116, 139] as [number, number, number];
  const lightGray = [248, 250, 252] as [number, number, number];
  const borderGray = [226, 232, 240] as [number, number, number];
  
  const formatCurrency = (amount: number) => {
    return `${currency} ${amount.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const margins = { left: 15, right: 15 };
  const contentWidth = pageWidth - margins.left - margins.right;

  // ===== HEADER =====
  doc.setFillColor(...primaryBlue);
  doc.rect(0, 0, pageWidth, 32, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Microsoft Training Institute', pageWidth / 2, 14, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text('"Quest for Excellence"', pageWidth / 2, 22, { align: 'center' });

  // ===== RECEIPT TITLE BAR =====
  doc.setFillColor(...accentOrange);
  doc.rect(0, 32, pageWidth, 10, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYMENT RECEIPT', pageWidth / 2, 39, { align: 'center' });

  let yPos = 48;

  // ===== STATUS BADGE =====
  const badgeColor = isPaidInFull ? greenColor : accentOrange;
  doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
  doc.roundedRect(pageWidth / 2 - 22, yPos, 44, 8, 4, 4, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text(isPaidInFull ? 'PAID IN FULL' : 'PARTIAL PAYMENT', pageWidth / 2, yPos + 5.5, { align: 'center' });

  yPos += 14;

  // ===== RECEIVED FROM Section =====
  doc.setFillColor(...lightGray);
  doc.roundedRect(margins.left, yPos, contentWidth, 18, 2, 2, 'F');
  
  doc.setFontSize(7);
  doc.setTextColor(...grayText);
  doc.setFont('helvetica', 'normal');
  doc.text('RECEIVED FROM', margins.left + 4, yPos + 5);
  
  doc.setFontSize(11);
  doc.setTextColor(...primaryBlue);
  doc.setFont('helvetica', 'bold');
  doc.text(student.full_name || 'Student', margins.left + 4, yPos + 12);
  
  doc.setFontSize(8);
  doc.setTextColor(...grayText);
  doc.setFont('helvetica', 'normal');
  doc.text(student.email || '', pageWidth - margins.right - 4, yPos + 12, { align: 'right' });

  yPos += 22;

  // ===== RECEIPT DETAILS =====
  const detailsData = [
    ['Receipt Number', payment.receipt_number || 'N/A'],
    ['Date', formatDate(payment.payment_date)],
    ['Course/Program', fee.courses?.title || fee.fee_structures?.name || 'General Fee'],
    ['Fee Type', fee.fee_structures?.name || 'Custom Fee'],
    ['Payment Method', (payment.payment_method || 'N/A').toUpperCase()],
  ];

  if (payment.transaction_reference) {
    detailsData.push(['Transaction Ref', payment.transaction_reference]);
  }

  doc.setFillColor(...lightGray);
  const detailsHeight = detailsData.length * 7 + 4;
  doc.roundedRect(margins.left, yPos, contentWidth, detailsHeight, 2, 2, 'F');

  let detailY = yPos + 6;
  doc.setFontSize(8);
  
  detailsData.forEach(([label, value]) => {
    doc.setTextColor(...grayText);
    doc.setFont('helvetica', 'normal');
    doc.text(label, margins.left + 4, detailY);
    
    doc.setTextColor(...primaryBlue);
    doc.setFont('helvetica', 'bold');
    const truncVal = String(value).length > 40 ? String(value).substring(0, 37) + '...' : String(value);
    doc.text(truncVal, pageWidth - margins.right - 4, detailY, { align: 'right' });
    
    detailY += 7;
  });

  yPos += detailsHeight + 6;

  // ===== AMOUNT PAID Box =====
  doc.setFillColor(...accentOrange);
  doc.roundedRect(margins.left, yPos, contentWidth, 20, 2, 2, 'F');
  doc.setFillColor(...darkOrange);
  doc.roundedRect(margins.left, yPos + 18, contentWidth, 2, 0, 0, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Amount Paid', margins.left + 6, yPos + 8);
  
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(payment.amount), pageWidth - margins.right - 6, yPos + 14, { align: 'right' });

  yPos += 26;

  // ===== FEE SUMMARY =====
  doc.setDrawColor(...borderGray);
  doc.setLineWidth(0.4);
  doc.roundedRect(margins.left, yPos, contentWidth, 32, 2, 2, 'S');
  
  doc.setFontSize(8);
  doc.setTextColor(...primaryBlue);
  doc.setFont('helvetica', 'bold');
  doc.text('FEE SUMMARY', margins.left + 4, yPos + 7);
  
  const summaryData = [
    { label: 'Total Fees', value: formatCurrency(fee.amount_due), color: [0, 0, 0] as [number, number, number] },
    { label: 'Total Paid', value: formatCurrency(fee.amount_paid), color: greenColor },
    { label: 'Balance Due', value: formatCurrency(fee.balance), color: isPaidInFull ? greenColor : redColor },
  ];

  let summaryY = yPos + 13;
  summaryData.forEach((row, index) => {
    if (index === 2) {
      doc.setDrawColor(...borderGray);
      doc.setLineDashPattern([1.5, 1], 0);
      doc.line(margins.left + 4, summaryY, pageWidth - margins.right - 4, summaryY);
      doc.setLineDashPattern([], 0);
      summaryY += 2;
    }
    
    doc.setTextColor(...grayText);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(row.label, margins.left + 4, summaryY + 4);
    
    doc.setTextColor(...row.color);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(index === 2 ? 10 : 8);
    doc.text(row.value, pageWidth - margins.right - 4, summaryY + 4, { align: 'right' });
    
    summaryY += 7;
  });

  yPos += 38;

  // ===== PAID STAMP - Positioned BELOW fee summary, centered =====
  if (isPaidInFull) {
    const stampWidth = 50;
    const stampHeight = 18;
    const stampX = (pageWidth - stampWidth) / 2;
    
    doc.setDrawColor(...greenColor);
    doc.setLineWidth(1.5);
    doc.roundedRect(stampX, yPos, stampWidth, stampHeight, 3, 3, 'S');
    
    doc.setTextColor(...greenColor);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('PAID', pageWidth / 2, yPos + 10, { align: 'center' });
    
    doc.setFontSize(5);
    doc.text('MICROSOFT TRAINING INSTITUTE', pageWidth / 2, yPos + 15, { align: 'center' });
    
    yPos += stampHeight + 6;
  }

  yPos += 4;

  // ===== PAYMENT HISTORY =====
  if (paymentHistory.length > 0) {
    doc.setTextColor(...primaryBlue);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT HISTORY', margins.left, yPos);

    yPos += 5;
    
    doc.setFillColor(...primaryBlue);
    doc.rect(margins.left, yPos, contentWidth, 6, 'F');
    
    doc.setFontSize(6);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('DATE', margins.left + 4, yPos + 4);
    doc.text('RECEIPT NO.', margins.left + 40, yPos + 4);
    doc.text('METHOD', margins.left + 85, yPos + 4);
    doc.text('AMOUNT', pageWidth - margins.right - 4, yPos + 4, { align: 'right' });

    yPos += 7;

    const maxHistory = Math.min(paymentHistory.length, 4);
    paymentHistory.slice(0, maxHistory).forEach((item, index) => {
      if (index % 2 === 0) {
        doc.setFillColor(...lightGray);
        doc.rect(margins.left, yPos - 2, contentWidth, 5, 'F');
      }
      
      doc.setTextColor(...grayText);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.text(formatDate(item.payment_date), margins.left + 4, yPos + 1);
      doc.text(item.receipt_number || 'N/A', margins.left + 40, yPos + 1);
      doc.text((item.payment_method || 'N/A').toUpperCase(), margins.left + 85, yPos + 1);
      
      doc.setTextColor(...greenColor);
      doc.setFont('helvetica', 'bold');
      doc.text(formatCurrency(item.amount), pageWidth - margins.right - 4, yPos + 1, { align: 'right' });
      
      yPos += 5;
    });
  }

  // ===== OFFICIAL NOTICE =====
  const noticeY = pageHeight - 38;
  doc.setFontSize(7);
  doc.setTextColor(...grayText);
  doc.setFont('helvetica', 'normal');
  doc.text('This is an official receipt from Microsoft Training Institute. Please keep this for your records.', pageWidth / 2, noticeY, { align: 'center' });

  // ===== FOOTER =====
  const footerY = pageHeight - 26;
  
  doc.setFillColor(...primaryBlue);
  doc.rect(0, footerY, pageWidth, 26, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Microsoft Training Institute', pageWidth / 2, footerY + 6, { align: 'center' });
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Nairobi, Kenya', pageWidth / 2, footerY + 12, { align: 'center' });
  
  doc.setFontSize(7);
  doc.text('finance@microsoftinstitute.africa  |  +254 723 821 798', pageWidth / 2, footerY + 17, { align: 'center' });
  
  doc.setFontSize(6);
  doc.setTextColor(200, 200, 200);
  doc.text(`© ${new Date().getFullYear()} Microsoft Training Institute. All rights reserved.`, pageWidth / 2, footerY + 22, { align: 'center' });

  doc.save(`Receipt-${payment.receipt_number || payment.id}.pdf`);
};

export const downloadReceiptForPayment = async (paymentId: string) => {
  try {
    const { data: payment, error: paymentError } = await supabase
      .from('fee_payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) throw new Error('Payment not found');

    const { data: studentFee, error: feeError } = await supabase
      .from('student_fees')
      .select('*, fee_structures(name, currency), courses(title)')
      .eq('id', payment.student_fee_id)
      .single();

    if (feeError || !studentFee) throw new Error('Fee record not found');

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', payment.user_id)
      .single();

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
