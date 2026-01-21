import { useState } from "react";
import { Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Newsletter = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("newsletter_subscribers").insert({
        email: email,
      });

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Already Subscribed",
            description: "This email is already subscribed to our newsletter.",
          });
        } else {
          throw error;
        }
      } else {
        // Send welcome email
        try {
          await supabase.functions.invoke("send-newsletter-welcome", {
            body: { email },
          });
        } catch (emailError) {
          console.error("Welcome email sending failed:", emailError);
        }

        setEmail("");
        toast({
          title: "Subscribed!",
          description: "Thank you for subscribing! Check your email for a welcome message.",
        });
      }
    } catch (error) {
      console.error("Error subscribing:", error);
      toast({
        title: "Subscription Failed",
        description: "There was an error. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
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
