import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Bot,
  Cloud,
  Code2,
  BarChart3,
  ShieldCheck,
  Megaphone,
  MonitorPlay,
  Briefcase,
  GraduationCap,
  Users,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import heroTeam from "@/assets/hero-tech-team.jpg";

const trustBadges = [
  { icon: MonitorPlay, label: "Live Online & Physical Classes" },
  { icon: Briefcase, label: "Industry-Focused Curriculum" },
  { icon: Users, label: "Career Support & Mentorship" },
  { icon: GraduationCap, label: "Professional Certificate" },
];

const stats = [
  { value: 2500, suffix: "+", label: "Students Trained" },
  { value: 20, suffix: "+", label: "Technology Programs" },
  { value: 95, suffix: "%", label: "Student Satisfaction" },
  { value: 10, suffix: "+", label: "Industry Certifications" },
];

const floatingCards = [
  { icon: Bot, label: "AI Tools", pos: "top-4 -left-4 md:top-8 md:-left-10", delay: "0s" },
  { icon: Cloud, label: "Cloud Computing", pos: "top-1/3 -right-3 md:-right-8", delay: "0.8s" },
  { icon: Code2, label: "Software Engineering", pos: "bottom-28 -left-4 md:-left-12", delay: "1.6s" },
  { icon: BarChart3, label: "Data Analytics", pos: "bottom-8 right-2 md:right-4", delay: "0.4s" },
  { icon: ShieldCheck, label: "Cybersecurity", pos: "top-1/2 left-2 md:left-6", delay: "2.2s" },
  { icon: Megaphone, label: "Digital Marketing", pos: "bottom-1/3 -right-2 md:right-10", delay: "1.2s" },
];

const useCountUp = (target: number, active: boolean, duration = 1600) => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    let frame = 0;
    const total = Math.round(duration / 16);
    const id = setInterval(() => {
      frame += 1;
      const progress = 1 - Math.pow(1 - frame / total, 3);
      setValue(Math.round(target * progress));
      if (frame >= total) {
        setValue(target);
        clearInterval(id);
      }
    }, 16);
    return () => clearInterval(id);
  }, [target, active, duration]);
  return value;
};

const StatCounter = ({ value, suffix, label, active }: { value: number; suffix: string; label: string; active: boolean }) => {
  const count = useCountUp(value, active);
  return (
    <div>
      <div className="text-2xl md:text-3xl font-heading font-bold text-primary">
        {count.toLocaleString()}
        {suffix}
      </div>
      <div className="text-xs md:text-sm text-muted-foreground mt-1">{label}</div>
    </div>
  );
};

const Hero = () => {
  const statsRef = useRef<HTMLDivElement>(null);
  const [countersActive, setCountersActive] = useState(false);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setCountersActive(true),
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onScroll = () => setOffset(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToSection = (href: string) => {
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="home"
      className="relative lg:min-h-screen flex items-center overflow-hidden bg-gradient-to-b from-background via-background to-primary/5"
    >
      {/* Abstract background shapes */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-32 -left-24 w-[28rem] h-[28rem] rounded-full bg-primary/10 blur-3xl"
          style={{ transform: `translateY(${offset * 0.15}px)` }}
        />
        <div
          className="absolute top-1/3 -right-24 w-[32rem] h-[32rem] rounded-full bg-secondary/10 blur-3xl"
          style={{ transform: `translateY(${offset * -0.1}px)` }}
        />
        <div
          className="absolute bottom-0 left-1/3 w-96 h-96 rounded-full bg-accent/10 blur-3xl"
          style={{ transform: `translateY(${offset * 0.08}px)` }}
        />
        <svg className="absolute inset-0 w-full h-full opacity-[0.06]" aria-hidden="true">
          <defs>
            <pattern id="circuit" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M0 30h20v-20h20v40h20" fill="none" stroke="hsl(var(--primary))" strokeWidth="1" />
              <circle cx="20" cy="30" r="2.5" fill="hsl(var(--primary))" />
              <circle cx="40" cy="10" r="2.5" fill="hsl(var(--secondary))" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#circuit)" />
        </svg>
      </div>

      <div className="container mx-auto px-4 relative z-10 py-16 md:py-24">
        <div className="grid lg:grid-cols-[45fr_55fr] gap-12 lg:gap-10 items-center">
          {/* Left */}
          <div className="animate-fade-in text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 mb-6">
              <span className="h-2 w-2 rounded-full bg-secondary animate-pulse" />
              <span className="text-xs md:text-sm font-medium text-primary">
                Techno Panaly Institute of Technology
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl xl:text-6xl font-heading font-bold leading-[1.1] text-foreground mb-6">
              Build Your Future in{" "}
              <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                Artificial Intelligence
              </span>{" "}
              & Global Tech Careers
            </h1>

            <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-4 max-w-xl mx-auto lg:mx-0">
              Gain practical, industry-driven skills in Artificial Intelligence, Software Development,
              Cybersecurity, Data Science, Cloud Computing, Digital Marketing, Networking and other
              high-demand technologies.
            </p>
            <p className="text-sm md:text-base text-muted-foreground/90 mb-8 max-w-xl mx-auto lg:mx-0">
              Learn from experienced instructors, build real-world projects, earn professional
              certificates and prepare for global career opportunities.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <Button
                size="lg"
                onClick={() => scrollToSection("#apply")}
                className="w-full sm:w-auto bg-secondary text-secondary-foreground hover:bg-secondary/90 font-semibold px-8 py-6 text-base shadow-lg shadow-secondary/25 hover:shadow-xl hover:shadow-secondary/30 hover:-translate-y-0.5 transition-all group"
              >
                Apply Now
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => scrollToSection("#flagship")}
                className="w-full sm:w-auto border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground font-semibold px-8 py-6 text-base hover:-translate-y-0.5 transition-all"
              >
                Explore Programs
              </Button>
            </div>

            <ul className="grid sm:grid-cols-2 gap-y-3 gap-x-4 mb-10 text-left">
              {trustBadges.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10">
                    <Check className="h-3.5 w-3.5 text-accent" />
                  </span>
                  <span className="text-sm text-foreground/80 flex items-center gap-1.5">
                    <Icon className="h-4 w-4 text-primary/70 shrink-0" />
                    {label}
                  </span>
                </li>
              ))}
            </ul>

            <div ref={statsRef} className="grid grid-cols-2 md:grid-cols-4 gap-6 border-t border-border pt-6">
              {stats.map((s) => (
                <StatCounter key={s.label} {...s} active={countersActive} />
              ))}
            </div>
          </div>

          {/* Right */}
          <div className="relative animate-fade-in">
            <div className="absolute -inset-6 bg-gradient-to-tr from-primary/20 via-transparent to-secondary/20 blur-3xl rounded-[3rem]" />
            <div className="relative rounded-[2rem] overflow-hidden border border-border/60 shadow-2xl">
              <img
                src={heroTeam}
                alt="Students and young professionals collaborating on laptops in a modern technology classroom"
                width={1200}
                height={1408}
                className="w-full h-[420px] md:h-[560px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/40 via-transparent to-transparent" />
            </div>

            {floatingCards.map(({ icon: Icon, label, pos, delay }) => (
              <div
                key={label}
                style={{ animationDelay: delay }}
                className={`absolute ${pos} animate-float rounded-xl border border-border/50 bg-card/70 backdrop-blur-md px-3 py-2 shadow-lg flex items-center gap-2`}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-4 w-4 text-primary" />
                </span>
                <span className="text-xs font-semibold text-foreground whitespace-nowrap">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
