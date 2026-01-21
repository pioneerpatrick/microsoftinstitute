import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Building2, CreditCard, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const PaymentDetailsCard = () => {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const paymentMethods = [
    {
      title: 'M-Pesa',
      icon: Smartphone,
      color: 'bg-green-500',
      details: [
        { label: 'Phone Number', value: '+254723821798' },
        { label: 'Name', value: 'PATRICK KIMANTHI' },
      ],
    },
    {
      title: 'M-Pesa Paybill',
      icon: CreditCard,
      color: 'bg-green-600',
      details: [
        { label: 'Paybill Number', value: '889100' },
        { label: 'Account Number', value: '9067620016' },
        { label: 'Name', value: 'PATRICK KIMANTHI' },
      ],
    },
    {
      title: 'Bank Transfer',
      icon: Building2,
      color: 'bg-blue-600',
      details: [
        { label: 'Bank Name', value: 'NCBA BANK' },
        { label: 'Account Number', value: '9067620016' },
        { label: 'Branch Code', value: '216' },
        { label: 'Bank Code', value: '07' },
        { label: 'Account Name', value: 'PATRICK KIMANTHI' },
      ],
    },
  ];

  return (
    <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CreditCard className="h-5 w-5 text-primary" />
          Payment Details
          <Badge variant="secondary" className="ml-2">Share with Students</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {paymentMethods.map((method, index) => (
            <div key={index} className="bg-background rounded-lg p-4 border">
              <div className="flex items-center gap-2 mb-3">
                <div className={`${method.color} p-2 rounded-lg`}>
                  <method.icon className="h-4 w-4 text-white" />
                </div>
                <h4 className="font-semibold">{method.title}</h4>
              </div>
              <div className="space-y-2">
                {method.details.map((detail, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{detail.label}:</span>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">{detail.value}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => copyToClipboard(detail.value, detail.label)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4 text-center">
          Students can use any of these methods to make payments. Always include student name/ID as reference.
        </p>
      </CardContent>
    </Card>
  );
};

export default PaymentDetailsCard;