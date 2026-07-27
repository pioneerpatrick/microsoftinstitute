import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const categories = ["AI", "Programming", "Business", "Cybersecurity", "Cloud", "Microsoft", "Design"];

const HeroSearch = () => {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string | null>(null);

  const handleSearch = (term: string) => {
    setQuery(term);
    document.querySelector("#courses")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative z-10 -mt-2 pb-14">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto rounded-2xl border border-border bg-card/80 backdrop-blur-md p-4 md:p-5 shadow-xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch(query);
            }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="What would you like to learn today?"
                aria-label="Search programs"
                className="pl-9 h-12"
              />
            </div>
            <Button type="submit" size="lg" className="h-12 px-8 font-semibold">
              Search
            </Button>
          </form>

          <div className="flex flex-wrap gap-2 mt-4">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setActive(c);
                  handleSearch(c);
                }}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all hover:-translate-y-0.5 ${
                  active === c
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-muted/40 text-muted-foreground hover:border-primary/40 hover:text-primary"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSearch;
