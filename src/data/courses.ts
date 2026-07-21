import { Monitor, Briefcase, TrendingUp, FileText, Wrench, Sparkles } from "lucide-react";

export interface CourseItem {
  name: string;
  level: string;
  duration: string;
  fee: string;
  feeAmount: number;
  isMonthly?: boolean;
  isPhysical?: boolean;
}

export interface School {
  name: string;
  icon: any;
  color: string;
  courses: CourseItem[];
  /** "physical" means in-person classes only */
  note?: "physical";
}

export const schoolCatalog: School[] = [
  {
    name: "Remote Work Academy (Flagship)",
    icon: Sparkles,
    color: "bg-secondary",
    courses: [
      { name: "Virtual Assistant with AI", level: "Professional", duration: "2 Months", fee: "20,000", feeAmount: 20000 },
      { name: "AI Digital Marketing", level: "Professional", duration: "3 Months", fee: "30,000", feeAmount: 30000 },
      { name: "Data Analytics & Power BI", level: "Professional", duration: "3 Months", fee: "30,000", feeAmount: 30000 },
      { name: "Graphic Design with AI", level: "Professional", duration: "2 Months", fee: "22,000", feeAmount: 22000 },
      { name: "Microsoft 365 Administration", level: "Professional", duration: "3 Months", fee: "28,000", feeAmount: 28000 },
      { name: "Remote Customer Support Specialist", level: "Professional", duration: "2 Months", fee: "18,000", feeAmount: 18000 },
    ],
  },
  {
    name: "School of ICT & Digital Technology",
    icon: Monitor,
    color: "bg-primary",
    courses: [
      { name: "Information Technology (IT)", level: "Certificate", duration: "2 Terms", fee: "29,000", feeAmount: 29000 },
      { name: "Computer Programming", level: "Certificate", duration: "2 Terms", fee: "30,000", feeAmount: 30000 },
      { name: "Web Design & Development", level: "Certificate", duration: "2 Terms", fee: "28,000", feeAmount: 28000 },
      { name: "Software Development", level: "Craft", duration: "4 Terms", fee: "30,000", feeAmount: 30000 },
      { name: "Mobile App Development", level: "Certificate", duration: "2 Terms", fee: "30,000", feeAmount: 30000 },
      { name: "Computer Applications", level: "Artisan", duration: "1 Term", fee: "18,000", feeAmount: 18000 },
      { name: "Computerized Accounting", level: "Artisan", duration: "1 Term", fee: "22,000", feeAmount: 22000 },
      { name: "Database Management", level: "Certificate", duration: "2 Terms", fee: "27,000", feeAmount: 27000 },
      { name: "Networking (Theory-Based)", level: "Certificate", duration: "2 Terms", fee: "27,000", feeAmount: 27000 },
      { name: "Cyber Security (Fundamentals)", level: "Certificate", duration: "2 Terms", fee: "30,000", feeAmount: 30000 },
      { name: "Data Science", level: "Diploma", duration: "3 Terms (1 Year)", fee: "30,000", feeAmount: 30000 },
    ],
  },
  {
    name: "School of Business & Management",
    icon: Briefcase,
    color: "bg-secondary",
    courses: [
      { name: "Business Management", level: "Certificate", duration: "2 Terms", fee: "27,500", feeAmount: 27500 },
      { name: "Business Administration", level: "Certificate", duration: "2 Terms", fee: "28,000", feeAmount: 28000 },
      { name: "Human Resource Management", level: "Craft", duration: "2 Terms", fee: "29,000", feeAmount: 29000 },
      { name: "Accounting & Finance", level: "Certificate", duration: "2 Terms", fee: "29,000", feeAmount: 29000 },
      { name: "Banking & Finance", level: "Certificate", duration: "2 Terms", fee: "29,000", feeAmount: 29000 },
      { name: "Entrepreneurship", level: "Certificate", duration: "1 Term", fee: "22,000", feeAmount: 22000 },
      { name: "Project Management", level: "Certificate", duration: "1 Term", fee: "27,000", feeAmount: 27000 },
    ],
  },
  {
    name: "Professional Courses",
    icon: TrendingUp,
    color: "bg-accent",
    courses: [
      { name: "Digital Marketing", level: "Professional", duration: "Flexible", fee: "30,000", feeAmount: 30000 },
      { name: "Artificial Intelligence (AI)", level: "Professional", duration: "Flexible", fee: "15,000", feeAmount: 15000, isMonthly: true },
      { name: "English Language Learning", level: "Certificate", duration: "Flexible", fee: "5,000", feeAmount: 5000, isMonthly: true },
    ],
  },
  {
    name: "Education, Administration & Office Skills",
    icon: FileText,
    color: "bg-primary",
    courses: [
      { name: "Office Administration", level: "Certificate", duration: "Flexible", fee: "27,000", feeAmount: 27000 },
      { name: "Secretarial Studies", level: "Certificate", duration: "Flexible", fee: "27,000", feeAmount: 27000 },
      { name: "Records & Information Management", level: "Certificate", duration: "Flexible", fee: "26,000", feeAmount: 26000 },
      { name: "Virtual Assistance", level: "Certificate", duration: "Flexible", fee: "18,000", feeAmount: 18000 },
      { name: "Business Communication Skills", level: "Certificate", duration: "Flexible", fee: "18,000", feeAmount: 18000 },
    ],
  },
  {
    name: "Welding & Fabrication (NITA Certified – Physical Classes)",
    icon: Wrench,
    color: "bg-secondary",
    note: "physical",
    courses: [
      { name: "Arc Welding (SMAW/MMA)", level: "Artisan", duration: "3 Months", fee: "35,000", feeAmount: 35000, isPhysical: true },
      { name: "Gas Welding & Cutting (Oxy-Acetylene)", level: "Artisan", duration: "3 Months", fee: "35,000", feeAmount: 35000, isPhysical: true },
      { name: "TIG Welding (GTAW)", level: "Artisan", duration: "3 Months", fee: "40,000", feeAmount: 40000, isPhysical: true },
      { name: "MIG/MAG Welding (GMAW)", level: "Artisan", duration: "3 Months", fee: "40,000", feeAmount: 40000, isPhysical: true },
      { name: "Structural & Pipe Welding", level: "Artisan", duration: "4 Months", fee: "45,000", feeAmount: 45000, isPhysical: true },
      { name: "Metal Fabrication & Sheet Metal Work", level: "Artisan", duration: "3 Months", fee: "38,000", feeAmount: 38000, isPhysical: true },
      { name: "Welding Inspection & Testing (Basics)", level: "Artisan", duration: "2 Months", fee: "30,000", feeAmount: 30000, isPhysical: true },
    ],
  },
];

/** Flat list of all course names – use for dropdowns */
export const allCourseNames: string[] = schoolCatalog.flatMap((school) =>
  school.courses.map((c) => c.name)
);

/** Flat list with school context – use for fee structure generation */
export const allCoursesWithMeta = schoolCatalog.flatMap((school) =>
  school.courses.map((c) => ({
    ...c,
    school: school.name,
  }))
);
