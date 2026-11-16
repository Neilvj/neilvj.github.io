# Neil Ramnarine – Portfolio

Personal portfolio for internship (LIA) and job applications in additive manufacturing. Plain HTML, CSS and JavaScript, no build step. Hosted on GitHub Pages.

## Where to change things

| What you want to change | File |
| --- | --- |
| Colours, font sizes, spacing, positions, grid columns, image filter, 3D viewer background | `css/theme.css` (the master list) |
| Name, role, About text and the intern section (both in English and Swedish), experience, education, contact details, CV file name | `js/config.js` |
| School Projects and Personal Projects | Admin app or Pages CMS (see below), stored in `data/cad.json`, `data/scanning.json`, `data/personal.json` |
| Which list shows where, and group button names | Admin app (add, rename or delete a page), stored in `js/projects.js` |
| Photo, logo, CV, hero text, bio and contact buttons, from the phone | Admin app, "Site" tab, stored in `data/site.js` |
| Pages CMS forms and upload folders | `.pages.yml` |
| Page structure | `index.html` |
| Layout rules (rarely needs touching) | `css/style.css` |

## Admin app

`https://neilvj.github.io/admin/` is a small app for the phone or computer (it can be installed to the home screen). Log in with a GitHub token that has Contents: Read and write for this repository.

- **School projects / Personal projects:** add, edit, reorder and delete projects. The text buttons above the cards (CAD, Scanning) are called pages: "+ Page" adds one, and "Rename page" and "Delete page" change the open one. Adding a page creates its `data/<name>.json`, adds it to `js/projects.js` and adds its form to `.pages.yml`.
- **Site:** hero text and numbers, About photo and text (English and Swedish), logo, CV, and the buttons in the Contact section.

Site changes are saved in `data/site.js`. A setting listed there wins over the same setting in `js/config.js`. Everything else (experience, education, the intern section, tag tooltips) is still edited in `js/config.js`.

## Adding a project (Pages CMS)

1. Go to app.pagescms.org and sign in with GitHub. The first time, give it access to the `neilvj.github.io` repository.
2. Open the repository. The sidebar lists School projects - CAD, School projects - Scanning and Personal projects.
3. Open a list, add an entry and fill in the form: title, short description, tool tags, card image, and optionally extra images (shown with arrows), a 3D model (.glb), a video or the camera used.
4. Upload the files straight from the form, then Save. The site updates within a minute or two.

The order in the list is the order on the page. Projects can also be edited by hand in the JSON files in `data/`.

## Scans: Blender add-on

`tools/scan_to_web.py` turns a scan into a website-ready .glb in one click. Install it in Blender under Edit > Preferences > Add-ons > Install from Disk. Stand the model upright, then use the Web export tab in the sidebar (N) or File > Export > Scan for website (.glb). It joins the patches, reduces to 200,000 triangles if bigger, deletes loose bits and exports with Draco and JPEG 75.

School Projects is split into groups (CAD, Scanning) shown as text buttons above the cards. The first group shows first; clicking another button slides its cards in. In `js/projects.js` each group points to its own JSON file in `data/`.

Projects show 6 per page. When a section has more, arrows and dots appear to move between pages. Change the number with `--page-size` in `css/theme.css` (it is 2 on phones).

All project images show in black and white until clicked. This is set by `--card-image-filter` in `css/theme.css`.

## Replacing the CV

Use the admin app (Site tab, Logo and CV). By hand: put the new PDF in `documents/` and keep the file name `Neil-Ramnarine-CV.pdf`, or change `cv` in `js/config.js`.

## Contact form

The message popup sends through Web3Forms. The access key is `formKey` in `js/config.js`. It is a public key by design and only allows sending to the email address it was registered with.

## Publishing

Upload the files to the GitHub repository. GitHub Pages republishes automatically within a minute or two. File names are case-sensitive on GitHub, so `Image.JPG` and `image.jpg` are different files.

## Folders

- `css/` styles
- `js/` content and behaviour
- `data/` project lists (edited in the admin app or Pages CMS) and `site.js` (changes made in the admin app's Site tab)
- `admin/` the admin app (not linked from the site)
- `tools/` Blender add-on for scans (not used by the site itself)
- `images/` renders, portrait, logo, favicon, share preview
- `animation/` project videos
- `models/` 3D models (.glb) for projects with a rotatable 3D view
- `documents/` CV
