import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, GraduationCap, Search } from "lucide-react";
import logo from "@/assets/logo.png";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  const isLMSRoute = location.pathname.startsWith('/lms');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="Techno Panaly Institute of Technology" className="h-12 w-auto" />
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="text-center max-w-lg">
          {/* 404 Illustration */}
          <div className="relative mb-8">
            <div className="text-[150px] font-bold text-primary/10 leading-none select-none">
              404
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Search className="h-20 w-20 text-primary/50" />
            </div>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Page Not Found
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Oops! The page you're looking for doesn't exist or has been moved.
            {isLMSRoute && " It might be a course that's no longer available."}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button onClick={() => window.history.back()} variant="outline" size="lg">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
            
            {isLMSRoute ? (
              <Link to="/lms/dashboard">
                <Button size="lg">
                  <GraduationCap className="h-4 w-4 mr-2" />
                  Go to Dashboard
                </Button>
              </Link>
            ) : (
              <Link to="/">
                <Button size="lg">
                  <Home className="h-4 w-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
            )}
          </div>

          {/* Quick Links */}
          <div className="mt-12 pt-8 border-t">
            <p className="text-sm text-muted-foreground mb-4">Or try one of these:</p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link to="/" className="text-sm text-primary hover:underline">
                Homepage
              </Link>
              <span className="text-muted-foreground">•</span>
              <Link to="/lms/catalog" className="text-sm text-primary hover:underline">
                Course Catalog
              </Link>
              <span className="text-muted-foreground">•</span>
              <Link to="/lms/login" className="text-sm text-primary hover:underline">
                LMS Login
              </Link>
              <span className="text-muted-foreground">•</span>
              <a href="/#contact" className="text-sm text-primary hover:underline">
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Techno Panaly Institute of Technology. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default NotFound;
