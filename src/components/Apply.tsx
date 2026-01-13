import { useState } from "react";
import { Send, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const Apply = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    course: "",
    education: "",
  });

  const courses = [
    "Information Technology (IT)",
    "Computer Programming",
    "Web Design & Development",
    "Software Development",
    "Mobile App Development",
    "Computer Applications",
    "Computerized Accounting",
    "Database Management",
    "Networking",
    "Cyber Security",
    "Business Management",
    "Business Administration",
    "Human Resource Management",
    "Accounting & Finance",
    "Banking & Finance",
    "Entrepreneurship",
    "Project Management",
    "Digital Marketing",
    "Artificial Intelligence (AI)",
    "Office Administration",
    "Secretarial Studies",
    "Records & Information Management",
    "Virtual Assistance",
    "Business Communication Skills",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Create mailto link with form data
    const subject = encodeURIComponent(`Application for ${formData.course}`);
    const body = encodeURIComponent(
      `New Application\n\n` +
      `Full Name: ${formData.fullName}\n` +
      `Email: ${formData.email}\n` +
      `Phone: ${formData.phone}\n` +
      `Course: ${formData.course}\n` +
      `Education Level: ${formData.education}\n\n` +
      `Please process this application.`
    );

    // Open email client
    window.location.href = `mailto:admissions@microsoftinstitute.africa?subject=${subject}&body=${body}`;

    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      toast({
        title: "Application Initiated!",
        description: "Your email client should open. Please send the email to complete your application.",
      });
    }, 1000);
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (isSubmitted) {
    return (
      <section id="apply" className="py-20 bg-gradient-to-br from-primary to-primary/90">
        <div className="container mx-auto px-4">
          <div className="max-w-xl mx-auto text-center text-primary-foreground">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-accent rounded-full mb-6">
              <CheckCircle className="h-10 w-10 text-accent-foreground" />
            </div>
            <h2 className="text-3xl font-heading font-bold mb-4">Application Started!</h2>
            <p className="text-lg text-primary-foreground/90 mb-6">
              Your email client should have opened with your application details. 
              Please send the email to complete your application. We will respond within 24-48 hours.
            </p>
            <Button
              onClick={() => setIsSubmitted(false)}
              variant="outline"
              className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
            >
              Submit Another Application
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="apply" className="py-20 bg-gradient-to-br from-primary to-primary/90">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10 text-primary-foreground">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
              Apply Now
            </h2>
            <p className="text-lg text-primary-foreground/90">
              Take the first step towards your future. Fill in your details below and our admissions 
              team will contact you within 24-48 hours.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="bg-card rounded-2xl p-8 shadow-2xl">
            <div className="space-y-6">
              <div>
                <Label htmlFor="fullName" className="text-foreground">Full Name *</Label>
                <Input
                  id="fullName"
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => handleChange("fullName", e.target.value)}
                  placeholder="Enter your full name"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-foreground">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="Enter your email"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="phone" className="text-foreground">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="+254 XXX XXX XXX"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="course" className="text-foreground">Preferred Course *</Label>
                <Select
                  value={formData.course}
                  onValueChange={(value) => handleChange("course", value)}
                  required
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course} value={course}>
                        {course}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="education" className="text-foreground">Highest Education Level *</Label>
                <Select
                  value={formData.education}
                  onValueChange={(value) => handleChange("education", value)}
                  required
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select education level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kcpe">KCPE</SelectItem>
                    <SelectItem value="kcse">KCSE</SelectItem>
                    <SelectItem value="certificate">Certificate</SelectItem>
                    <SelectItem value="diploma">Diploma</SelectItem>
                    <SelectItem value="degree">Degree</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold py-6 text-lg"
              >
                {isSubmitting ? (
                  "Processing..."
                ) : (
                  <>
                    Submit Application
                    <Send className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};

export default Apply;
