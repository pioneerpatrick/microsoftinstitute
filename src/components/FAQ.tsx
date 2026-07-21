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
      question: "Is this a fully online academy?",
      answer:
        "Yes. Our Remote Work Academy runs 100% online with live instructor-led classes, recorded sessions, and hands-on projects. You can join from anywhere in Africa. (Only our NITA-certified Welding & Fabrication department is in-person.)",
    },
    {
      question: "Do I need experience to join?",
      answer:
        "No. Programs are designed for beginners and career switchers. We include foundational modules and AI productivity training so you can catch up quickly, even without a tech background.",
    },
    {
      question: "Will I really be able to work remotely after graduating?",
      answer:
        "That's the point of the Academy. Every program includes the Remote Work Accelerator — CV, LinkedIn, portfolio, interview prep, freelancing training, and access to our employer network — so you graduate ready to apply for remote jobs and freelance clients globally.",
    },
    {
      question: "Is the certificate recognized?",
      answer:
        "Yes. You receive a Microsoft Institute Africa Certificate of Completion with a unique serial and QR code that anyone can verify online at microsoftinstitute.africa/verify. Select programs also prepare you for globally recognized Microsoft certification exams.",
    },
    {
      question: "How much do programs cost and can I pay in installments?",
      answer:
        "Flagship programs range from KES 18,000 to KES 30,000. We accept M‑Pesa and bank transfer, and offer installment plans (2–3 payments) for most programs. Sponsorship and scholarship options are also available.",
    },
    {
      question: "How do I get started?",
      answer:
        "Fill in the application form below, or WhatsApp us at 0723 821 798. Our admissions team will contact you within 24 hours to confirm your cohort and next steps.",
    },
  ];

  return (
    <section className="py-20 bg-muted/40">
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
            Everything you need to know about joining the Remote Work Academy.
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="bg-card border border-border rounded-lg px-5 data-[state=open]:shadow-md transition-shadow"
              >
                <AccordionTrigger className="text-left text-foreground hover:text-primary hover:no-underline py-4 font-medium">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="mt-12 text-center bg-card border border-border rounded-2xl p-8">
            <h3 className="text-xl font-heading font-semibold text-foreground mb-3">
              Still have questions?
            </h3>
            <p className="text-muted-foreground mb-6">
              Talk to an admissions advisor — we usually reply within a few hours.
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
                href="mailto:info@microsoftinstitute.africa"
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
