/* =====================================================================
   PROJECT LIST  -  one block per project. To add a project, copy a block,
   paste it inside the right list (school or personal), and edit it.

   image: file name inside the images/ folder (leave "" for a grey placeholder)
   video: (optional) file name inside the animation/ folder. Clicking the card plays it.
   model: (optional) .glb file name inside the models/ folder. Clicking the card opens a 3D view
          the visitor can rotate and zoom. With image left as "" the card shows the model itself.
   camera: (optional) camera used for a scan. Shown as one more white capsule after the tags.
   gallery: (optional) list of extra image file names inside the images/ folder, e.g. ["a.jpg", "b.jpg"].
          Clicking the card opens the card image first; arrows in the popup step through the extra images.
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
          model: "Perisphinctes.glb",
          camera: "Sony Xperia 1 VII"
        },
        {
          title: "Painted sculpture",
          text: "Photogrammetry scan from 128 photos, compiled with RealityScan and Blender. Click to rotate and zoom.",
          tags: ["Scan", "RealityScan", "Blender"],
          image: "",
          model: "Statue_large.glb",
          camera: "Nikon D7200 + Nikkor 17-55mm DX"
        }
      ]
    }
  ],

  personal: [
    {
      title: "Phone and tablet stand",
      text: "Desk stand for a phone or tablet with a groove that holds the S Pen. Click to see the print.",
      tags: ["Fusion", "Creality Print", "FDM"],
      image: "tablet-stand-slicer.jpg",
      gallery: ["tablet-stand-print.jpg", "tablet-stand-in-use.jpg"]
    },
    {
      title: "Desk shelf supports",
      text: "Printed side supports with a circle lattice that carry a wooden monitor shelf. Click to see the print.",
      tags: ["Fusion", "Creality Print", "FDM"],
      image: "desk-shelf-slicer.jpg",
      gallery: ["desk-shelf-desk.jpg", "desk-shelf-lattice.jpg"]
    }
  ]
};
