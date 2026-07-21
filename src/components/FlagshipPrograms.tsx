import { Sparkles, Briefcase, BarChart3, Palette, Cloud, Shield, Code2, Headphones, ArrowRight, Clock, Award } from "lucide-react";
import { Button } from "@/components/ui/button";

const programs = [
  {
    icon: Briefcase,
    name: "Virtual Assistant with AI",
    duration: "2 Months",
    fee: "KES 20,000",
    skills: ["Calendar & Email Management", "ChatGPT & Copilot", "Client Communication", "Notion & Trello"],
    outcome: "Work remotely with international clients as an AI‑powered VA.",
  },
  {
    icon: Sparkles,
    name: "AI Digital Marketing",
    duration: "3 Months",
    fee: "KES 30,000",
    skills: ["Meta & Google Ads", "SEO with AI", "Content Automation", "Analytics"],
    outcome: "Manage global brands or freelance as a remote marketer.",
  },
  {
    icon: BarChart3,
    name: "Data Analytics & Power BI",
    duration: "3 Months",
    fee: "KES 30,000",
    skills: ["Excel Advanced", "SQL", "Power BI Dashboards", "AI Data Insights"],
    outcome: "Get hired as a remote data analyst or BI consultant.",
  },
  {
    icon: Palette,
    name: "Graphic Design with AI",
    duration: "2 Months",
    fee: "KES 22,000",
    skills: ["Canva Pro", "Figma", "Midjourney & DALL·E", "Brand Systems"],
    outcome: "Design for global clients on Upwork, Fiverr & agencies.",
  },
  {
    icon: Cloud,
    name: "Microsoft 365 Administration",
    duration: "3 Months",
    fee: "KES 28,000",
    skills: ["Teams & SharePoint", "Exchange", "Entra ID", "Copilot for M365"],
    outcome: "Support remote workforces globally as an M365 admin.",
  },
  {
    icon: Shield,
    name: "Cyber Security Fundamentals",
    duration: "2 Terms",
    fee: "KES 30,000",
    skills: ["Network Security", "Threat Analysis", "SOC Basics", "Compliance"],
    outcome: "Launch a career as a remote security analyst.",
  },
  {
    icon: Code2,
    name: "Web Design & No‑Code Development",
    duration: "2 Terms",
    fee: "KES 28,000",
    skills: ["HTML/CSS", "WordPress", "Webflow / Framer", "AI‑Assisted Coding"],
    outcome: "Build sites for remote clients and freelance globally.",
  },
  {
    icon: Headphones,
    name: "Remote Customer Support Specialist",
    duration: "2 Months",
    fee: "KES 18,000",
    skills: ["Zendesk & Intercom", "Chat & Voice Support", "CRM Tools", "AI Support Copilots"],
    outcome: "Get hired by global BPOs and SaaS companies from home.",
  },
];

const FlagshipPrograms = () => {
  const scrollTo = (id: string) => {
    document.querySelector(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="flagship" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-secondary/10 text-secondary font-medium px-4 py-1 rounded-full text-sm mb-4">
            <Sparkles className="h-4 w-4" />
            Remote Work Academy — Flagship Programs
          </div>
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-4">
            Programs built for the <span className="text-primary">remote economy</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Short, intensive, portfolio-driven programs. Every graduate leaves with a certificate,
            real projects, and career coaching to work with employers worldwide.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {programs.map((p, i) => (
            <article
              key={i}
              className="group bg-card border border-border rounded-2xl p-6 flex flex-col hover:-translate-y-1 hover:shadow-xl hover:border-primary/30 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <p.icon className="h-6 w-6 text-primary group-hover:text-primary-foreground" />
              </div>
              <h3 className="font-heading font-semibold text-lg text-foreground mb-2 leading-snug">
                {p.name}
              </h3>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{p.duration}</span>
                <span className="inline-flex items-center gap-1 text-secondary font-semibold">
                  <Award className="h-3 w-3" />{p.fee}
                </span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1 mb-4">
                {p.skills.map((s) => (
                  <li key={s} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-secondary shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
              <p className="text-sm text-foreground/80 italic mb-4 flex-1">{p.outcome}</p>
              <Button
                size="sm"
                onClick={() => scrollTo("#apply")}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground group"
              >
                Apply
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FlagshipPrograms;
