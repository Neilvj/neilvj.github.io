# Neil Ramnarine – Portfolio

Personal portfolio for internship (LIA) and job applications in additive manufacturing. Plain HTML, CSS and JavaScript, no build step. Hosted on GitHub Pages.

## Where to change things

| What you want to change | File |
| --- | --- |
| Colours, font sizes, spacing, positions, grid columns, image filter | `css/theme.css` (the master list) |
| Name, role, About text and the intern section (both in English and Swedish), experience, education, contact details, CV file name | `js/config.js` |
| School Projects and Personal Projects | `js/projects.js` |
| Page structure | `index.html` |
| Layout rules (rarely needs touching) | `css/style.css` |

## Adding a project

1. Put the image in `images/` (JPG, ideally around 1600 px wide).
2. Add a block to the `school` or `personal` list in `js/projects.js`, copying an existing one:
   `title`, `text`, `tags`, `image`, and optionally `video` (file in `animation/`).
3. Upload the image and the changed file to GitHub.

Projects show 6 per page. When a section has more, arrows and dots appear to move between pages. Change the number with `--page-size` in `css/theme.css` (it is 2 on phones).

All project images show in black and white until clicked. This is set by `--card-image-filter` in `css/theme.css`.

## Replacing the CV

Put the new PDF in `documents/` and keep the file name `Neil-Ramnarine-CV.pdf`, or change `cv` in `js/config.js`.

## Contact form

The message popup sends through Web3Forms. The access key is `formKey` in `js/config.js`. It is a public key by design and only allows sending to the email address it was registered with.

## Publishing

Upload the files to the GitHub repository. GitHub Pages republishes automatically within a minute or two. File names are case-sensitive on GitHub, so `Image.JPG` and `image.jpg` are different files.

## Folders

- `css/` styles
- `js/` content and behaviour
- `images/` renders, portrait, logo, favicon, share preview
- `animation/` project videos
- `documents/` CV
