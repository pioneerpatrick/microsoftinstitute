import { Bot, Users, Globe2, Award, Clock, Handshake, ShieldCheck, GraduationCap } from "lucide-react";

const reasons = [
  { icon: Bot, title: "AI‑Powered Learning", desc: "Every course integrates the latest AI tools." },
  { icon: Users, title: "Live Instructor‑Led", desc: "Real classes with experienced professionals." },
  { icon: Globe2, title: "Remote‑Career Focused", desc: "Curriculum built for global employers." },
  { icon: Award, title: "Recognized Certificate", desc: "Verifiable with a scannable QR code." },
  { icon: Clock, title: "Flexible Schedule", desc: "Evening & weekend cohorts available." },
  { icon: Handshake, title: "Employer Network", desc: "Direct access to hiring partners." },
  { icon: ShieldCheck, title: "Trusted Since Day One", desc: "Founder-led, quality‑first academy." },
  { icon: GraduationCap, title: "Career Coaching", desc: "Support long after you graduate." },
];

const WhyChooseUs = () => {
  return (
    <section className="py-20 bg-muted/40">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14 max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-4">
            Why Students <span className="text-primary">Choose Us</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Africa's most practical academy for AI, digital, and remote work skills.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {reasons.map((r, i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-xl p-6 text-center hover:-translate-y-1 hover:shadow-lg hover:border-primary/30 transition-all duration-300"
            >
              <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <r.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-foreground mb-2">{r.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{r.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUs;
