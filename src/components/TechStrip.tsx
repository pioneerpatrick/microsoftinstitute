const technologies = [
  "Microsoft",
  "Azure",
  "Python",
  "GitHub",
  "Power BI",
  "Microsoft 365",
  "Excel",
  "Docker",
  "Canva",
  "ChatGPT",
];

const TechStrip = () => {
  const loop = [...technologies, ...technologies];

  return (
    <section className="py-12 border-y border-border bg-muted/20 overflow-hidden">
      <div className="container mx-auto px-4">
        <h2 className="text-center text-sm md:text-base font-heading font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-8">
          Technologies You'll Learn
        </h2>
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent z-10" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent z-10" />
        <div className="flex w-max gap-4 animate-marquee hover:[animation-play-state:paused]">
          {loop.map((tech, i) => (
            <div
              key={`${tech}-${i}`}
              className="flex items-center rounded-xl border border-border bg-card px-6 py-3 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 hover:border-primary/40 transition-all"
            >
              <span className="font-heading font-semibold text-foreground whitespace-nowrap">{tech}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TechStrip;
