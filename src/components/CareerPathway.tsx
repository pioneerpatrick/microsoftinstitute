import { UserPlus, Video, FolderKanban, Award, Compass, Users, Rocket } from "lucide-react";

const steps = [
  { icon: UserPlus, title: "Enroll", desc: "Pick a program & join a cohort" },
  { icon: Video, title: "Learn Live", desc: "Instructor-led online classes" },
  { icon: FolderKanban, title: "Build Projects", desc: "Real portfolio work" },
  { icon: Award, title: "Earn Certificate", desc: "Recognized credential" },
  { icon: Compass, title: "Career Coaching", desc: "CV, LinkedIn, interviews" },
  { icon: Users, title: "Employer Network", desc: "Global hiring partners" },
  { icon: Rocket, title: "Launch Career", desc: "Remote job or freelance" },
];

const CareerPathway = () => {
  return (
    <section className="py-20 bg-muted/40">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14 max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-4">
            Your <span className="text-primary">Career Pathway</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            A step-by-step journey from your first class to your first remote paycheck.
          </p>
        </div>

        <div className="relative">
          <div className="hidden lg:block absolute top-8 left-[7%] right-[7%] h-0.5 bg-gradient-to-r from-primary via-secondary to-accent opacity-30" />
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-6 relative">
            {steps.map((s, i) => (
              <div key={i} className="flex flex-col items-center text-center group">
                <div className="w-16 h-16 rounded-full bg-background border-2 border-primary/20 flex items-center justify-center shadow-sm group-hover:border-secondary group-hover:scale-110 transition-all duration-300 mb-3 relative z-10">
                  <s.icon className="h-7 w-7 text-primary group-hover:text-secondary transition-colors" />
                </div>
                <div className="text-xs font-semibold text-muted-foreground mb-1">STEP {i + 1}</div>
                <h3 className="font-heading font-semibold text-foreground mb-1 text-sm">{s.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CareerPathway;
