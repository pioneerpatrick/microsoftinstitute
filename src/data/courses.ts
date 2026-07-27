import { Monitor, TrendingUp, FileText, Sparkles } from "lucide-react";

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
    name: "School of Artificial Intelligence & Data",
    icon: TrendingUp,
    color: "bg-accent",
    courses: [
      { name: "Artificial Intelligence (AI) Essentials", level: "Professional", duration: "Flexible", fee: "15,000", feeAmount: 15000, isMonthly: true },
      { name: "Prompt Engineering & AI Productivity", level: "Professional", duration: "1 Month", fee: "15,000", feeAmount: 15000 },
      { name: "Machine Learning Fundamentals", level: "Professional", duration: "3 Months", fee: "30,000", feeAmount: 30000 },
      { name: "Data Analytics with Excel & SQL", level: "Certificate", duration: "2 Months", fee: "25,000", feeAmount: 25000 },
      { name: "Digital Marketing", level: "Professional", duration: "Flexible", fee: "30,000", feeAmount: 30000 },
    ],
  },
  {
    name: "School of Cloud, Networking & Cyber Security",
    icon: FileText,
    color: "bg-primary",
    courses: [
      { name: "Microsoft 365 & Cloud Administration", level: "Certificate", duration: "3 Months", fee: "28,000", feeAmount: 28000 },
      { name: "Cyber Security Operations", level: "Certificate", duration: "3 Months", fee: "30,000", feeAmount: 30000 },
      { name: "Ethical Hacking Fundamentals", level: "Certificate", duration: "2 Months", fee: "28,000", feeAmount: 28000 },
      { name: "IT Support & Helpdesk (Remote)", level: "Certificate", duration: "2 Months", fee: "22,000", feeAmount: 22000 },
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
