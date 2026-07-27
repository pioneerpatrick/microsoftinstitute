import { Star, Quote } from "lucide-react";

const Testimonials = () => {
  const testimonials = [
    {
      name: "Grace Mwangi",
      course: "Web Design & Development",
      location: "Nairobi, Kenya",
      image: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=150&h=150&fit=crop&crop=face",
      rating: 5,
      text: "The flexibility of online learning allowed me to work while studying. Within 6 months of completing my course, I landed a job as a junior developer at a tech startup. The instructors were incredibly supportive!",
    },
    {
      name: "Emmanuel Okonkwo",
      course: "Cyber Security",
      location: "Lagos, Nigeria",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
      rating: 5,
      text: "I was skeptical about online learning at first, but Techno Panaly Institute of Technology exceeded my expectations. The practical approach to cybersecurity gave me hands-on skills that employers value. Now I work as a Security Analyst.",
    },
    {
      name: "Amina Hassan",
      course: "Digital Marketing",
      location: "Mombasa, Kenya",
      image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face",
      rating: 5,
      text: "The Digital Marketing course transformed my career. I went from being unemployed to running my own digital agency. The course content was up-to-date and the certificate is recognized by employers across Africa.",
    },
    {
      name: "David Kamau",
      course: "Business Management",
      location: "Nakuru, Kenya",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
      rating: 5,
      text: "As a working professional, I needed a flexible program. The Business Management course fit perfectly into my schedule. The skills I gained helped me earn a promotion to Operations Manager within a year!",
    },
    {
      name: "Sarah Achieng",
      course: "Computer Programming",
      location: "Kisumu, Kenya",
      image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop&crop=face",
      rating: 5,
      text: "Starting from zero coding knowledge, I can now build mobile apps! The step-by-step curriculum and responsive support team made all the difference. Best investment I've ever made in myself.",
    },
    {
      name: "Peter Mutua",
      course: "Artificial Intelligence",
      location: "Thika, Kenya",
      image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
      rating: 5,
      text: "The AI course is comprehensive and forward-thinking. I learned machine learning fundamentals and now work as a Data Analyst. The instructors are experts who genuinely care about student success.",
    },
  ];

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-secondary/10 text-secondary font-medium px-4 py-1 rounded-full text-sm mb-4">
            <Quote className="h-4 w-4" />
            Success Stories
          </div>
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-4">
            What Our <span className="text-primary">Students Say</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join thousands of successful graduates who transformed their careers through our programs.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-card rounded-xl p-6 border border-border shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              {/* Quote Icon */}
              <div className="mb-4">
                <Quote className="h-8 w-8 text-secondary/30" />
              </div>

              {/* Rating */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-secondary text-secondary" />
                ))}
              </div>

              {/* Testimonial Text */}
              <p className="text-muted-foreground leading-relaxed mb-6">
                "{testimonial.text}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-4 pt-4 border-t border-border">
                <img
                  src={testimonial.image}
                  alt={testimonial.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <h4 className="font-semibold text-foreground">{testimonial.name}</h4>
                  <p className="text-sm text-primary">{testimonial.course}</p>
                  <p className="text-xs text-muted-foreground">{testimonial.location}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats Bar */}
        <div className="mt-16 bg-primary rounded-2xl p-8 md:p-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-primary-foreground">
            <div>
              <div className="text-3xl md:text-4xl font-bold mb-2">5,000+</div>
              <div className="text-primary-foreground/80 text-sm">Graduates</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold mb-2">95%</div>
              <div className="text-primary-foreground/80 text-sm">Completion Rate</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold mb-2">85%</div>
              <div className="text-primary-foreground/80 text-sm">Employment Rate</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold mb-2">4.9/5</div>
              <div className="text-primary-foreground/80 text-sm">Student Rating</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
