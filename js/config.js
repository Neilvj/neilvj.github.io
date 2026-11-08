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

  about: [
    "I moved from a long-time hobby in 3D printing to studying additive manufacturing at Xenter YH. Before that I spent five years as an electrical power engineer producing technical drawings.",
    "I work with FDM and resin printing. I model technical parts in Autodesk Fusion and have also used FreeCAD and some Blender. My projects mix school work, design experiments and functional parts for everyday use."
  ],

  experience: [
    { title: "Electrical Power Engineer", place: "Gridtec",   date: "2022 – 2025" },
    { title: "Power Consultant, Transmission", place: "Afry AB", date: "2021" },
    { title: "Team Leader", place: "CityMail AB", date: "2010 – 2019" }
  ],

  education: [
    { title: "3D Printing Technology", place: "Xenter", date: "2026 – ongoing" },
    { title: "Electrical Power Engineer (YH)", place: "Stockholm Tekniska Institut", date: "2019 – 2021" },
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

  // Dark band near the bottom
  band: {
    title: "Looking for a 3D print intern?",
    text:  "I am searching for an internship (LIA) in additive manufacturing, with an interest in 3D scanning. Let's talk.",
    button: "Get in touch"
  }
};
