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
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const currency = fee.fee_structures?.currency || 'KES';
  const isPaidInFull = fee.balance <= 0;
  
  // Colors matching email design
  const primaryBlue = [30, 58, 95] as [number, number, number]; // #1e3a5f
  const secondaryBlue = [45, 90, 135] as [number, number, number]; // #2d5a87
  const accentOrange = [245, 158, 11] as [number, number, number]; // #f59e0b
  const darkOrange = [217, 119, 6] as [number, number, number]; // #d97706
  const greenColor = [16, 185, 129] as [number, number, number]; // #10b981
  const redColor = [239, 68, 68] as [number, number, number]; // #ef4444
  const grayText = [100, 116, 139] as [number, number, number]; // #64748b
  const lightGray = [248, 250, 252] as [number, number, number]; // #f8fafc
  const borderGray = [226, 232, 240] as [number, number, number]; // #e2e8f0
  
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

  const margins = { left: 20, right: 20 };
  const contentWidth = pageWidth - margins.left - margins.right;

  // ===== HEADER - Gradient style matching email =====
  doc.setFillColor(...primaryBlue);
  doc.rect(0, 0, pageWidth, 45, 'F');
  
  // Load and add logo
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

  if (logoBase64) {
    try {
      doc.setFillColor(255, 255, 255);
      doc.circle(25, 22.5, 12, 'F');
      doc.addImage(logoBase64, 'PNG', 15, 12.5, 20, 20);
    } catch (e) {
      console.error('Could not add logo to PDF:', e);
    }
  }

  // Header text - matching email style
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Microsoft Training Institute', pageWidth / 2 + 10, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.text('"Quest for Excellence"', pageWidth / 2 + 10, 28, { align: 'center' });

  // ===== RECEIPT TITLE BAR - Orange like email =====
  doc.setFillColor(...accentOrange);
  doc.rect(0, 45, pageWidth, 15, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYMENT RECEIPT', pageWidth / 2, 54, { align: 'center' });

  let yPos = 70;

  // ===== STATUS BADGE - Matching email design =====
  const badgeWidth = 50;
  const badgeX = (pageWidth - badgeWidth) / 2;
  const badgeColor = isPaidInFull ? greenColor : accentOrange;
  doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
  doc.roundedRect(badgeX, yPos, badgeWidth, 10, 5, 5, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(isPaidInFull ? 'PAID IN FULL' : 'PARTIAL PAYMENT', pageWidth / 2, yPos + 7, { align: 'center' });

  yPos += 20;

  // ===== RECEIVED FROM Section - Card style like email =====
  doc.setFillColor(...lightGray);
  doc.roundedRect(margins.left, yPos, contentWidth, 28, 3, 3, 'F');
  
  doc.setFontSize(8);
  doc.setTextColor(...grayText);
  doc.setFont('helvetica', 'normal');
  doc.text('RECEIVED FROM', margins.left + 5, yPos + 8);
  
  doc.setFontSize(14);
  doc.setTextColor(...primaryBlue);
  doc.setFont('helvetica', 'bold');
  doc.text(student.full_name || 'Student', margins.left + 5, yPos + 18);
  
  doc.setFontSize(9);
  doc.setTextColor(...grayText);
  doc.setFont('helvetica', 'normal');
  doc.text(student.email || '', margins.left + 5, yPos + 24);

  yPos += 35;

  // ===== RECEIPT DETAILS Section - Table style like email =====
  doc.setFillColor(...lightGray);
  doc.roundedRect(margins.left, yPos, contentWidth, 60, 3, 3, 'F');

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

  let detailY = yPos + 10;
  doc.setFontSize(9);
  
  detailsData.forEach(([label, value]) => {
    doc.setTextColor(...grayText);
    doc.setFont('helvetica', 'normal');
    doc.text(label, margins.left + 5, detailY);
    
    doc.setTextColor(...primaryBlue);
    doc.setFont('helvetica', 'bold');
    const truncatedValue = String(value).length > 35 ? String(value).substring(0, 32) + '...' : String(value);
    doc.text(truncatedValue, pageWidth - margins.right - 5, detailY, { align: 'right' });
    
    detailY += 9;
  });

  yPos += 68;

  // ===== AMOUNT PAID Box - Orange gradient style like email =====
  doc.setFillColor(...accentOrange);
  doc.roundedRect(margins.left, yPos, contentWidth, 30, 3, 3, 'F');
  
  // Bottom shadow effect
  doc.setFillColor(...darkOrange);
  doc.roundedRect(margins.left, yPos + 27, contentWidth, 3, 0, 0, 'F');
  
  doc.setTextColor(255, 255, 255, 0.9);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Amount Paid', margins.left + 10, yPos + 12);
  
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(formatCurrency(payment.amount), pageWidth - margins.right - 10, yPos + 20, { align: 'right' });

  yPos += 40;

  // ===== FEE SUMMARY Section - Border box like email =====
  doc.setDrawColor(...borderGray);
  doc.setLineWidth(0.5);
  doc.roundedRect(margins.left, yPos, contentWidth, 42, 3, 3, 'S');
  
  doc.setFontSize(9);
  doc.setTextColor(...primaryBlue);
  doc.setFont('helvetica', 'bold');
  doc.text('FEE SUMMARY', margins.left + 5, yPos + 10);
  
  // Summary rows
  const summaryData = [
    { label: 'Total Fees', value: formatCurrency(fee.amount_due), color: [0, 0, 0] as [number, number, number] },
    { label: 'Total Paid', value: formatCurrency(fee.amount_paid), color: greenColor },
    { label: 'Balance Due', value: formatCurrency(fee.balance), color: isPaidInFull ? greenColor : redColor },
  ];

  let summaryY = yPos + 18;
  summaryData.forEach((row, index) => {
    if (index === 2) {
      // Dashed line before balance
      doc.setDrawColor(...borderGray);
      doc.setLineDashPattern([2, 1], 0);
      doc.line(margins.left + 5, summaryY - 2, pageWidth - margins.right - 5, summaryY - 2);
      doc.setLineDashPattern([], 0);
      summaryY += 3;
    }
    
    doc.setTextColor(...grayText);
    doc.setFont('helvetica', 'normal');
    doc.text(row.label, margins.left + 5, summaryY + 4);
    
    doc.setTextColor(...row.color);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(index === 2 ? 12 : 9);
    doc.text(row.value, pageWidth - margins.right - 5, summaryY + 4, { align: 'right' });
    doc.setFontSize(9);
    
    summaryY += 10;
  });

  yPos += 50;

  // ===== PAID STAMP - Matching email style =====
  if (isPaidInFull) {
    const stampX = pageWidth - margins.right - 30;
    const stampY = yPos;
    
    doc.setDrawColor(...greenColor);
    doc.setLineWidth(1.5);
    doc.roundedRect(stampX - 22, stampY - 8, 44, 20, 3, 3, 'S');
    
    doc.setTextColor(...greenColor);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('PAID', stampX, stampY + 4, { align: 'center' });
    
    doc.setFontSize(5);
    doc.text('MICROSOFT TRAINING INSTITUTE', stampX, stampY + 10, { align: 'center' });
  }

  yPos += 20;

  // ===== PAYMENT HISTORY Section =====
  if (paymentHistory.length > 0 && yPos < pageHeight - 80) {
    doc.setTextColor(...primaryBlue);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT HISTORY', margins.left, yPos);

    yPos += 8;
    
    // Table header
    doc.setFillColor(...primaryBlue);
    doc.rect(margins.left, yPos, contentWidth, 8, 'F');
    
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('DATE', margins.left + 5, yPos + 5);
    doc.text('RECEIPT NO.', margins.left + 45, yPos + 5);
    doc.text('METHOD', margins.left + 95, yPos + 5);
    doc.text('AMOUNT', pageWidth - margins.right - 5, yPos + 5, { align: 'right' });

    yPos += 10;

    paymentHistory.slice(0, 5).forEach((item, index) => {
      if (index % 2 === 0) {
        doc.setFillColor(...lightGray);
        doc.rect(margins.left, yPos - 3, contentWidth, 7, 'F');
      }
      
      doc.setTextColor(...grayText);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(formatDate(item.payment_date).substring(0, 15), margins.left + 5, yPos + 1);
      doc.text(item.receipt_number || 'N/A', margins.left + 45, yPos + 1);
      doc.text((item.payment_method || 'N/A').toUpperCase(), margins.left + 95, yPos + 1);
      
      doc.setTextColor(...greenColor);
      doc.setFont('helvetica', 'bold');
      doc.text(formatCurrency(item.amount), pageWidth - margins.right - 5, yPos + 1, { align: 'right' });
      
      yPos += 7;
    });
  }

  // ===== OFFICIAL NOTICE =====
  const noticeY = pageHeight - 50;
  doc.setFontSize(8);
  doc.setTextColor(...grayText);
  doc.setFont('helvetica', 'normal');
  doc.text('This is an official receipt from Microsoft Training Institute.', pageWidth / 2, noticeY, { align: 'center' });
  doc.text('Please keep this for your records.', pageWidth / 2, noticeY + 5, { align: 'center' });

  // ===== FOOTER - Matching email style =====
  const footerY = pageHeight - 30;
  
  doc.setFillColor(...primaryBlue);
  doc.rect(0, footerY, pageWidth, 30, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Microsoft Training Institute', pageWidth / 2, footerY + 8, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Nairobi, Kenya', pageWidth / 2, footerY + 14, { align: 'center' });
  
  doc.setFontSize(8);
  doc.text('finance@microsoftinstitute.africa  |  +254 723 821 798', pageWidth / 2, footerY + 20, { align: 'center' });
  
  doc.setFontSize(7);
  doc.setTextColor(200, 200, 200);
  doc.text(`© ${new Date().getFullYear()} Microsoft Training Institute. All rights reserved.`, pageWidth / 2, footerY + 26, { align: 'center' });

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
