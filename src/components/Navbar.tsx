import { useState } from "react";
import { Menu, X, Phone, Mail, UserCog, GraduationCap } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isHomePage = location.pathname === "/";

  const navLinks = [
    { name: "Home", href: "#home" },
    { name: "Programs", href: "#flagship" },
    { name: "About", href: "#about" },
    { name: "Full Catalog", href: "#courses" },
    { name: "Scholarships", href: "/scholarships", isPage: true },
    { name: "Contact", href: "#contact" },
  ];

  const scrollToSection = (href: string) => {
    if (!isHomePage) {
      // Navigate to home page with hash
      navigate("/" + href);
      setIsOpen(false);
      return;
    }
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
    setIsOpen(false);
  };

  return (
    <>
      {/* Top Bar */}
      <div className="bg-primary text-primary-foreground py-2 px-4">
        <div className="container mx-auto flex flex-wrap justify-center md:justify-between items-center text-sm gap-2">
          <div className="flex items-center gap-2 sm:gap-4">
            <a href="tel:+254723821798" className="flex items-center gap-1 hover:text-secondary transition-colors" title="+254 723 821 798">
              <Phone className="h-4 w-4" />
              <span className="hidden sm:inline">+254 723 821 798</span>
            </a>
            <a href="mailto:info@microsoftinstitute.africa" className="flex items-center gap-1 hover:text-secondary transition-colors" title="info@microsoftinstitute.africa">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">info@microsoftinstitute.africa</span>
            </a>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden md:block">Quest for Excellence</span>
            <Link 
              to="/lms/dashboard" 
              className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-md font-medium transition-all duration-200" 
              title="Student Portal"
            >
              <GraduationCap className="h-4 w-4" />
              <span>LMS</span>
            </Link>
            <Link 
              to="/auth" 
              className="flex items-center gap-1.5 bg-secondary/20 hover:bg-secondary/40 px-3 py-1.5 rounded-md font-medium transition-all duration-200" 
              title="Admin Login"
            >
              <UserCog className="h-4 w-4" />
              <span>Admin</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <nav className="bg-background/95 backdrop-blur-md sticky top-0 z-50 shadow-sm border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3">
              <img src={logo} alt="Microsoft Training Institute" className="h-16 w-auto" />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) =>
                'isPage' in link && link.isPage ? (
                  <Link
                    key={link.name}
                    to={link.href}
                    className="text-foreground hover:text-primary font-medium transition-colors"
                  >
                    {link.name}
                  </Link>
                ) : (
                  <button
                    key={link.name}
                    onClick={() => scrollToSection(link.href)}
                    className="text-foreground hover:text-primary font-medium transition-colors"
                  >
                    {link.name}
                  </button>
                )
              )}
              <Button
                onClick={() => scrollToSection("#apply")}
                className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold px-6"
              >
                Apply Now
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 text-foreground"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {isOpen && (
            <div className="md:hidden py-4 border-t border-border">
              {navLinks.map((link) =>
                'isPage' in link && link.isPage ? (
                  <Link
                    key={link.name}
                    to={link.href}
                    className="block w-full text-left py-3 px-4 text-foreground hover:bg-muted transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    {link.name}
                  </Link>
                ) : (
                  <button
                    key={link.name}
                    onClick={() => scrollToSection(link.href)}
                    className="block w-full text-left py-3 px-4 text-foreground hover:bg-muted transition-colors"
                  >
                    {link.name}
                  </button>
                )
              )}
              <div className="px-4 pt-4">
                <Button
                  onClick={() => scrollToSection("#apply")}
                  className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold"
                >
                  Apply Now
                </Button>
              </div>
            </div>
          )}
        </div>
      </nav>
    </>
  );
};

export default Navbar;
