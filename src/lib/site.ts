export const site = {
  name: "Millennium Air Hostess Academy",
  shortName: "Millennium",
  tagline: "Where Dreams Take Flight",
  description:
    "Bihar's oldest and most respected aviation & hospitality training institute. Cabin crew, ground operations, hospitality and retail programs with 100% placement assistance in Patna.",
  url: "https://millenniumairhostess.com",
  address: {
    line1: "22/C, Jaya Rani, Basawan Park Rd",
    line2: "Boring Rd, Patna, Bihar 800001",
    mapsUrl:
      "https://www.google.com/maps/search/?api=1&query=Millennium+Air+Hostess+Academy+Boring+Road+Patna",
    mapsEmbed:
      "https://www.google.com/maps?q=Millennium+Air+Hostess+Academy+Boring+Road+Patna&output=embed",
  },
  phones: ["+91 96433 16326"],
  emails: ["info.maa23@gmail.com"],
  whatsapp: "919643316326",
  hours: "Mon – Sat, 9:30 AM – 6:30 PM",
  social: {
    instagram: "https://www.instagram.com/millenniumairhostess01/",
    facebook: "https://www.facebook.com/millenniumairhostess",
  },
};

export const telHref = (phone: string) => `tel:${phone.replace(/\s/g, "")}`;

export const whatsappHref = (text = "Hi! I'd like to know more about your courses.") =>
  `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}`;

export const nav = [
  { href: "/about", label: "About" },
  { href: "/courses", label: "Courses" },
  { href: "/placements", label: "Placements" },
  { href: "/airline-jobs", label: "Airline Jobs" },
  { href: "/admissions", label: "Admissions" },
  { href: "/contact", label: "Contact" },
];

export const stats = [
  { value: "450+", label: "Students placed in the last 3 years" },
  { value: "15+", label: "Airline & hospitality hiring partners" },
  { value: "4", label: "Career-focused certification programs" },
  { value: "6–12", label: "Months to a career-ready certification" },
];

export type Course = {
  slug: string;
  title: string;
  short: string;
  category: string;
  image: string;
  duration: string;
  eligibility: string;
  summary: string;
  /** One-line hook and three short highlights for the homepage course slides */
  tagline: string;
  highlights: string[];
  description: string;
  modules: string[];
  roles: string[];
  recruiters: string[];
};

export const courses: Course[] = [
  {
    slug: "cabin-crew",
    title: "Aviation Cabin Crew",
    short: "Cabin Crew",
    category: "Aviation",
    image: "/images/course-cabin-crew.jpg",
    duration: "6 – 12 months",
    eligibility: "12th pass, any stream · 18–27 years",
    tagline: "Poise, safety and service for the skies.",
    highlights: ["In-flight service", "Safety drills", "Grooming", "English Communication", "First aid", "Interview prep"],
    summary:
      "Master the poise, safety know-how and service excellence top airlines look for in their cabin crew.",
    description:
      "Our flagship program prepares you for a career in the skies. From in-flight service and safety procedures to grooming, communication and interview preparation, you train with ex-cabin crew mentors in simulated cabin environments until you are confident and airline-ready.",
    modules: [
      "Aviation fundamentals & in-flight operations",
      "Safety, emergency handling & mock drills",
      "Passenger service & in-flight hospitality",
      "Grooming, deportment & personality development",
      "English Communication skills",
      "First aid & medical awareness",
      "Airline interview & group discussion training",
    ],
    roles: ["Cabin Crew", "Flight Attendant", "Air Hostess / Flight Steward", "In-flight Service Associate"],
    recruiters: ["IndiGo", "Air India", "Akasa Air", "Emirates", "Qatar Airways", "Vistara"],
  },
  {
    slug: "ground-operations",
    title: "Airport Ground Operations",
    short: "Ground Operations",
    category: "Aviation",
    image: "/images/course-ground-ops.jpg",
    duration: "6 – 12 months",
    eligibility: "12th pass, any stream",
    tagline: "Run the airport, from check-in to boarding.",
    highlights: ["Check-in & boarding", "Ticketing", "Baggage", "Airport security", "Customer service", "Interview prep"],
    summary:
      "Learn how airports run — check-in, ticketing, baggage, ramp and passenger handling — and step into a fast-growing career.",
    description:
      "Airports need skilled professionals behind every departure. This program covers the full passenger journey on the ground: reservations and ticketing, check-in and boarding, baggage handling, airport security awareness and customer service, with hands-on practice on industry workflows.",
    modules: [
      "Airport layout, terminology & operations",
      "Reservations, ticketing & fare basics",
      "Check-in, boarding & departure control",
      "Baggage handling & lost-and-found",
      "Airport safety & security awareness",
      "Customer service & handling difficult situations",
      "Interview preparation & professional grooming",
    ],
    roles: ["Ground Staff", "Customer Service Agent", "Ground Operations Executive", "Ticketing Executive"],
    recruiters: ["IndiGo", "Air India Express", "SpiceJet", "Air India", "Akasa Air"],
  },
  {
    slug: "hospitality",
    title: "Hospitality Management",
    short: "Hospitality",
    category: "Hospitality",
    image: "/images/course-hospitality.jpg",
    duration: "6 – 12 months",
    eligibility: "12th pass, any stream",
    tagline: "Front office to F&B, ready for top hotels.",
    highlights: ["Front office", "F&B service", "Guest relations", "Housekeeping", "Etiquette", "Internship prep"],
    summary:
      "A practical course in front office, F&B, housekeeping and guest relations for careers with leading hotel brands.",
    description:
      "Hospitality is about making every guest feel special. You'll learn front office operations, food & beverage service, housekeeping standards and guest relations, alongside the grooming and communication skills that premium hotels and resorts expect.",
    modules: [
      "Introduction to the hospitality industry",
      "Front office operations & guest relations",
      "Food & beverage service",
      "Housekeeping operations",
      "Customer service excellence",
      "Grooming, etiquette & communication",
      "Internship & placement preparation",
    ],
    roles: ["Front Office Associate", "Guest Relations Executive", "F&B Associate", "Housekeeping Supervisor"],
    recruiters: ["Taj", "Marriott", "ITC Hotels", "Radisson"],
  },
  {
    slug: "retail-operations",
    title: "Retail Operations",
    short: "Retail",
    category: "Retail",
    image: "/images/course-retail.jpg",
    duration: "6 – 12 months",
    eligibility: "12th pass, any stream",
    tagline: "Sell, serve and run modern stores.",
    highlights: ["Sales skills", "Store operations", "Merchandising", "Billing & POS", "Customer care", "Interview prep"],
    summary:
      "Build the customer-facing, sales and store-operations skills needed in modern retail, airport and duty-free stores.",
    description:
      "Retail is one of India's biggest employers. This course trains you in store operations, visual merchandising, sales techniques and customer experience — skills in demand across malls, brand outlets and airport duty-free retail.",
    modules: [
      "Retail industry overview",
      "Store operations & inventory basics",
      "Sales techniques & customer engagement",
      "Visual merchandising",
      "Billing, POS & cash handling",
      "Grooming & communication skills",
      "Interview preparation & placement support",
    ],
    roles: ["Retail Sales Associate", "Customer Experience Executive", "Store Operations Associate", "Duty-Free Associate"],
    recruiters: ["Swarovski", "Swiss Beauty", "Rare Planet", "Starbucks", "Rado", "Rolex", "Giorgio Armani", "Tissot"],
  },
];

export const getCourse = (slug: string) => courses.find((c) => c.slug === slug);

export const advantages = [
  {
    title: "Proven placements",
    text: "450+ students in just three years have started careers with IndiGo, Air India, Emirates, Qatar Airways and more.",
  },
  {
    title: "Expert mentors",
    text: "Learn from industry veterans with first-hand experience at global airlines and hospitality brands.",
  },
  {
    title: "Real-world simulations",
    text: "Practice in training facilities that replicate actual cabin, airport and hotel working environments.",
  },
  {
    title: "Grooming & personality",
    text: "Dedicated sessions on grooming, communication and confidence — the edge that wins interviews.",
  },
  {
    title: "Scholarships & easy EMI",
    text: "Scholarships and loan facilities with easy EMIs make quality training accessible to every deserving student.",
  },
  {
    title: "Safe hostel facility",
    text: "Optional hostel accommodation with 24/7 CCTV surveillance and separate facilities for girls and boys.",
  },
];

// bg: the logo artwork sits on this solid colour, so cards can match it edge to edge.
// tint: a light wash of the brand colour for logos drawn on white (blend the logo's white into it).
// brand: the strong brand colour, used for accents like the student ID lanyard.
export const partners: { name: string; logo: string; bg?: string; tint?: string; brand?: string }[] = [
  { name: "IndiGo", logo: "/images/partners/indigo.png", bg: "#2c3a9b", brand: "#2c3a9b" },
  { name: "Air India", logo: "/images/partners/air-india.png", tint: "#fdeceb", brand: "#c8102e" },
  { name: "Emirates", logo: "/images/partners/emirates.png", bg: "#d71923", brand: "#d71923" },
  { name: "Qatar Airways", logo: "/images/partners/qatar-airways.png", bg: "#5c0633", brand: "#5c0633" },
  { name: "Akasa Air", logo: "/images/partners/akasa-air.png", tint: "#fff0e6", brand: "#f26522" },
  { name: "Air India Express", logo: "/images/partners/air-india-express.png", tint: "#fff1e5", brand: "#e04e2a" },
  { name: "Etihad Airways", logo: "/images/partners/etihad.png", tint: "#f7f1e6", brand: "#a87c2a" },
  { name: "SpiceJet", logo: "/images/partners/spicejet.png", tint: "#fff5e0", brand: "#e21d25" },
  { name: "AirAsia", logo: "/images/partners/air-asia.png", bg: "#df1d25", brand: "#df1d25" },
  { name: "British Airways", logo: "/images/partners/british-airways.png", tint: "#edf1fa", brand: "#075aaa" },
  { name: "Riyadh Air", logo: "/images/partners/riyadh-air.png", tint: "#f1eefa", brand: "#3d1f6e" },
  { name: "Air Kerala", logo: "/images/partners/air-kerala.png", bg: "#262626", brand: "#f07c00" },
  { name: "Shankh Air", logo: "/images/partners/shankh-air.png", tint: "#eef3fb", brand: "#1f4e9c" },
  { name: "Taj Hotels", logo: "/images/partners/taj.png", tint: "#f7f1e4", brand: "#8a6d3b" },
  { name: "Marriott", logo: "/images/partners/marriott.png", tint: "#fdeceb", brand: "#a6192e" },
  { name: "ITC Hotels", logo: "/images/partners/itc-hotels.png", tint: "#f7f1e4", brand: "#8a6d3b" },
  { name: "Radisson", logo: "/images/partners/radisson.png", tint: "#eef5e6", brand: "#1a1a1a" },
  { name: "EaseMyTrip", logo: "/images/partners/easemytrip.png", tint: "#e9f2fd", brand: "#1f5fb4" },
];

/** Luxury and lifestyle retail brands, shown on the Retail course card (kept out of the airline/hotel partner wall). */
export const retailBrands: typeof partners = [
  { name: "Swarovski", logo: "/images/partners/swarovski.png", tint: "#f2f2f2", brand: "#111111" },
  { name: "Swiss Beauty", logo: "/images/partners/swiss-beauty.png", tint: "#f7eef0", brand: "#111111" },
  { name: "Rare Planet", logo: "/images/partners/rare-planet.png", tint: "#f4eefa", brand: "#5b2a86" },
  { name: "Starbucks", logo: "/images/partners/starbucks.png", tint: "#e8f3ee", brand: "#00704a" },
  { name: "Rado", logo: "/images/partners/rado.png", tint: "#f2f2f2", brand: "#1a1a1a" },
  { name: "Rolex", logo: "/images/partners/rolex.png", tint: "#e9f3ec", brand: "#006039" },
  { name: "Giorgio Armani", logo: "/images/partners/armani.png", tint: "#f3f1ec", brand: "#1a1a1a" },
  { name: "Tissot", logo: "/images/partners/tissot.png", tint: "#fdecec", brand: "#e2001a" },
];

/** Photos for the looping About slideshow on the home page — swap in live classroom shots here */
export const aboutGallery = [
  { src: "/images/academy-team.jpg", alt: "Millennium students in uniform at the academy", caption: "Every batch, ready to fly." },
  { src: "/images/crew-terminal.jpg", alt: "Cabin crew walking through an airport terminal", caption: "Shaping confident professionals since day one." },
  { src: "/images/students/ananya.jpg", alt: "Students celebrating at the Millennium academy", caption: "Small batches, personal mentoring." },
  { src: "/images/course-cabin-crew.jpg", alt: "Cabin crew trainee during in-flight service practice", caption: "Hands-on, real-world drills." },
];

export const placedStudents = [
  { name: "Riya Raj", company: "IndiGo", role: "Ground Operations", photo: "/images/students/riya-raj.jpg" },
  { name: "Khushi", company: "Akasa Air", role: "Cabin Crew", photo: "/images/students/khushi.jpg" },
  { name: "Saumya Srivastav", company: "IndiGo", role: "Ground Staff", photo: "/images/students/saumya-srivastav.jpg" },
  { name: "Aarti Kumari", company: "Air India Express", role: "Ground Operations", photo: "/images/students/aarti-kumari.jpg" },
  { name: "Ananya", company: "IndiGo", role: "Ground Operations", photo: "/images/students/ananya.jpg" },
  { name: "Anushka Kishore", company: "Air India", role: "Cabin Crew", photo: "/images/students/anushka-kishore.jpg" },
];

// photo: add a real photo of the student (e.g. "/images/alumni/rahul-m.jpg"); initials are shown until then.
export const testimonials: { name: string; role: string; company?: string; quote: string; photo?: string }[] = [
  {
    name: "Rahul M",
    role: "Flight Attendant",
    company: "Qatar Airways",
    quote: "From Patna to the skies of Doha. The grooming sessions gave me the edge in my interview.",
  },
  {
    name: "Priya S",
    role: "Cabin Crew",
    company: "Vistara",
    quote: "They taught me to carry myself with confidence. Today, I fly with Vistara.",
  },
  {
    name: "Aman Raj",
    role: "Ground Operations Executive",
    quote: "Real industry experts and one-on-one guidance. I walked in truly prepared.",
  },
  {
    name: "Anjali Singh",
    role: "Hospitality & Customer Service",
    quote: "The grooming sessions changed my personality completely. I'm confident and well-spoken now.",
  },
  {
    name: "Nisha S",
    role: "Cabin Crew",
    company: "Air India",
    quote: "Placed with Air India after two selection rounds, thanks to the prep classes.",
  },
  {
    name: "Rishikesh",
    role: "Ground Operations Executive",
    company: "SpiceJet",
    quote: "Placed in SpiceJet after 10 months. Millennium delivers what it promises.",
  },
  {
    name: "Pooja Yadav",
    role: "Hospitality & Customer Service",
    company: "Qatar Airways",
    quote: "The internship and grooming exposure helped me crack Qatar Airways.",
  },
  {
    name: "Nidhi K",
    role: "Cabin Crew",
    quote: "I got placed before even finishing my 12-month course.",
  },
  {
    name: "Aman Kr",
    role: "Ground Operations Executive",
    quote: "Resume, interview practice, industry connections. They helped with all of it.",
  },
];

export const media = [
  { name: "Deccan Business", logo: "/images/media/deccan-business.jpg" },
  { name: "Samachar Sansar", logo: "/images/media/samachar-sansar.jpg" },
  { name: "The India Saga", logo: "/images/media/india-saga.jpg" },
  { name: "News Patrolling", logo: "/images/media/news-patrolling.jpg" },
];

export const eligibility = [
  { label: "Education", value: "10+2 (any stream — Arts, Science or Commerce)" },
  { label: "Age", value: "18 to 27 years" },
  { label: "Height (cabin crew)", value: "Minimum 155 cm for women · 170 cm for men" },
  { label: "Vision", value: "6/6" },
  { label: "Appearance", value: "Clear complexion, no visible tattoos or piercings" },
  { label: "Languages", value: "Fluency in English and Hindi" },
];

export const admissionSteps = [
  { title: "Free counselling", text: "Visit the campus or call us for a one-on-one session and a demo class." },
  { title: "Written test", text: "A short assessment of aptitude and English skills." },
  { title: "Group discussion", text: "We evaluate communication, confidence and teamwork." },
  { title: "Personal interview", text: "A conversation about your personality, goals and passion." },
  { title: "Enrolment", text: "Choose your batch, submit documents and start your journey." },
];

export const documents = [
  "10th & 12th mark sheets and certificates",
  "Identity proof (Aadhaar / PAN)",
  "Recent passport-size photographs",
  "Any other academic or professional certificates",
];

export const faqs = [
  {
    q: "What is the duration of the training programs?",
    a: "Our programs typically range from 6 months to 1 year, depending on the course you choose.",
  },
  {
    q: "Can students from any stream apply?",
    a: "Yes. Students who have completed 12th in any stream — Arts, Science or Commerce — are eligible to apply.",
  },
  {
    q: "Is job placement assistance provided?",
    a: "Yes, we provide 100% placement assistance including resume building, mock interviews and placement drives with airlines like IndiGo, Air India and SpiceJet, as well as leading hotel brands.",
  },
  {
    q: "Are there any physical or medical requirements?",
    a: "Roles like cabin crew require candidates to meet basic criteria for height, weight, vision and general health. Our counsellors will guide you on the specific requirements during admission.",
  },
  {
    q: "Is prior experience required?",
    a: "No. Our courses are designed for freshers as well as those looking for a career change.",
  },
  {
    q: "What are the fees? Are instalments available?",
    a: "Fees depend on the program you choose. We offer flexible instalment plans, scholarships for deserving students and loan facilities with easy EMI. Contact us for the current fee structure.",
  },
  {
    q: "Do you offer demo classes before admission?",
    a: "Yes, we encourage every student to attend a demo class or counselling session to experience our teaching style before enrolling.",
  },
  {
    q: "Is hostel accommodation available?",
    a: "Yes, optional hostel facilities are available with 24/7 CCTV surveillance and separate accommodation for girls and boys.",
  },
  {
    q: "What makes Millennium different from other institutes?",
    a: "We focus on practical training, grooming and placement support guided by real industry experts. Our personalised approach and our track record of 450+ placements set us apart.",
  },
];
