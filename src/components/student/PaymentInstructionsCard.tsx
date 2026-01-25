import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Smartphone, Building2, CreditCard, Copy, QrCode, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useState } from 'react';

interface PaymentInstructionsCardProps {
  studentName?: string;
  studentEmail?: string;
  balance?: number;
}

const PaymentInstructionsCard = ({ studentName, studentEmail, balance }: PaymentInstructionsCardProps) => {
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(label);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  const paybillNumber = '889100';
  const accountNumber = '9067620016';
  const phoneNumber = '+254723821798';

  // Generate QR code data for M-Pesa (using a simple QR API)
  const mpesaPaybillQR = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`Paybill: ${paybillNumber}\nAccount: ${accountNumber}\nName: PATRICK KIMANTHI`)}`;
  const mpesaPhoneQR = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`M-Pesa Send Money\nPhone: ${phoneNumber}\nName: PATRICK KIMANTHI`)}`;

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          Payment Instructions
        </CardTitle>
        {balance && balance > 0 && (
          <p className="text-sm text-muted-foreground">
            Your outstanding balance: <span className="font-semibold text-orange-600">KES {balance.toLocaleString()}</span>
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Step by step instructions */}
        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Payment Steps
          </h4>
          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-700 dark:text-blue-400">
            <li>Choose your preferred payment method below</li>
            <li>Use <strong>your full name or email</strong> as the payment reference</li>
            <li>Complete the payment</li>
            <li>Your balance will be updated automatically</li>
            <li>Check your email for payment confirmation</li>
          </ol>
        </div>

        {/* M-Pesa Paybill - Primary option */}
        <div className="bg-background rounded-lg p-4 border-2 border-green-500">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="bg-green-600 p-1.5 rounded">
                <CreditCard className="h-4 w-4 text-white" />
              </div>
              <h4 className="font-semibold">M-Pesa Paybill (Recommended)</h4>
            </div>
            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Instant</span>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 space-y-2 text-sm">
              <div className="bg-muted/50 rounded p-2">
                <p className="text-xs text-muted-foreground mb-1">Step 1: Go to M-Pesa</p>
                <p className="font-medium">Lipa na M-Pesa → Pay Bill</p>
              </div>
              <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                <div>
                  <p className="text-xs text-muted-foreground">Business Number:</p>
                  <span className="font-bold text-lg">{paybillNumber}</span>
                </div>
                <Button 
                  variant={copiedItem === 'Paybill' ? 'default' : 'outline'} 
                  size="sm" 
                  onClick={() => copyToClipboard(paybillNumber, 'Paybill')}
                >
                  {copiedItem === 'Paybill' ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                <div>
                  <p className="text-xs text-muted-foreground">Account Number:</p>
                  <span className="font-bold text-lg">{accountNumber}</span>
                </div>
                <Button 
                  variant={copiedItem === 'Account' ? 'default' : 'outline'} 
                  size="sm" 
                  onClick={() => copyToClipboard(accountNumber, 'Account')}
                >
                  {copiedItem === 'Account' ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              {studentEmail && (
                <p className="text-xs text-muted-foreground">
                  Use reference: <strong>{studentEmail}</strong>
                </p>
              )}
            </div>
            
            <div className="flex flex-col items-center gap-2">
              <div className="bg-white p-2 rounded border shadow-sm">
                <img src={mpesaPaybillQR} alt="Paybill QR Code" className="w-24 h-24 md:w-28 md:h-28" />
              </div>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <QrCode className="h-3 w-3" /> Scan to pay
              </span>
            </div>
          </div>
        </div>

        {/* M-Pesa Send Money */}
        <div className="bg-background rounded-lg p-4 border">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-green-500 p-1.5 rounded">
              <Smartphone className="h-4 w-4 text-white" />
            </div>
            <h4 className="font-semibold">M-Pesa Send Money</h4>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 space-y-2 text-sm">
              <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                <div>
                  <p className="text-xs text-muted-foreground">Phone Number:</p>
                  <span className="font-bold">{phoneNumber}</span>
                </div>
                <Button 
                  variant={copiedItem === 'Phone' ? 'default' : 'outline'} 
                  size="sm" 
                  onClick={() => copyToClipboard('0723821798', 'Phone')}
                >
                  {copiedItem === 'Phone' ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name:</span>
                <span className="font-medium">PATRICK KIMANTHI</span>
              </div>
            </div>
            
            <div className="flex flex-col items-center gap-2">
              <div className="bg-white p-2 rounded border shadow-sm">
                <img src={mpesaPhoneQR} alt="Send Money QR Code" className="w-24 h-24 md:w-28 md:h-28" />
              </div>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <QrCode className="h-3 w-3" /> Scan for details
              </span>
            </div>
          </div>
        </div>

        {/* Bank Transfer */}
        <div className="bg-background rounded-lg p-4 border">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-blue-600 p-1.5 rounded">
              <Building2 className="h-4 w-4 text-white" />
            </div>
            <h4 className="font-semibold">Bank Transfer</h4>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex flex-col">
              <span className="text-muted-foreground text-xs">Bank Name:</span>
              <span className="font-medium">NCBA BANK</span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground text-xs">Branch Code:</span>
              <span className="font-medium">216</span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground text-xs">Bank Code:</span>
              <span className="font-medium">07</span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground text-xs">Account Name:</span>
              <span className="font-medium">PATRICK KIMANTHI</span>
            </div>
            <div className="col-span-2 flex justify-between items-center p-2 bg-muted/50 rounded mt-2">
              <div>
                <p className="text-xs text-muted-foreground">Account Number:</p>
                <span className="font-bold text-lg">{accountNumber}</span>
              </div>
              <Button 
                variant={copiedItem === 'BankAccount' ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => copyToClipboard(accountNumber, 'BankAccount')}
              >
                {copiedItem === 'BankAccount' ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center pt-2 bg-yellow-50 dark:bg-yellow-950/30 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <strong>Important:</strong> Always use your <strong>full name</strong> or <strong>email address</strong> as the payment reference so we can credit your account automatically.
        </p>
      </CardContent>
    </Card>
  );
};

export default PaymentInstructionsCard;
