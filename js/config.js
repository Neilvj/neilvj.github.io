/* =====================================================================
   SITE TEXT  -  your name, bio, jobs, education and contact details.
   Edit the text between the quotes. (Colors and sizes are in css/theme.css)
   ===================================================================== */

const SITE = {
  name: "Neil Ramnarine",
  bgWord: "WELCOME",                // big faded word behind the hero
  hello: "Hello",
  role: "3D printing technology student",
  tagline: "From Electrical Drawings to Printed Prototypes",
  subtitle: "Engineering experience meets additive manufacturing.",

  // Logo shown in the header (file in images/). Leave "" for no logo.
  logo: "logo.png",
  // Your photo in the About section (black and white). Leave "" for none.
  aboutPhoto: "neil-portrait.jpg",

  // CV: a PDF file in the documents/ folder. Leave "" to hide the CV buttons.
  cv: "Neil-Ramnarine-CV.pdf",
  cvLabel: "Download CV",

  // Photo in the hero. Put the file in the images/ folder. Leave "" for no photo.
  heroImage: "",
  // Wide banner in the About section (Unsplash is fine). Leave "" for none.
  aboutBanner: "",

  stats: [
    { number: "7",  label: "Years of hands-on 3D printing at home" },
    { number: "5",  label: "Years as electrical power engineer" }
  ],

  // About me text in two languages. The SV / EN switch at the bottom of the About section picks one.
  aboutText: {
    en: {
      eyebrow: "About",
      heading: "About me",
      paragraphs: [
        "Hello, I'm Neil. After a long-standing hobby in 3D printing, I am now studying additive manufacturing at Xenter YH. Before that, I spent five years as an electrical power engineer producing technical drawings.",
        "I work with FDM and resin printing, and I model technical parts in Autodesk Fusion. I have also used FreeCAD and some Blender. My projects combine school work, design experiments and functional parts for everyday use."
      ],
      experience: "Experience",
      education: "Education"
    },
    sv: {
      eyebrow: "Profil",
      heading: "Om mig",
      paragraphs: [
        "Hej, jag heter Neil. Efter många år med 3D-printing som hobby studerar jag nu additiv tillverkning på Xenter YH. Dessförinnan arbetade jag i fem år som elkraftsingenjör och tog fram tekniska ritningar.",
        "Jag arbetar med FDM- och resinprintning och konstruerar tekniska delar i Autodesk Fusion. Jag har också använt FreeCAD och lite Blender. Mina projekt är en blandning av skolarbeten, designexperiment och funktionella delar för vardagsbruk."
      ],
      experience: "Erfarenhet",
      education: "Utbildning"
    }
  },

  experience: [
    { title: "Electrical Power Engineer", place: "Gridtec",   date: "2022 – 2025", sv: { title: "Elkraftsingenjör" } },
    { title: "Power Consultant, Transmission", place: "Afry AB", date: "2021", sv: { title: "Elkraftskonsult, transmission" } },
    { title: "Team Leader", place: "CityMail AB", date: "2010 – 2019", sv: { title: "Teamledare" } }
  ],

  education: [
    { title: "3D Printing Technology", place: "Xenter", date: "2026 – ongoing", sv: { title: "3D-printteknik", date: "2026 – pågående" } },
    { title: "Electrical Power Engineer (YH)", place: "Stockholm Tekniska Institut", date: "2019 – 2021", sv: { title: "Elkraftsingenjör (YH)" } },
    { title: "Bachelor of Engineering", place: "Michigan State University", date: "1996 – 1999" }
  ],

  // Contact links. Leave "" to hide one.
  contact: {
    email:    "neilvj.inbox@gmail.com",            // shown in the message popup
    linkedin: "https://www.linkedin.com/in/neilvj",
    // Discord: paste EITHER a link (https://discord.com/users/YOUR_ID or a server invite)
    // OR just your username (then visitors get a button that copies it). "" hides it.
    discord:  "https://discord.com/users/1568963967424921600",

    // Message popup sends straight to your inbox if you paste a free access key from
    // web3forms.com (enter neilvj.inbox@gmail.com there, they email you the key).
    // While "" the popup opens a Gmail compose window instead.
    formKey:  "54d06813-bfcb-4b15-a773-c6f78d5b1c43"
  },

  // Shown in an empty project section (for example Personal Projects)
  comingSoon: "Coming soon",
  comingSoonText: "",                  // optional line under "Coming soon"

  // Dark "looking for an intern" section near the bottom, in two languages
  // (the SV / EN switch in the About section and in this band changes both).
  band: {
    en: {
      title: "Looking for a 3D print intern?",
      lead: "I'm looking for an internship (LIA) with a studio or company working with 3D printing and additive manufacturing. I'm also interested in the 3D scanning side and would love to get exposure to it and develop there.",
      points: [
        { title: "Hands-on with printers",
          text: "Seven years of printing at home on FDM and resin, including slicing, calibrating and troubleshooting." },
        { title: "Design with printing in mind",
          text: "I model in Autodesk Fusion and think about tolerances, snap-fits and supports from the first sketch." },
        { title: "An engineer's work habits",
          text: "Five years as an electrical power engineer: precise drawings, clear documentation and working with customers and contractors." }
      ],
      closing: "I want to learn how 3D printing is used from product development and prototyping through to production, and gradually take on more responsibility. And while I'm comfortable with printer maintenance, I'm sure there is much more to learn. Say hello below."
    },
    sv: {
      title: "Söker ni en LIA-praktikant inom 3D-print?",
      lead: "Jag söker LIA hos en studio eller ett företag som jobbar med 3D-print och additiv tillverkning. Jag är också intresserad av 3D-skanning och vill gärna få en inblick i den sidan och utvecklas där.",
      points: [
        { title: "Praktisk printvana",
          text: "Sju år av printing hemma med FDM och resin, med slicing, kalibrering och felsökning." },
        { title: "Konstruerar för printing",
          text: "Jag konstruerar i Autodesk Fusion och tänker på toleranser, snap-fit och support redan från första skissen." },
        { title: "Ingenjörens arbetssätt",
          text: "Fem år som elkraftsingenjör: noggranna ritningar, tydlig dokumentation och samarbete med kunder och entreprenörer." }
      ],
      closing: "Jag vill lära mig hur 3D-print används, från produktutveckling och prototyper till produktion, och successivt ta mer ansvar. Och även om jag är trygg med skrivarunderhåll finns det säkert mycket mer att lära. Hör av er nedan."
    }
  }
};
