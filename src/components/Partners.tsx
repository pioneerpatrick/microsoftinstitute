import { Award, Building2, Globe2 } from "lucide-react";

const Partners = () => {
  const certificationBodies = [
    { name: "KNEC", fullName: "Kenya National Examinations Council", type: "Kenyan" },
    { name: "TVETA", fullName: "Technical and Vocational Education Training Authority", type: "Kenyan" },
    { name: "NITA", fullName: "National Industrial Training Authority", type: "Kenyan" },
    { name: "KASNEB", fullName: "Kenya Accountants and Secretaries National Examinations Board", type: "Kenyan" },
  ];

  const technologyPartners = [
    { name: "Microsoft", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Microsoft_logo.svg/512px-Microsoft_logo.svg.png" },
    { name: "Google", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Google_2015_logo.svg/500px-Google_2015_logo.svg.png" },
    { name: "Cisco", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Cisco_logo_blue_2016.svg/500px-Cisco_logo_blue_2016.svg.png" },
    { name: "Amazon Web Services", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Amazon_Web_Services_Logo.svg/500px-Amazon_Web_Services_Logo.svg.png" },
    { name: "CompTIA", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/CompTIA_logo.svg/500px-CompTIA_logo.svg.png" },
    { name: "Oracle", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Oracle_logo.svg/500px-Oracle_logo.svg.png" },
  ];

  const industryPartners = [
    { name: "Safaricom", description: "Kenya's leading telecom", type: "Kenyan" },
    { name: "KCB Bank", description: "East Africa's largest bank", type: "Kenyan" },
    { name: "Equity Bank", description: "Financial services leader", type: "Kenyan" },
    { name: "Andela", description: "African tech talent network", type: "African" },
    { name: "iHub", description: "Innovation hub for startups", type: "Kenyan" },
    { name: "Konza Technopolis", description: "Kenya's Silicon Savannah", type: "Kenyan" },
  ];

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-accent/10 text-accent font-medium px-4 py-1 rounded-full text-sm mb-4">
            <Award className="h-4 w-4" />
            Trusted & Accredited
          </div>
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-4">
            Our <span className="text-primary">Partners & Accreditations</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We partner with leading organizations in Kenya and globally to deliver world-class education and industry-recognized certifications.
          </p>
        </div>

        {/* Kenyan Certification Bodies */}
        <div className="mb-16">
          <div className="flex items-center justify-center gap-2 mb-8">
            <Building2 className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-heading font-semibold text-foreground">
              Kenyan Accreditation Bodies
            </h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {certificationBodies.map((body, index) => (
              <div
                key={index}
                className="bg-card border border-border rounded-xl p-6 text-center hover:shadow-lg hover:border-primary/30 transition-all duration-300"
              >
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-primary font-bold text-lg">{body.name.slice(0, 2)}</span>
                </div>
                <h4 className="font-semibold text-foreground mb-1">{body.name}</h4>
                <p className="text-xs text-muted-foreground leading-tight">{body.fullName}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Technology Partners */}
        <div className="mb-16">
          <div className="flex items-center justify-center gap-2 mb-8">
            <Globe2 className="h-5 w-5 text-secondary" />
            <h3 className="text-xl font-heading font-semibold text-foreground">
              Global Technology Partners
            </h3>
          </div>
          <div className="bg-card border border-border rounded-2xl p-8 max-w-5xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 items-center">
              {technologyPartners.map((partner, index) => (
                <div
                  key={index}
                  className="flex items-center justify-center p-4 hover:opacity-80 transition-all duration-300"
                >
                  <img
                    src={partner.logo}
                    alt={partner.name}
                    className="max-h-10 w-auto object-contain"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Industry Partners */}
        <div>
          <div className="flex items-center justify-center gap-2 mb-8">
            <Building2 className="h-5 w-5 text-accent" />
            <h3 className="text-xl font-heading font-semibold text-foreground">
              Industry & Employment Partners
            </h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 max-w-5xl mx-auto">
            {industryPartners.map((partner, index) => (
              <div
                key={index}
                className="bg-card border border-border rounded-xl p-5 text-center hover:shadow-lg hover:border-secondary/30 transition-all duration-300 group"
              >
                <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:bg-secondary/20 transition-colors">
                  <span className="text-secondary font-bold text-sm">{partner.name.slice(0, 2).toUpperCase()}</span>
                </div>
                <h4 className="font-semibold text-foreground text-sm mb-1">{partner.name}</h4>
                <p className="text-xs text-muted-foreground">{partner.description}</p>
                <span className="inline-block mt-2 text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">
                  {partner.type}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Trust Badge */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-full px-6 py-3">
            <Award className="h-5 w-5 text-primary" />
            <span className="text-foreground font-medium">
              Recognized by the Ministry of Education, Kenya
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Partners;
