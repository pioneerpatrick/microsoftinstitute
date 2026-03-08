import { useState } from "react";
import { Phone, Mail, MapPin, Send, Clock, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Contact = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("contacts").insert({
        name: formData.name,
        email: formData.email,
        subject: formData.subject || "Website Inquiry",
        message: formData.message,
      });

      if (error) throw error;

      // Send confirmation emails
      try {
        await supabase.functions.invoke("send-contact-email", {
          body: {
            name: formData.name,
            email: formData.email,
            subject: formData.subject || "Website Inquiry",
            message: formData.message,
          },
        });
      } catch (emailError) {
        console.error("Email sending failed:", emailError);
      }

      setFormData({ name: "", email: "", subject: "", message: "" });
      toast({
        title: "Message Sent!",
        description: "Thank you for reaching out. Check your email for confirmation. We'll get back to you soon.",
      });
    } catch (error) {
      console.error("Error submitting contact form:", error);
      toast({
        title: "Submission Failed",
        description: "There was an error sending your message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const contactInfo = [
    {
      icon: Phone,
      title: "Call Us",
      details: ["+254 711 577 338"],
      link: "tel:+254711577338",
    },
    {
      icon: Mail,
      title: "Email Us",
      details: ["admissions@microsoftinstitute.africa"],
      link: "mailto:admissions@microsoftinstitute.africa",
    },
    {
      icon: Clock,
      title: "Office Hours",
      details: ["Mon - Fri: 8:00 AM - 5:00 PM", "Sat: 9:00 AM - 1:00 PM"],
      link: null,
    },
    {
      icon: MapPin,
      title: "Location",
      details: ["100% Online Institution", "Serving All of Africa"],
      link: null,
    },
  ];

  return (
    <section id="contact" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-6">
            <MessageCircle className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-4">
            Get in <span className="text-primary">Touch</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Have questions about our programs? Our admissions team is here to help you 
            start your educational journey.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* Contact Info */}
          <div>
            <div className="grid sm:grid-cols-2 gap-6">
              {contactInfo.map((item, index) => (
                <div
                  key={index}
                  className="bg-card rounded-xl p-6 border border-border hover:shadow-lg hover:border-primary/20 transition-all duration-300"
                >
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg mb-4">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-heading font-semibold text-foreground mb-2">{item.title}</h3>
                  {item.details.map((detail, detailIndex) => (
                    item.link ? (
                      <a
                        key={detailIndex}
                        href={item.link}
                        className="block text-muted-foreground hover:text-primary transition-colors text-sm break-all"
                      >
                        {detail}
                      </a>
                    ) : (
                      <p key={detailIndex} className="text-muted-foreground text-sm">
                        {detail}
                      </p>
                    )
                  ))}
                </div>
              ))}
            </div>

            {/* Quick Links */}
            <div className="mt-8 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-xl p-6 border border-primary/10">
              <h3 className="font-heading font-semibold text-foreground mb-4">Quick Connect</h3>
              <p className="text-sm text-muted-foreground mb-4">Need immediate assistance? Reach us directly:</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href="https://wa.me/254711577338"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 bg-accent text-accent-foreground px-5 py-3 rounded-lg font-medium hover:opacity-90 transition-all shadow-sm hover:shadow-md flex-1"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp Us
                </a>
                <a
                  href="tel:+254711577338"
                  className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-lg font-medium hover:opacity-90 transition-all shadow-sm hover:shadow-md flex-1"
                >
                  <Phone className="h-4 w-4" />
                  Call Now
                </a>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-card rounded-2xl p-8 border border-border shadow-lg">
            <h3 className="text-xl font-heading font-semibold text-foreground mb-2">
              Send Us a Message
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Fill out the form below and we'll get back to you within 24 hours.
            </p>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label htmlFor="name" className="text-foreground">Your Name *</Label>
                <Input
                  id="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="Enter your name"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="contactEmail" className="text-foreground">Email Address *</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="Enter your email"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="subject" className="text-foreground">Subject</Label>
                <Input
                  id="subject"
                  type="text"
                  value={formData.subject}
                  onChange={(e) => handleChange("subject", e.target.value)}
                  placeholder="What is this about?"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="message" className="text-foreground">Message *</Label>
                <Textarea
                  id="message"
                  required
                  value={formData.message}
                  onChange={(e) => handleChange("message", e.target.value)}
                  placeholder="Type your message here..."
                  className="mt-2 min-h-[120px]"
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-5"
              >
                {isSubmitting ? (
                  "Sending..."
                ) : (
                  <>
                    Send Message
                    <Send className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
