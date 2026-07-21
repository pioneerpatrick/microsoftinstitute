import { FileText, Linkedin, FolderOpen, MessageSquare, DollarSign, Bot, Compass, Handshake } from "lucide-react";

const items = [
  { icon: FileText, title: "CV Development", desc: "ATS-ready resumes tailored to remote roles." },
  { icon: Linkedin, title: "LinkedIn Optimization", desc: "Profiles that attract global recruiters." },
  { icon: FolderOpen, title: "Portfolio Building", desc: "Showcase real projects employers trust." },
  { icon: MessageSquare, title: "Interview Prep", desc: "Mock interviews with expert feedback." },
  { icon: DollarSign, title: "Freelancing Training", desc: "Upwork, Fiverr & Toptal playbooks." },
  { icon: Bot, title: "AI Productivity Toolkit", desc: "Copilot, ChatGPT & automation stacks." },
  { icon: Compass, title: "Career Coaching", desc: "1:1 guidance from remote work coaches." },
  { icon: Handshake, title: "Employer Networking", desc: "Access to our hiring partner network." },
];

const RemoteAccelerator = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14 max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-4">
            We Don't Just Teach. <span className="text-secondary">We Prepare You for Work.</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            The Remote Work Accelerator is included with every flagship program — everything you need
            to land clients and remote jobs after graduation.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {items.map((it, i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-xl p-6 hover:border-secondary/40 hover:shadow-lg transition-all duration-300"
            >
              <div className="w-11 h-11 rounded-lg bg-secondary/10 flex items-center justify-center mb-4">
                <it.icon className="h-5 w-5 text-secondary" />
              </div>
              <h3 className="font-heading font-semibold text-foreground mb-2">{it.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{it.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RemoteAccelerator;
