import { useState } from "react";
import { Monitor, Briefcase, TrendingUp, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const Courses = () => {
  const [expandedSchool, setExpandedSchool] = useState<number | null>(0);

  type SchoolCourse = { name: string; level: string; duration: string; fee: string };
  type School = {
    name: string;
    icon: any;
    color: string;
    courses: SchoolCourse[];
    note?: string;
  };

  const schools = [
    {
      name: "School of ICT & Digital Technology",
      icon: Monitor,
      color: "bg-primary",
      courses: [
        { name: "Information Technology (IT)", level: "Certificate", duration: "2 Terms", fee: "29,000" },
        { name: "Computer Programming", level: "Certificate", duration: "2 Terms", fee: "30,000" },
        { name: "Web Design & Development", level: "Certificate", duration: "2 Terms", fee: "28,000" },
        { name: "Software Development", level: "Craft", duration: "4 Terms", fee: "30,000" },
        { name: "Mobile App Development", level: "Certificate", duration: "2 Terms", fee: "30,000" },
        { name: "Computer Applications", level: "Artisan", duration: "1 Term", fee: "18,000" },
        { name: "Computerized Accounting", level: "Artisan", duration: "1 Term", fee: "22,000" },
        { name: "Database Management", level: "Certificate", duration: "2 Terms", fee: "27,000" },
        { name: "Networking (Theory-Based)", level: "Certificate", duration: "2 Terms", fee: "27,000" },
        { name: "Cyber Security (Fundamentals)", level: "Certificate", duration: "2 Terms", fee: "30,000" },
      ],
    },
    {
      name: "School of Business & Management",
      icon: Briefcase,
      color: "bg-secondary",
      courses: [
        { name: "Business Management", level: "Certificate", duration: "2 Terms", fee: "27,500" },
        { name: "Business Administration", level: "Certificate", duration: "2 Terms", fee: "28,000" },
        { name: "Human Resource Management", level: "Craft", duration: "2 Terms", fee: "29,000" },
        { name: "Accounting & Finance", level: "Certificate", duration: "2 Terms", fee: "29,000" },
        { name: "Banking & Finance", level: "Certificate", duration: "2 Terms", fee: "29,000" },
        { name: "Entrepreneurship", level: "Certificate", duration: "1 Term", fee: "22,000" },
        { name: "Project Management", level: "Certificate", duration: "1 Term", fee: "27,000" },
      ],
    },
    {
      name: "Professional Courses",
      icon: TrendingUp,
      color: "bg-accent",
      courses: [
        { name: "Digital Marketing", level: "Professional", duration: "Flexible", fee: "30,000" },
        { name: "Artificial Intelligence (AI)", level: "Professional", duration: "Flexible", fee: "60,000" },
      ],
    },
    {
      name: "Education, Administration & Office Skills",
      icon: FileText,
      color: "bg-primary",
      courses: [
        { name: "Office Administration", level: "Certificate", duration: "Flexible", fee: "27,000" },
        { name: "Secretarial Studies", level: "Certificate", duration: "Flexible", fee: "27,000" },
        { name: "Records & Information Management", level: "Certificate", duration: "Flexible", fee: "26,000" },
        { name: "Virtual Assistance", level: "Certificate", duration: "Flexible", fee: "18,000" },
        { name: "Business Communication Skills", level: "Certificate", duration: "Flexible", fee: "18,000" },
      ],
    },
    {
      name: "Welding & Fabrication (NITA Certified – Physical Classes)",
      icon: Monitor,
      color: "bg-secondary",
      courses: [
        { name: "Arc Welding (SMAW/MMA)", level: "Artisan", duration: "3 Months", fee: "35,000" },
        { name: "Gas Welding & Cutting (Oxy-Acetylene)", level: "Artisan", duration: "3 Months", fee: "35,000" },
        { name: "TIG Welding (GTAW)", level: "Artisan", duration: "3 Months", fee: "40,000" },
        { name: "MIG/MAG Welding (GMAW)", level: "Artisan", duration: "3 Months", fee: "40,000" },
        { name: "Structural & Pipe Welding", level: "Artisan", duration: "4 Months", fee: "45,000" },
        { name: "Metal Fabrication & Sheet Metal Work", level: "Artisan", duration: "3 Months", fee: "38,000" },
        { name: "Welding Inspection & Testing (Basics)", level: "Artisan", duration: "2 Months", fee: "30,000" },
      ],
      note: "physical",
    },
  ];

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
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-4">
            Our <span className="text-primary">Programs</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose from our wide range of professionally designed courses. All programs are fully online 
            with flexible scheduling. Fees are payable per term (1 Term = 3 Months).
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-4">
          {schools.map((school, schoolIndex) => (
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
