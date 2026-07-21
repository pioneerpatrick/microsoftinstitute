import { Award, QrCode, ShieldCheck, CheckCircle2 } from "lucide-react";
import logo from "@/assets/logo.png";

const CertificationSection = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          <div>
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary font-medium px-4 py-1 rounded-full text-sm mb-4">
              <Award className="h-4 w-4" />
              Certification
            </div>
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-5 leading-tight">
              A certificate that <span className="text-primary">opens doors</span> — globally.
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Every graduate receives a <strong>Microsoft Institute Africa Certificate of
              Completion</strong>, featuring your admission number, a unique serial, and a scannable
              QR code that verifies authenticity online. Select programs also prepare you for
              globally recognized Microsoft certification exams where applicable.
            </p>
            <ul className="space-y-3">
              {[
                "Unique admission number & serial",
                "QR code verifiable at microsoftinstitute.africa/verify",
                "Employer-recognized digital & printed formats",
                "Pathway to global Microsoft exam prep",
              ].map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-accent mt-0.5 shrink-0" />
                  <span className="text-foreground">{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-br from-primary via-secondary to-accent rounded-3xl opacity-20 blur-2xl" />
            <div className="relative bg-card border-8 border-double border-primary/30 rounded-2xl p-8 shadow-2xl">
              <div className="text-center border-b border-border pb-4 mb-4">
                <img src={logo} alt="MTI" className="h-16 w-auto mx-auto mb-2" />
                <p className="text-xs font-semibold text-primary tracking-widest">MICROSOFT INSTITUTE AFRICA</p>
                <p className="text-[10px] text-muted-foreground italic">Quest for Excellence</p>
              </div>
              <p className="text-center text-xs text-muted-foreground uppercase tracking-widest mb-2">Certificate of Completion</p>
              <p className="text-center font-heading text-2xl text-foreground mb-1">Awarded to</p>
              <p className="text-center text-3xl font-bold text-primary italic mb-3" style={{ fontFamily: "cursive" }}>
                Your Name Here
              </p>
              <p className="text-center text-sm text-muted-foreground mb-4">
                for successfully completing the flagship program in<br />
                <strong className="text-foreground">Virtual Assistant with AI</strong>
              </p>
              <div className="flex items-center justify-between pt-4 border-t border-border text-xs">
                <div className="text-left">
                  <p className="text-muted-foreground">Serial</p>
                  <p className="font-semibold text-foreground">MTI/VA/2026/0001</p>
                </div>
                <div className="w-14 h-14 border-2 border-primary/40 rounded-md flex items-center justify-center bg-primary/5">
                  <QrCode className="h-8 w-8 text-primary" />
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground flex items-center gap-1 justify-end"><ShieldCheck className="h-3 w-3" />Verified</p>
                  <p className="font-semibold text-foreground">2026</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CertificationSection;
