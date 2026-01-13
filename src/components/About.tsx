import { CheckCircle, Award, Users, BookOpen } from "lucide-react";
import ceoImage from "@/assets/ceo-patrick-kimanthi.jpg";

const About = () => {
  const features = [
    { icon: Award, text: "Industry-Recognized Certifications" },
    { icon: Users, text: "Expert Instructors" },
    { icon: BookOpen, text: "Comprehensive Curriculum" },
    { icon: CheckCircle, text: "Practical Skills Training" },
  ];

  return (
    <section id="about" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* About Institute */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-4">
            About <span className="text-primary">Microsoft Training Institute</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            We are Africa's leading fully online training institute, dedicated to empowering individuals with 
            cutting-edge digital skills and professional certifications that open doors to global opportunities.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-card rounded-xl p-6 border border-border shadow-sm hover:shadow-md transition-shadow text-center"
            >
              <div className="inline-flex items-center justify-center w-14 h-14 bg-primary/10 rounded-full mb-4">
                <feature.icon className="h-7 w-7 text-primary" />
              </div>
              <p className="font-medium text-foreground">{feature.text}</p>
            </div>
          ))}
        </div>

        {/* Founder Section */}
        <div className="bg-gradient-to-r from-primary/5 via-muted to-secondary/5 rounded-2xl p-8 md:p-12">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="order-2 md:order-1">
              <div className="inline-block bg-secondary/10 text-secondary font-medium px-4 py-1 rounded-full text-sm mb-4">
                Founder & CEO
              </div>
              <h3 className="text-2xl md:text-3xl font-heading font-bold text-foreground mb-4">
                Patrick Kimanthi
              </h3>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  Patrick Kimanthi is a visionary leader and technology enthusiast who founded Microsoft Training 
                  Institute Africa with a mission to bridge the digital skills gap across the continent.
                </p>
                <p>
                  With over a decade of experience in IT education and a passion for empowering young Africans, 
                  Patrick recognized the need for accessible, quality technical training that could be delivered 
                  entirely online, reaching students in remote areas who previously had no access to such opportunities.
                </p>
                <p>
                  His inspiration came from witnessing talented individuals held back by lack of formal training. 
                  Today, under his leadership, the institute has trained thousands of students across Africa, 
                  equipping them with skills in programming, cybersecurity, business management, and digital marketing.
                </p>
              </div>
              <blockquote className="mt-6 border-l-4 border-secondary pl-4 italic text-foreground">
                "Education is the most powerful tool to transform lives. Our goal is to make world-class 
                digital education accessible to every African, regardless of their location."
              </blockquote>
            </div>
            <div className="order-1 md:order-2 flex justify-center">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-br from-primary to-secondary rounded-2xl opacity-20 blur-xl" />
                <img
                  src={ceoImage}
                  alt="Patrick Kimanthi - Founder & CEO"
                  className="relative rounded-2xl w-full max-w-md object-cover shadow-2xl"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
