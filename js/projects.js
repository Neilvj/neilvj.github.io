/* =====================================================================
   PROJECT LIST  -  one block per project. To add a project, copy a block,
   paste it inside the right list (school or personal), and edit it.

   image: file name inside the images/ folder (leave "" for a grey placeholder)
   video: (optional) file name inside the animation/ folder. Clicking the card plays it.
   model: (optional) .glb file name inside the models/ folder. Clicking the card opens a 3D view
          the visitor can rotate and zoom. With image left as "" the card shows the model itself.
   link:  (optional) page or PDF to open when clicked instead of the viewer
   An empty personal list shows the "Coming soon" box (text is in config.js).

   GROUPS: a list can be split into groups, like School Projects below (CAD, Scanning).
   Each group is  { group: "Button text", projects: [ ...project blocks... ] }  and becomes a
   text button above the cards. The first group shows first; clicking a button slides its cards in.
   To add a button, copy a whole group block. A list without groups (like personal) also works.
   ===================================================================== */

const PROJECTS = {

  school: [
    {
      group: "CAD",
      projects: [
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
      ]
    },
    {
      group: "Scanning",
      projects: [
        {
          title: "Perisphinctes fossil",
          text: "Scanned and compiled with RealityScan and Blender. Click to rotate and zoom.",
          tags: ["Scan", "RealityScan", "Blender"],
          image: "",
          model: "Perisphinctes.glb"
        }
      ]
    }
  ],

  personal: [
    /* Coming soon. Add projects here later, same format as above. */
  ]
};
