import { Phone, Mail, MapPin } from "lucide-react";
import logo from "@/assets/logo.png";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const quickLinks = [
    { name: "Home", href: "#home" },
    { name: "Flagship Programs", href: "#flagship" },
    { name: "About Us", href: "#about" },
    { name: "Full Catalog", href: "#courses" },
    { name: "Apply Now", href: "#apply" },
    { name: "Contact", href: "#contact" },
  ];

  const courses = [
    "Virtual Assistant with AI",
    "AI Digital Marketing",
    "Data Analytics & Power BI",
    "Graphic Design with AI",
    "Microsoft 365 Administration",
    "Cyber Security Fundamentals",
  ];

  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="lg:col-span-1">
            <img src={logo} alt="Techno Panaly Institute of Technology" className="h-20 w-auto mb-4 rounded-xl" />
            <p className="text-primary-foreground/80 text-sm leading-relaxed mb-4">
              Africa's Remote Work & AI Skills Academy — empowering learners with the AI,
              digital, and remote work skills global employers hire for.
            </p>
            <p className="text-secondary font-semibold italic">"Quest for Excellence"</p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-heading font-semibold text-lg mb-4">Quick Links</h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <button
                    onClick={() => scrollToSection(link.href)}
                    className="text-primary-foreground/80 hover:text-secondary transition-colors text-sm"
                  >
                    {link.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Popular Courses */}
          <div>
            <h3 className="font-heading font-semibold text-lg mb-4">Popular Courses</h3>
            <ul className="space-y-2">
              {courses.map((course) => (
                <li key={course}>
                  <button
                    onClick={() => scrollToSection("#courses")}
                    className="text-primary-foreground/80 hover:text-secondary transition-colors text-sm"
                  >
                    {course}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-heading font-semibold text-lg mb-4">Contact Us</h3>
            <ul className="space-y-4">
              <li>
                <a
                  href="tel:+254723821798"
                  className="flex items-center gap-3 text-primary-foreground/80 hover:text-secondary transition-colors"
                >
                  <Phone className="h-4 w-4 text-secondary" />
                  <span className="text-sm">+254 723 821 798</span>
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/254723821798"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-primary-foreground/80 hover:text-secondary transition-colors"
                >
                  <Phone className="h-4 w-4 text-secondary" />
                  <span className="text-sm">WhatsApp: 0723 821 798</span>
                </a>
              </li>
              <li>
                <a
                  href="mailto:info@microsoftinstitute.africa"
                  className="flex items-center gap-3 text-primary-foreground/80 hover:text-secondary transition-colors"
                >
                  <Mail className="h-4 w-4 text-secondary" />
                  <span className="text-sm break-all">info@microsoftinstitute.africa</span>
                </a>
              </li>
              <li className="flex items-start gap-3 text-primary-foreground/80">
                <MapPin className="h-4 w-4 text-secondary mt-0.5" />
                <span className="text-sm">100% Online Institution<br />Serving All of Africa</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-primary-foreground/10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-primary-foreground/70 text-sm text-center md:text-left">
              © {currentYear} Techno Panaly Institute of Technology. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm">
              <a href="#" className="text-primary-foreground/70 hover:text-secondary transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="text-primary-foreground/70 hover:text-secondary transition-colors">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
