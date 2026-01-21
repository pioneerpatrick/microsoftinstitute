import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Smartphone, Building2, CreditCard, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const PaymentInstructionsCard = () => {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          How to Pay
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* M-Pesa */}
        <div className="bg-background rounded-lg p-4 border">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-green-500 p-1.5 rounded">
              <Smartphone className="h-4 w-4 text-white" />
            </div>
            <h4 className="font-semibold">M-Pesa</h4>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Phone:</span>
              <div className="flex items-center gap-1">
                <span className="font-medium">+254723821798</span>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyToClipboard('+254723821798', 'Phone')}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name:</span>
              <span className="font-medium">PATRICK KIMANTHI</span>
            </div>
          </div>
        </div>

        {/* Paybill */}
        <div className="bg-background rounded-lg p-4 border">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-green-600 p-1.5 rounded">
              <CreditCard className="h-4 w-4 text-white" />
            </div>
            <h4 className="font-semibold">M-Pesa Paybill</h4>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Paybill:</span>
              <div className="flex items-center gap-1">
                <span className="font-medium">889100</span>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyToClipboard('889100', 'Paybill')}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Account:</span>
              <div className="flex items-center gap-1">
                <span className="font-medium">9067620016</span>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyToClipboard('9067620016', 'Account')}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Bank */}
        <div className="bg-background rounded-lg p-4 border">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-blue-600 p-1.5 rounded">
              <Building2 className="h-4 w-4 text-white" />
            </div>
            <h4 className="font-semibold">Bank Transfer</h4>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bank:</span>
              <span className="font-medium">NCBA BANK</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Account:</span>
              <div className="flex items-center gap-1">
                <span className="font-medium">9067620016</span>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyToClipboard('9067620016', 'Account')}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Branch:</span>
              <span className="font-medium">216</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name:</span>
              <span className="font-medium">PATRICK KIMANTHI</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center pt-2">
          Always use your full name or student ID as the payment reference.
        </p>
      </CardContent>
    </Card>
  );
};

export default PaymentInstructionsCard;