
# Remote Work Academy Repositioning Plan

This plan repositions the **public-facing homepage** into "Africa's Remote Work & AI Skills Academy" without touching the LMS, admin dashboards, database, or existing course catalog (which powers admissions/certificates/fees). All existing branding (blue #14438C, orange #F39519, logo, fonts) is kept.

---

## What Will Change (Homepage Only)

### 1. Hero (`src/components/Hero.tsx`)
- New headline: **"Build Your Remote Career with AI"**
- New subheading focused on portfolio + certificate + remote employers
- Buttons: **Explore Programs**, **Apply Now**, **WhatsApp Us** (opens wa.me/254723821798)
- Generate a new hero background image: African professionals with laptops, AI tools, Microsoft 365 UI
- Update stats to remote-work-focused metrics

### 2. New Section: "Remote Work Academy — Flagship Programs" (`src/components/FlagshipPrograms.tsx`)
Card grid of 8 programs (name, duration, price, key skills, career outcome, Apply button):
- Virtual Assistant with AI (2 Months – KES 20,000)
- AI Digital Marketing
- Data Analytics & Power BI
- Graphic Design with AI
- Microsoft 365 Administration
- Cyber Security Fundamentals
- Web Design & No-Code Development
- Remote Customer Support Specialist

These will also be **added to `src/data/courses.ts`** in a new "Remote Work Academy" school so they flow into the application form, scholarship page, and admin accounting automatically.

### 3. New Section: "Your Career Pathway" (`src/components/CareerPathway.tsx`)
7-step horizontal journey with icons + subtle animations:
Enroll → Learn Live → Complete Projects → Earn Certificate → Career Coaching → Employer Networking → Launch Remote Career

### 4. New Section: "Remote Work Accelerator" (`src/components/RemoteAccelerator.tsx`)
Headline: *"We Don't Just Teach. We Prepare You for Work."*
Cards: CV Development, LinkedIn Optimization, Portfolio Building, Interview Prep, Freelancing Training, AI Productivity Toolkit, Career Coaching, Employer Networking.

### 5. New Section: "Why Students Choose Us" (`src/components/WhyChooseUs.tsx`)
8 trust cards with icons + counters (students trained, projects delivered, etc.).

### 6. Certification Section (`src/components/CertificationSection.tsx`)
Compliance-safe wording:
> "Students receive a Microsoft Institute Africa Certificate of Completion. Select programs prepare learners for globally recognized Microsoft certification exams where applicable."
Includes a premium certificate mockup preview.

### 7. Final CTA (`src/components/FinalCTA.tsx`)
Before footer: *"Ready to Build Your Global Career?"* with Apply / Talk to Advisor / WhatsApp buttons.

### 8. Updates to Existing Components
- **Navbar**: rename "Courses" → "Programs"; add "Remote Academy" link
- **About**: swap "Training Institute / ICT Training" language → "Remote Work & AI Skills Academy" (keep founder Patrick Kimanthi & story)
- **FAQ**: replace items with the 6 requested questions/answers
- **Contact / Footer**: update phone to **0723 821 798**, email **info@microsoftinstitute.africa**, add WhatsApp link
- **Courses.tsx**: keep as-is (still the full catalog) but rename heading to "Full Program Catalog" so Flagship Programs leads visually

### 9. SEO (`index.html`)
- New title: *"Remote Work Academy Kenya | AI, Virtual Assistant & Microsoft 365 Training"*
- Meta description targeting: Virtual Assistant Course Kenya, AI Training Kenya, Remote Work Training Africa, Microsoft 365 Training Kenya, Data Analytics Course Kenya
- Update Open Graph title/description
- Extend JSON-LD `EducationalOrganization` with `offers` array for flagship programs

### 10. Visual Polish
- Add soft gradient utilities to `index.css` (tokens only, no hardcoded colors)
- Consistent card styles across new sections
- Premium hover animations on program cards (lift + soft shadow)
- Increased vertical whitespace on mobile

---

## Homepage Section Order (After Redesign)

```
Navbar
Hero (new copy + new bg)
Flagship Programs (NEW)
Career Pathway (NEW)
About (repositioned)
Remote Work Accelerator (NEW)
Why Choose Us (NEW)
Full Program Catalog (existing Courses.tsx)
Certification (NEW)
Testimonials (existing)
FAQ (updated)
Apply
Final CTA (NEW)
Contact (updated)
Newsletter
Footer (updated)
```

---

## What Will NOT Change

- LMS pages, student dashboard, admin dashboard, accounting, fee structures
- Existing `src/data/courses.ts` entries (only additions, no removals) so all admitted students & generated certificates stay valid
- Auth, Supabase schema, edge functions
- Brand colors, logo, fonts (Inter + Poppins)
- Domain, routes, animations elsewhere

---

## Technical Details

- New components use existing design tokens from `index.css` / `tailwind.config.ts` (no hardcoded colors).
- Hero image generated via `imagegen` (fast tier, jpg) and stored under `src/assets/`.
- WhatsApp integration: simple `https://wa.me/254723821798?text=...` links (no SDK needed).
- Flagship program data lives in `src/data/courses.ts` under a new `School` entry so the single source of truth is preserved and admissions/certificates/accounting stay synced.
- Certificate mockup uses an inline SVG/HTML preview — no new asset dependency.
- No new npm packages required.
- Lazy-loaded homepage sections stay eager-imported in `Index.tsx` (Hero is critical); this keeps LCP good and matches the current code-splitting setup.

---

## Estimated Scope

~9 new component files, ~6 edits to existing files, 1 hero image generation, 1 SEO update in `index.html`, 1 append to `src/data/courses.ts`. No database migrations, no edge function changes.

Reply **"go"** to proceed, or tell me which sections to skip/modify.
