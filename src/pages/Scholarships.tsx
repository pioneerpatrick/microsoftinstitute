import { useState } from "react";
import { GraduationCap, Brain, Code, Shield, Monitor, Lightbulb, Building2, Heart, Globe, Users, Phone, Mail, ArrowRight, Quote, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { allCourseNames } from "@/data/courses";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const testimonials = [
  {
    name: "James K.",
    role: "Software Development Student",
    image: "/images/testimonial-james.jpg",
    quote: "The scholarship gave me a chance to study programming when I could not afford school fees. Today I am building real applications.",
  },
  {
    name: "Mary A.",
    role: "ICT Support Graduate",
    image: "/images/testimonial-mary.jpg",
    quote: "Microsoft Institute Africa changed my life. I now work in the technology sector thanks to the opportunity I received.",
  },
  {
    name: "David O.",
    role: "Cybersecurity Student",
    image: "/images/testimonial-david.jpg",
    quote: "I never imagined I could study cybersecurity. The sponsorship program opened doors I thought were closed forever.",
  },
  {
    name: "Grace W.",
    role: "Digital Marketing Graduate",
    image: "/images/testimonial-grace.jpg",
    quote: "From a small village to a digital professional — this scholarship made my dream a reality. I am forever grateful.",
  },
];

const trainingAreas = [
  { icon: Brain, label: "Artificial Intelligence" },
  { icon: Code, label: "Programming & Software Development" },
  { icon: Monitor, label: "ICT Support" },
  { icon: Shield, label: "Cybersecurity" },
  { icon: Lightbulb, label: "Digital Skills for the Modern Workplace" },
];

const partners = [
  { icon: Building2, label: "Government Programs", desc: "National and county government digital literacy initiatives" },
  { icon: Globe, label: "NGOs", desc: "Non-governmental organizations focused on youth empowerment" },
  { icon: Users, label: "Private Companies", desc: "Corporate social responsibility and talent pipeline programs" },
  { icon: Heart, label: "Philanthropic Organizations", desc: "Foundations dedicated to education and opportunity" },
];

const courses = allCourseNames;

const Scholarships = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    email: "",
    course: "",
    education_level: "",
    statement: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!formData.course || !formData.education_level) {
      toast({ title: "Missing Fields", description: "Please select a course and education level.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    try {
      const { error } = await supabase.from("scholarship_applications").insert([formData]);
      if (error) throw error;

      // Send confirmation email
      try {
        await supabase.functions.invoke('send-scholarship-email', {
          body: {
            fullName: formData.full_name,
            email: formData.email,
            phone: formData.phone,
            course: formData.course,
            educationLevel: formData.education_level,
            statement: formData.statement,
          },
        });
      } catch (emailErr) {
        console.error("Email sending failed (non-blocking):", emailErr);
      }

      setIsSubmitted(true);
      toast({ title: "Application Submitted!", description: "We will review your scholarship application and contact you soon." });
      setFormData({ full_name: "", phone: "", email: "", course: "", education_level: "", statement: "" });
    } catch (err: any) {
      toast({ title: "Submission Failed", description: err.message || "Please try again later.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const scrollToForm = () => {
    document.getElementById("scholarship-form")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/scholarship-hero.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/75 to-secondary/60" />
        <div className="relative z-10 container mx-auto px-4 text-center py-20">
          <div className="inline-flex items-center gap-2 bg-secondary/20 backdrop-blur-sm border border-secondary/30 rounded-full px-5 py-2 mb-6">
            <Sparkles className="h-4 w-4 text-secondary" />
            <span className="text-sm font-medium text-secondary">Changing Lives Through Technology Education</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-primary-foreground mb-6 leading-tight max-w-4xl mx-auto">
            Scholarships & Student Sponsorship Program
          </h1>
          <p className="text-xl md:text-2xl text-primary-foreground/90 mb-10 max-w-2xl mx-auto">
            Empowering the next generation of African digital innovators.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={scrollToForm} className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold text-lg px-8 py-6">
              <GraduationCap className="mr-2 h-5 w-5" />
              Apply for Scholarship
            </Button>
            <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 text-lg px-8 py-6" asChild>
              <a href="tel:+254711577338">
                <Phone className="mr-2 h-5 w-5" />
                Contact Admissions
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* About the Program */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">About the Sponsorship Program</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Microsoft Institute Africa works with <strong className="text-foreground">government organizations, NGOs, and private companies</strong> to sponsor students who are financially disadvantaged but motivated to learn modern digital ICT skills. We believe that <strong className="text-foreground">equal opportunity and digital empowerment</strong> can transform African youth into tomorrow's tech leaders.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {trainingAreas.map((area) => (
              <Card key={area.label} className="group hover:shadow-lg transition-all duration-300 border-border hover:border-primary/30 text-center">
                <CardContent className="p-6 flex flex-col items-center gap-4">
                  <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <area.icon className="h-7 w-7 text-primary" />
                  </div>
                  <p className="font-semibold text-foreground text-sm">{area.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Partner Sponsorship */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Our Sponsorship Partners</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We collaborate with leading organizations to provide full and partial scholarships to deserving students.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {partners.map((p) => (
              <Card key={p.label} className="group hover:shadow-xl transition-all duration-300 border-border hover:border-secondary/40">
                <CardContent className="p-8 text-center">
                  <div className="h-16 w-16 mx-auto rounded-2xl bg-secondary/10 flex items-center justify-center mb-5 group-hover:bg-secondary/20 transition-colors">
                    <p.icon className="h-8 w-8 text-secondary" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">{p.label}</h3>
                  <p className="text-sm text-muted-foreground">{p.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-muted-foreground mb-4">Are you an organization looking to empower the next generation of tech professionals?</p>
            <Button variant="outline" size="lg" asChild>
              <a href="mailto:admissions@microsoftinstitute.africa">
                <Mail className="mr-2 h-4 w-4" />
                Partner With Us
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Student Testimonials */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Student Success Stories</h2>
            <p className="text-lg text-muted-foreground">Hear from students whose lives were changed through our scholarship program.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {testimonials.map((t) => (
              <Card key={t.name} className="overflow-hidden hover:shadow-xl transition-all duration-300 border-border">
                <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row">
                    <div className="sm:w-32 sm:h-auto h-48 flex-shrink-0">
                      <img src={t.image} alt={t.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-6 flex-1">
                      <Quote className="h-6 w-6 text-primary/30 mb-3" />
                      <p className="text-muted-foreground italic mb-4 leading-relaxed">"{t.quote}"</p>
                      <div>
                        <p className="font-bold text-foreground">{t.name}</p>
                        <p className="text-sm text-primary">{t.role}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Encouragement Section */}
      <section className="py-20 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <Sparkles className="h-10 w-10 mx-auto mb-6 text-secondary" />
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Your Dream Is Valid</h2>
          <p className="text-xl leading-relaxed text-primary-foreground/90">
            "Your financial situation should never stop your dream of becoming a technology professional. Apply today and start your journey into the digital world."
          </p>
        </div>
      </section>

      {/* Scholarship Application Form */}
      <section id="scholarship-form" className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Apply for a Scholarship</h2>
              <p className="text-muted-foreground">Complete the form below and our admissions team will review your application.</p>
            </div>

            {isSubmitted ? (
              <Card className="text-center p-10">
                <CardContent className="flex flex-col items-center gap-4">
                  <CheckCircle2 className="h-16 w-16 text-secondary" />
                  <h3 className="text-2xl font-bold text-foreground">Application Received!</h3>
                  <p className="text-muted-foreground">Thank you for applying. Our team will review your application and contact you within 7 business days.</p>
                  <Button onClick={() => setIsSubmitted(false)} variant="outline" className="mt-4">Submit Another Application</Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="full_name">Full Name *</Label>
                        <Input id="full_name" name="full_name" placeholder="Your full name" required value={formData.full_name} onChange={handleChange} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number *</Label>
                        <Input id="phone" name="phone" type="tel" placeholder="+254..." required value={formData.phone} onChange={handleChange} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input id="email" name="email" type="email" placeholder="your@email.com" required value={formData.email} onChange={handleChange} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>Course Interested In *</Label>
                        <Select value={formData.course} onValueChange={(v) => setFormData({ ...formData, course: v })}>
                          <SelectTrigger><SelectValue placeholder="Select a course" /></SelectTrigger>
                          <SelectContent>
                            {courses.map((c) => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Education Level *</Label>
                        <Select value={formData.education_level} onValueChange={(v) => setFormData({ ...formData, education_level: v })}>
                          <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Primary">Primary</SelectItem>
                            <SelectItem value="Secondary / KCSE">Secondary / KCSE</SelectItem>
                            <SelectItem value="Certificate">Certificate</SelectItem>
                            <SelectItem value="Diploma">Diploma</SelectItem>
                            <SelectItem value="Degree">Degree</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="statement">Why do you deserve this scholarship? *</Label>
                      <Textarea id="statement" name="statement" placeholder="Tell us about your passion for technology and why you need financial support..." required rows={5} value={formData.statement} onChange={handleChange} />
                    </div>

                    <Button type="submit" size="lg" className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold text-lg py-6" disabled={isSubmitting}>
                      {isSubmitting ? "Submitting..." : "Apply for Scholarship"}
                      {!isSubmitting && <ArrowRight className="ml-2 h-5 w-5" />}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Start Your Digital Career Today</h2>
          <p className="text-xl text-primary-foreground/80 mb-10 max-w-xl mx-auto">Take the first step towards a brighter future in technology.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            <Button size="lg" onClick={scrollToForm} className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold text-lg px-8 py-6">
              Apply for Scholarship
            </Button>
            <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 text-lg px-8 py-6" asChild>
              <a href="mailto:admissions@microsoftinstitute.africa">
                <Mail className="mr-2 h-5 w-5" />
                Contact Admissions
              </a>
            </Button>
          </div>
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center text-primary-foreground/80">
            <a href="tel:+254711577338" className="flex items-center gap-2 hover:text-secondary transition-colors">
              <Phone className="h-5 w-5" /> +254 711 577 338
            </a>
            <a href="mailto:admissions@microsoftinstitute.africa" className="flex items-center gap-2 hover:text-secondary transition-colors">
              <Mail className="h-5 w-5" /> admissions@microsoftinstitute.africa
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Scholarships;
