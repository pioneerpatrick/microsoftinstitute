import { useState } from "react";
import { Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const Newsletter = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Create mailto link for newsletter signup
    const subject = encodeURIComponent("Newsletter Subscription");
    const body = encodeURIComponent(
      `Please add me to your newsletter.\n\nEmail: ${email}`
    );

    window.location.href = `mailto:admissions@microsoftinstitute.africa?subject=${subject}&body=${body}`;

    setTimeout(() => {
      setIsSubmitting(false);
      setEmail("");
      toast({
        title: "Almost there!",
        description: "Please send the email to complete your subscription.",
      });
    }, 1000);
  };

  return (
    <section className="py-16 bg-secondary/10">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-secondary/20 rounded-full mb-6">
            <Mail className="h-7 w-7 text-secondary" />
          </div>
          <h2 className="text-2xl md:text-3xl font-heading font-bold text-foreground mb-3">
            Stay Updated
          </h2>
          <p className="text-muted-foreground mb-8">
            Subscribe to our newsletter for updates on new courses, scholarships, and learning tips.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold"
            >
              {isSubmitting ? "..." : (
                <>
                  Subscribe
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default Newsletter;
