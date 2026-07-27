import { Button } from '@/components/ui/button';
import { FileText, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';

// All courses including English and AI
const allCourses = [
  { school: "School of ICT & Digital Technology", courses: [
    { name: "Information Technology (IT)", level: "Certificate", fee: 29000, duration: "3 months" },
    { name: "Computer Programming", level: "Certificate", fee: 30000, duration: "3 months" },
    { name: "Web Design & Development", level: "Certificate", fee: 28000, duration: "3 months" },
    { name: "Software Development", level: "Craft", fee: 30000, duration: "6 months" },
    { name: "Mobile App Development", level: "Certificate", fee: 30000, duration: "3 months" },
    { name: "Computer Applications", level: "Artisan", fee: 18000, duration: "2 months" },
    { name: "Computerized Accounting", level: "Artisan", fee: 22000, duration: "2 months" },
    { name: "Database Management", level: "Certificate", fee: 27000, duration: "3 months" },
    { name: "Networking (Theory-Based)", level: "Certificate", fee: 27000, duration: "3 months" },
    { name: "Cyber Security (Fundamentals)", level: "Certificate", fee: 30000, duration: "3 months" },
  ]},
  { school: "School of Business & Management", courses: [
    { name: "Business Management", level: "Certificate", fee: 27500, duration: "3 months" },
    { name: "Business Administration", level: "Certificate", fee: 28000, duration: "3 months" },
    { name: "Human Resource Management", level: "Craft", fee: 29000, duration: "6 months" },
    { name: "Accounting & Finance", level: "Certificate", fee: 29000, duration: "3 months" },
    { name: "Banking & Finance", level: "Certificate", fee: 29000, duration: "3 months" },
    { name: "Entrepreneurship", level: "Certificate", fee: 22000, duration: "3 months" },
    { name: "Project Management", level: "Certificate", fee: 27000, duration: "3 months" },
  ]},
  { school: "Professional & Specialized Courses", courses: [
    { name: "Digital Marketing", level: "Professional", fee: 30000, duration: "3 months" },
    { name: "Artificial Intelligence (AI)", level: "Professional", fee: 15000, duration: "Monthly", isMonthly: true },
    { name: "English Language Learning", level: "Certificate", fee: 5000, duration: "Monthly", isMonthly: true },
  ]},
  { school: "Education, Administration & Office Skills", courses: [
    { name: "Office Administration", level: "Certificate", fee: 27000, duration: "3 months" },
    { name: "Secretarial Studies", level: "Certificate", fee: 27000, duration: "3 months" },
    { name: "Records & Information Management", level: "Certificate", fee: 26000, duration: "3 months" },
    { name: "Virtual Assistance", level: "Certificate", fee: 18000, duration: "2 months" },
    { name: "Business Communication Skills", level: "Certificate", fee: 18000, duration: "2 months" },
  ]},
];

const FeeStructurePDF = () => {
  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let yPos = 20;
    
    // Header
    doc.setFillColor(0, 120, 212);
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('TECHNO PANALY INSTITUTE OF TECHNOLOGY', pageWidth / 2, 18, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text('Fee Structure 2026', pageWidth / 2, 30, { align: 'center' });
    
    yPos = 50;
    doc.setTextColor(0, 0, 0);
    
    // Iterate through schools
    for (const school of allCourses) {
      // Check if we need a new page
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      
      // School header
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, yPos - 5, pageWidth - margin * 2, 10, 'F');
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 120, 212);
      doc.text(school.school, margin + 3, yPos + 2);
      yPos += 12;
      
      // Table header
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'bold');
      doc.text('Course', margin, yPos);
      doc.text('Level', 95, yPos);
      doc.text('Duration', 125, yPos);
      doc.text('Fee (KES)', 160, yPos);
      yPos += 6;
      
      // Draw line
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
      
      // Courses
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      
      for (const course of school.courses) {
        if (yPos > 275) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(9);
        doc.text(course.name, margin, yPos);
        doc.text(course.level, 95, yPos);
        doc.text(course.duration, 125, yPos);
        
        const feeText = course.isMonthly 
          ? `${course.fee.toLocaleString()}/month`
          : course.fee.toLocaleString();
        doc.text(feeText, 160, yPos);
        
        yPos += 6;
      }
      
      yPos += 8;
    }
    
    // Payment Details Section
    if (yPos > 200) {
      doc.addPage();
      yPos = 20;
    }
    
    yPos += 10;
    doc.setFillColor(0, 120, 212);
    doc.rect(margin, yPos - 5, pageWidth - margin * 2, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT METHODS', margin + 3, yPos + 2);
    yPos += 15;
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    
    // M-Pesa Paybill
    doc.setFont('helvetica', 'bold');
    doc.text('M-Pesa Paybill (Recommended)', margin, yPos);
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    doc.text('Business Number: 889100', margin + 5, yPos);
    yPos += 5;
    doc.text('Account Number: 9067620016', margin + 5, yPos);
    yPos += 10;
    
    // M-Pesa Direct
    doc.setFont('helvetica', 'bold');
    doc.text('M-Pesa Send Money', margin, yPos);
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    doc.text('Phone: +254711577338', margin + 5, yPos);
    yPos += 5;
    doc.text('Name: PATRICK KIMANTHI', margin + 5, yPos);
    yPos += 10;
    
    // Bank Transfer
    doc.setFont('helvetica', 'bold');
    doc.text('Bank Transfer', margin, yPos);
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    doc.text('Bank: NCBA BANK', margin + 5, yPos);
    yPos += 5;
    doc.text('Branch Code: 216', margin + 5, yPos);
    yPos += 5;
    doc.text('Bank Code: 07', margin + 5, yPos);
    yPos += 5;
    doc.text('Account Number: 9067620016', margin + 5, yPos);
    yPos += 5;
    doc.text('Account Name: PATRICK KIMANTHI', margin + 5, yPos);
    yPos += 15;
    
    // Important note
    doc.setFillColor(255, 243, 205);
    doc.rect(margin, yPos - 3, pageWidth - margin * 2, 15, 'F');
    doc.setFontSize(9);
    doc.setTextColor(133, 100, 4);
    doc.setFont('helvetica', 'bold');
    doc.text('IMPORTANT:', margin + 3, yPos + 3);
    doc.setFont('helvetica', 'normal');
    doc.text('Use your full name or email as the payment reference for automatic account credit.', margin + 30, yPos + 3);
    doc.text('Fees are per term (3 months) unless marked as monthly.', margin + 3, yPos + 9);
    
    // Footer
    yPos = 280;
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text('Techno Panaly Institute of Technology | www.microsoftinstitute.co.ke', pageWidth / 2, yPos, { align: 'center' });
    doc.text(`Generated on ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`, pageWidth / 2, yPos + 5, { align: 'center' });
    
    // Save
    doc.save('Techno-Panaly-Fee-Structure-2026.pdf');
    toast.success('Fee structure PDF downloaded');
  };

  return (
    <Button variant="outline" onClick={generatePDF} className="gap-2">
      <FileText className="h-4 w-4" />
      Download Fee Structure PDF
    </Button>
  );
};

export default FeeStructurePDF;
