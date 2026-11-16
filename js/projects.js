/* =====================================================================
   PROJECT SECTIONS - which list of projects goes where on the page.

   The projects themselves are no longer typed in here. They live in the data/ folder
   (cad.json, scanning.json, personal.json) and are added and edited through Pages CMS
   (app.pagescms.org): sign in with GitHub, open this repo, pick a list, "Add an entry".

   Fields of each project (all optional except title):
   title, text, tags (list), image (card thumbnail), gallery (extra images shown with arrows),
   model (.glb 3D file - clicking opens the rotate/zoom view), video (.mp4), camera, link.

   GROUPS: a section with several lists becomes text buttons above the cards (like CAD / Scanning).
   To add a group: add a line below, a matching data/<name>.json file containing [], and an
   entry for it in .pages.yml.
   ===================================================================== */

const PROJECT_SECTIONS = {
  school: [
    { group: "CAD",      file: "data/cad.json" },
    { group: "Scanning", file: "data/scanning.json" }
  ],
  personal: [
    { file: "data/personal.json" }       /* no group name = plain list without buttons */
  ]
};
