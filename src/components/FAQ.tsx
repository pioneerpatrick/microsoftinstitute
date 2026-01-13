import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

const FAQ = () => {
  const faqs = [
    {
      category: "Admissions",
      questions: [
        {
          question: "What are the admission requirements?",
          answer: "Our admission requirements vary by program. For most certificate courses, you need a minimum of KCPE or KCSE certificate. For craft and diploma programs, a KCSE certificate is required. We also welcome mature students and working professionals looking to upskill.",
        },
        {
          question: "How do I apply for a course?",
          answer: "Applying is simple! Fill out our online application form on this website, and our admissions team will contact you within 24-48 hours to guide you through the enrollment process. You can also reach us directly via WhatsApp at +254 723 821 798.",
        },
        {
          question: "When can I start my studies?",
          answer: "We have flexible intake dates throughout the year. New cohorts begin every month, so you can start your studies almost immediately after completing the enrollment process.",
        },
        {
          question: "Do I need any prior experience in technology?",
          answer: "No prior experience is required for most of our courses. Our programs are designed for beginners and include foundational modules. However, for advanced courses like AI and Cyber Security, basic computer literacy is recommended.",
        },
      ],
    },
    {
      category: "Fees & Payment",
      questions: [
        {
          question: "How much do the courses cost?",
          answer: "Our course fees range from KES 18,000 to KES 60,000 per term, depending on the program. Certificate courses typically cost between KES 27,000 - 30,000 per term. You can view the complete fee structure in our Courses section above.",
        },
        {
          question: "What payment methods do you accept?",
          answer: "We accept M-Pesa, bank transfers, and mobile money payments. All payments are made securely through our official channels. You will receive a receipt and enrollment confirmation upon payment.",
        },
        {
          question: "Do you offer payment plans or installments?",
          answer: "Yes! We understand financial flexibility is important. We offer installment payment plans where you can pay in 2-3 installments per term. Contact our admissions team to discuss a payment plan that works for you.",
        },
        {
          question: "Are there any scholarships available?",
          answer: "We occasionally offer partial scholarships and bursaries for exceptional students with financial need. Follow our social media pages and subscribe to our newsletter to be notified of scholarship opportunities.",
        },
      ],
    },
    {
      category: "Online Learning",
      questions: [
        {
          question: "How does online learning work?",
          answer: "Our courses are delivered through a user-friendly online learning platform. You'll access video lessons, reading materials, assignments, and live sessions. You can study at your own pace, 24/7, from any device with internet access.",
        },
        {
          question: "Will I have access to instructors?",
          answer: "Absolutely! Our instructors are available through live Q&A sessions, discussion forums, and direct messaging. We also have dedicated support staff to help with technical issues and general queries.",
        },
        {
          question: "How many hours per week should I dedicate to studying?",
          answer: "We recommend 10-15 hours per week for optimal progress, but our flexible schedule allows you to study at your own pace. Working professionals often study during evenings and weekends.",
        },
        {
          question: "Do I need special equipment or software?",
          answer: "You need a computer or smartphone with internet access. For programming and technical courses, a laptop is recommended. All required software and tools are either free or provided as part of your enrollment.",
        },
      ],
    },
    {
      category: "Certification",
      questions: [
        {
          question: "Will I receive a certificate upon completion?",
          answer: "Yes! Upon successful completion of your program, you will receive a recognized certificate from Microsoft Training Institute Africa. Our certificates are valued by employers across Africa and beyond.",
        },
        {
          question: "Are your certificates recognized by employers?",
          answer: "Our certificates are recognized by employers across Africa. We focus on practical, industry-relevant skills that employers actively seek. Many of our graduates have secured jobs at leading companies.",
        },
        {
          question: "How long does it take to complete a course?",
          answer: "Course duration varies: Artisan courses take 1 term (3 months), Certificate courses take 1-2 terms (3-6 months), and Craft courses take 4 terms (12 months). You can complete faster if you dedicate more time.",
        },
      ],
    },
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary font-medium px-4 py-1 rounded-full text-sm mb-4">
            <HelpCircle className="h-4 w-4" />
            Got Questions?
          </div>
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-4">
            Frequently Asked <span className="text-primary">Questions</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Find answers to common questions about our programs, admissions, and online learning experience.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {faqs.map((category, categoryIndex) => (
              <div key={categoryIndex} className="space-y-4">
                <h3 className="text-lg font-heading font-semibold text-primary border-b border-border pb-2">
                  {category.category}
                </h3>
                <Accordion type="single" collapsible className="space-y-2">
                  {category.questions.map((faq, faqIndex) => (
                    <AccordionItem
                      key={faqIndex}
                      value={`${categoryIndex}-${faqIndex}`}
                      className="bg-card border border-border rounded-lg px-4 data-[state=open]:shadow-md transition-shadow"
                    >
                      <AccordionTrigger className="text-left text-foreground hover:text-primary hover:no-underline py-4 text-sm font-medium">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground text-sm pb-4 leading-relaxed">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-12 text-center bg-muted/50 rounded-2xl p-8">
            <h3 className="text-xl font-heading font-semibold text-foreground mb-3">
              Still have questions?
            </h3>
            <p className="text-muted-foreground mb-6">
              Our admissions team is ready to help you get started on your educational journey.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="https://wa.me/254723821798"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                Chat on WhatsApp
              </a>
              <a
                href="mailto:admissions@microsoftinstitute.africa"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                Email Us
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
