import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import FlagshipPrograms from "@/components/FlagshipPrograms";
import CareerPathway from "@/components/CareerPathway";
import About from "@/components/About";
import RemoteAccelerator from "@/components/RemoteAccelerator";
import WhyChooseUs from "@/components/WhyChooseUs";
import Partners from "@/components/Partners";
import Courses from "@/components/Courses";
import CertificationSection from "@/components/CertificationSection";
import Testimonials from "@/components/Testimonials";
import FAQ from "@/components/FAQ";
import Apply from "@/components/Apply";
import FinalCTA from "@/components/FinalCTA";
import Contact from "@/components/Contact";
import Newsletter from "@/components/Newsletter";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <FlagshipPrograms />
        <CareerPathway />
        <About />
        <RemoteAccelerator />
        <WhyChooseUs />
        <Partners />
        <Courses />
        <CertificationSection />
        <Testimonials />
        <FAQ />
        <Apply />
        <FinalCTA />
        <Contact />
        <Newsletter />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
