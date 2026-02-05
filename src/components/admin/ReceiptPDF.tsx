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
  const pageHeight = doc.internal.pageSize.getHeight();
  const currency = fee.fee_structures?.currency || 'KES';
  
  // Colors
  const primaryBlue = [30, 58, 95] as [number, number, number]; // #1e3a5f
  const accentOrange = [245, 158, 11] as [number, number, number]; // #f59e0b
  const greenColor = [22, 163, 74] as [number, number, number]; // #16a34a
  const grayText = [100, 100, 100] as [number, number, number];
  const lightGray = [248, 249, 250] as [number, number, number];
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return `${currency} ${amount.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;
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

  // Header background with gradient effect
  doc.setFillColor(...primaryBlue);
  doc.rect(0, 0, pageWidth, 50, 'F');
  
  // Add subtle accent line
  doc.setFillColor(...accentOrange);
  doc.rect(0, 48, pageWidth, 2, 'F');

  // Logo - positioned on white circle for better visibility
  if (logoBase64) {
    try {
      // White circle background for logo
      doc.setFillColor(255, 255, 255);
      doc.circle(32, 25, 18, 'F');
      doc.addImage(logoBase64, 'PNG', 17, 10, 30, 30);
    } catch (e) {
      console.error('Could not add logo to PDF:', e);
    }
  }

  // Header text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('OFFICIAL PAYMENT RECEIPT', pageWidth / 2 + 10, 20, { align: 'center' });
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Microsoft Training Institute', pageWidth / 2 + 10, 30, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text('"Quest for Excellence"', pageWidth / 2 + 10, 38, { align: 'center' });
  
  // Receipt number box - elegant design
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(pageWidth - 60, 10, 50, 20, 2, 2, 'F');
  doc.setTextColor(...primaryBlue);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('RECEIPT NO.', pageWidth - 55, 17);
  doc.setFontSize(9);
  doc.setTextColor(...accentOrange);
  doc.text(payment.receipt_number || 'N/A', pageWidth - 55, 25);

  let yPos = 60;

  // Student Details Section - Card style
  doc.setFillColor(...lightGray);
  doc.roundedRect(15, yPos, pageWidth - 30, 38, 4, 4, 'F');
  doc.setDrawColor(...primaryBlue);
  doc.setLineWidth(0.5);
  doc.roundedRect(15, yPos, pageWidth - 30, 38, 4, 4, 'S');
  
  // Student icon placeholder (circle with initials)
  doc.setFillColor(...primaryBlue);
  doc.circle(30, yPos + 19, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const initials = (student.full_name || 'S').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  doc.text(initials, 30, yPos + 22, { align: 'center' });
  
  doc.setTextColor(...grayText);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('RECEIVED FROM', 45, yPos + 10);
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(student.full_name || 'Student', 45, yPos + 20);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...grayText);
  doc.text(student.email || '', 45, yPos + 28);
  
  // Payment Date - right side
  doc.setFontSize(8);
  doc.text('DATE OF PAYMENT', pageWidth - 55, yPos + 10);
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(formatDate(payment.payment_date), pageWidth - 55, yPos + 20);

  yPos += 48;

  // Payment Details Section
  doc.setTextColor(...primaryBlue);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYMENT DETAILS', 15, yPos);

  yPos += 10;
  
  // Details in a clean table format
  const detailsData = [
    ['Course/Program', fee.courses?.title || fee.fee_structures?.name || 'General Fee'],
    ['Fee Type', fee.fee_structures?.name || 'Custom Fee'],
    ['Payment Method', (payment.payment_method || 'N/A').toUpperCase()],
    ['Transaction Reference', payment.transaction_reference || 'N/A'],
  ];

  doc.setFontSize(9);
  detailsData.forEach(([label, value], index) => {
    const rowY = yPos + (index * 9);
    
    // Alternating row background
    if (index % 2 === 0) {
      doc.setFillColor(250, 250, 252);
      doc.rect(15, rowY - 4, pageWidth - 30, 8, 'F');
    }
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...grayText);
    doc.text(label, 20, rowY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    const truncatedValue = String(value).length > 45 ? String(value).substring(0, 42) + '...' : String(value);
    doc.text(truncatedValue, 75, rowY);
  });

  yPos += 45;

  // Financial Summary Box - Premium design
  doc.setFillColor(...accentOrange);
  doc.roundedRect(15, yPos, pageWidth - 30, 50, 5, 5, 'F');
  
  // Inner shadow effect
  doc.setFillColor(230, 140, 10);
  doc.roundedRect(15, yPos + 47, pageWidth - 30, 3, 0, 0, 'F');
  
  // Amount Paid (large)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('AMOUNT PAID', 25, yPos + 12);
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(payment.amount), 25, yPos + 32);

  // Financial summary on the right - in a white box
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(pageWidth - 85, yPos + 5, 65, 40, 3, 3, 'F');
  
  doc.setTextColor(...grayText);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const summaryX = pageWidth - 80;
  doc.text('Total Fees:', summaryX, yPos + 15);
  doc.text('Amount Paid:', summaryX, yPos + 25);
  doc.text('Balance Due:', summaryX, yPos + 35);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(formatCurrency(fee.amount_due), summaryX + 35, yPos + 15);
  doc.setTextColor(...greenColor);
  doc.text(formatCurrency(fee.amount_paid), summaryX + 35, yPos + 25);
  doc.setTextColor(fee.balance > 0 ? 200 : 0, fee.balance > 0 ? 50 : 150, fee.balance > 0 ? 50 : 75);
  doc.text(formatCurrency(fee.balance), summaryX + 35, yPos + 35);

  yPos += 60;

  // PAID Stamp - Improved professional design
  if (fee.balance <= 0) {
    doc.saveGraphicsState();
    
    // Stamp circle
    const stampX = pageWidth - 45;
    const stampY = yPos - 10;
    
    doc.setDrawColor(...greenColor);
    doc.setLineWidth(2);
    doc.circle(stampX, stampY, 22, 'S');
    doc.circle(stampX, stampY, 19, 'S');
    
    doc.setTextColor(...greenColor);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('PAID', stampX, stampY - 3, { align: 'center' });
    
    doc.setFontSize(5);
    doc.text('MICROSOFT TRAINING', stampX, stampY + 5, { align: 'center' });
    doc.text('INSTITUTE', stampX, stampY + 9, { align: 'center' });
    
    doc.setFontSize(4);
    doc.text(formatDate(payment.payment_date), stampX, stampY + 14, { align: 'center' });
    
    doc.restoreGraphicsState();
  }

  // Payment History
  if (paymentHistory.length > 0) {
    doc.setTextColor(...primaryBlue);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT HISTORY', 15, yPos);

    yPos += 8;
    
    // Table header
    doc.setFillColor(...primaryBlue);
    doc.rect(15, yPos, pageWidth - 30, 8, 'F');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('DATE', 20, yPos + 5);
    doc.text('RECEIPT NO.', 55, yPos + 5);
    doc.text('METHOD', 105, yPos + 5);
    doc.text('AMOUNT', 150, yPos + 5);

    yPos += 10;

    doc.setTextColor(0, 0, 0);
    paymentHistory.slice(0, 5).forEach((item, index) => {
      const rowY = yPos + (index * 7);
      
      // Zebra striping
      if (index % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(15, rowY - 4, pageWidth - 30, 7, 'F');
      }
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...grayText);
      doc.text(formatDate(item.payment_date).substring(0, 12), 20, rowY);
      doc.text(item.receipt_number || 'N/A', 55, rowY);
      doc.text((item.payment_method || 'N/A').toUpperCase(), 105, rowY);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...greenColor);
      doc.text(formatCurrency(item.amount), 150, rowY);
    });

    yPos += (Math.min(paymentHistory.length, 5) * 7) + 10;
  }

  // QR Code placeholder - improved design
  const qrSize = 28;
  const qrX = 20;
  const qrY = Math.min(yPos + 5, pageHeight - 65);
  
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...primaryBlue);
  doc.setLineWidth(1);
  doc.rect(qrX, qrY, qrSize, qrSize, 'FD');
  
  // QR pattern simulation
  doc.setFillColor(...primaryBlue);
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
      if ((i + j) % 2 === 0) {
        doc.rect(qrX + 4 + (i * 4), qrY + 4 + (j * 4), 3, 3, 'F');
      }
    }
  }
  
  doc.setFontSize(6);
  doc.setTextColor(...grayText);
  doc.text('Scan to verify', qrX + qrSize / 2, qrY + qrSize + 5, { align: 'center' });

  // Footer - Professional design with icons
  const footerY = pageHeight - 28;
  
  // Divider line
  doc.setDrawColor(...accentOrange);
  doc.setLineWidth(1);
  doc.line(15, footerY - 8, pageWidth - 15, footerY - 8);
  
  // Footer background
  doc.setFillColor(...primaryBlue);
  doc.rect(0, footerY - 3, pageWidth, 31, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Microsoft Training Institute', pageWidth / 2, footerY + 5, { align: 'center' });
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  // Contact info with better formatting
  doc.text('Nairobi, Kenya', pageWidth / 2, footerY + 12, { align: 'center' });
  
  // Contact details in a row
  doc.setFontSize(7);
  const contactY = footerY + 19;
  doc.text('Email: finance@microsoftinstitute.africa', 45, contactY);
  doc.text('|', pageWidth / 2, contactY, { align: 'center' });
  doc.text('Phone: +254 723 821 798', pageWidth / 2 + 15, contactY);
  
  // Website
  doc.setTextColor(...accentOrange);
  doc.text('www.microsoftinstitute.africa', pageWidth / 2, footerY + 25, { align: 'center' });

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