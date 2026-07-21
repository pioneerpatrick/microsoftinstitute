import { ArrowRight, MessageCircle, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";

const FinalCTA = () => {
  const scrollTo = (id: string) => document.querySelector(id)?.scrollIntoView({ behavior: "smooth" });
  return (
    <section className="py-20 bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground">
      <div className="container mx-auto px-4 text-center max-w-3xl">
        <h2 className="text-3xl md:text-5xl font-heading font-bold mb-5 leading-tight">
          Ready to Build Your <span className="text-secondary">Global Career?</span>
        </h2>
        <p className="text-lg text-primary-foreground/85 mb-8">
          Join hundreds of African professionals launching remote careers with AI and digital skills.
          Your next chapter starts today.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            size="lg"
            onClick={() => scrollTo("#apply")}
            className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold text-lg px-8 py-6 group"
          >
            Apply Now
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Button>
          <a
            href="https://wa.me/254723821798?text=Hi%20MTI%2C%20I%27d%20like%20to%20speak%20with%20an%20advisor."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold text-lg px-8 py-6 rounded-md transition-colors"
          >
            <MessageCircle className="h-5 w-5" />
            WhatsApp an Advisor
          </a>
          <a
            href="tel:+254723821798"
            className="inline-flex items-center justify-center gap-2 bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-semibold text-lg px-8 py-6 rounded-md transition-colors"
          >
            <PhoneCall className="h-5 w-5" />
            Talk to Us
          </a>
        </div>
      </div>
    </section>
  );
};

export default FinalCTA;
