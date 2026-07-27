import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { schoolCatalog } from "@/data/courses";

const Courses = () => {
  const [expandedSchool, setExpandedSchool] = useState<number | null>(0);

  const scrollToApply = () => {
    const element = document.querySelector("#apply");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section id="courses" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 id="courses-heading" className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-4">
            Full <span className="text-primary">Program Catalog</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Beyond our flagship Remote Work Academy programs, we offer a full catalog across ICT,
            Artificial Intelligence, Data, Cloud and Cyber Security. Fees are payable per term
            (1 Term = 3 Months).
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-4">
          {schoolCatalog.map((school, schoolIndex) => (
            <div
              key={schoolIndex}
              className="bg-card rounded-xl border border-border overflow-hidden shadow-sm"
            >
              <button
                onClick={() => setExpandedSchool(expandedSchool === schoolIndex ? null : schoolIndex)}
                className="w-full flex items-center justify-between p-6 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`${school.color} p-3 rounded-lg`}>
                    <school.icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-heading font-semibold text-foreground">
                      {school.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {school.courses.length} courses available
                      {school.note === "physical" && (
                        <span className="ml-2 inline-block bg-secondary/20 text-secondary text-xs font-semibold px-2 py-0.5 rounded">
                          In-Person / Physical Classes
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                {expandedSchool === schoolIndex ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </button>

              {expandedSchool === schoolIndex && (
                <div className="border-t border-border">
                  {school.note === "physical" && (
                    <div className="bg-secondary/10 border-b border-border px-6 py-3 text-sm text-secondary font-medium">
                      🏭 This department offers <strong>physical/in-person classes only</strong> at our campus. All courses are NITA (National Industrial Training Authority) certified.
                    </div>
                  )}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left py-3 px-6 text-sm font-medium text-muted-foreground">
                            Course
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                            Level
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                            Duration
                          </th>
                          <th className="text-right py-3 px-6 text-sm font-medium text-muted-foreground">
                            Fee (KES)
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {school.courses.map((course, courseIndex) => (
                          <tr
                            key={courseIndex}
                            className="border-t border-border hover:bg-muted/30 transition-colors"
                          >
                            <td className="py-4 px-6 text-foreground font-medium">
                              {course.name}
                            </td>
                            <td className="py-4 px-4">
                              <span className="inline-block bg-primary/10 text-primary text-xs font-medium px-2 py-1 rounded">
                                {course.level}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-muted-foreground">
                              {course.duration}
                            </td>
                            <td className="py-4 px-6 text-right text-secondary font-semibold">
                              {course.fee}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Button
            size="lg"
            onClick={scrollToApply}
            className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold px-8"
          >
            Apply for Any Course
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Courses;
