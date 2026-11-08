/* =====================================================================
   PROJECT LIST  -  one block per project. To add a project, copy a block,
   paste it inside the right list (school or personal), and edit it.

   image: file name inside the images/ folder (leave "" for a grey placeholder)
   video: (optional) file name inside the animation/ folder. Clicking the card plays it.
   link:  (optional) page or PDF to open when clicked instead of the viewer
   An empty personal list shows the "Coming soon" box (text is in config.js).
   ===================================================================== */

const PROJECTS = {

  school: [
    {
      title: "Grip handle with name",
      text: "Ribbed grip with an inlaid name, modeled in Fusion.",
      tags: ["Fusion", "Render"],
      image: "grip-handle.jpg"
    },
    {
      title: "Propeller",
      text: "Three-blade propeller with a smooth hub, modeled in Fusion.",
      tags: ["Fusion", "Render"],
      image: "propeller.jpg"
    },
    {
      title: "Arch bridge",
      text: "Arch bridge with a truss structure between the arches.",
      tags: ["Fusion", "Render"],
      image: "arch-bridge.jpg"
    },
    {
      title: "Perfume bottle",
      text: "Faceted glass bottle with a wood cap and metal ring.",
      tags: ["Fusion", "Render"],
      image: "perfume-bottle.jpg"
    },
    {
      title: "Gingerbread house",
      text: "Small house with cut-out windows that let the light through.",
      tags: ["Fusion", "Render"],
      image: "gingerbread-house.jpg"
    },
    {
      title: "Phone case",
      text: "Bumper-style case with cut-outs for buttons and ports.",
      tags: ["Fusion", "Render"],
      image: "phone-case.jpg"
    },
    {
      title: "Playground structure",
      text: "Moving playground structure. Click to watch the animation.",
      tags: ["Fusion", "Animation"],
      image: "playground-swing.jpg",
      video: "playground-animation.mp4"
    }
  ],

  personal: [
    /* Coming soon. Add projects here later, same format as above. */
  ]
};
