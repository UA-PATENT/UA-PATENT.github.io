# PATENT Lab · The University of Alabama

Website of the Predictive Analytics and Technology Integration Lab (PATENT), Department of Computer Science, The University of Alabama. Served by GitHub Pages from the `main` branch.

Plain HTML, CSS, and JavaScript. No build step and no dependencies.

## Preview locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

The People and Publications pages load JSON files, so open the site through a local server. Opening the files directly with `file://` won't work.

## Updating the team

Edit [`assets/data/people.json`](assets/data/people.json). Each person is one entry:

```json
{
  "name": "Jane Doe",
  "role": "PhD Student",
  "group": "phd",
  "office": "Cyber Hall 3000",
  "email": "jdoe@crimson.ua.edu",
  "scholar": "https://scholar.google.com/citations?user=XXXX",
  "linkedin": "https://www.linkedin.com/in/xxxx/",
  "github": "https://github.com/xxxx",
  "website": "https://example.com",
  "photo": "assets/img/people/jane-doe"
}
```

- `group` must be one of the `id`s in the `groups` list: `faculty`, `phd`, `ms`, `ug`. Empty groups are hidden.
- `office`, `scholar`, `linkedin`, `github`, `website`, and `photo` are optional. Fields you leave out are hidden.
- `metrics` (faculty only) is a key into `metrics.json` (`rahimi`, `mittal`, `amiri`, `neupane`). It shows that person's Google Scholar citations and h-index on the card.
- Without `photo`, the card shows a blank portrait.

### Adding a headshot

Photos are 4:5 portraits in three files that share a base name:

```
assets/img/people/jane-doe-480.avif
assets/img/people/jane-doe-800.avif
assets/img/people/jane-doe.jpg        (800×1000 fallback)
```

Crop to 4:5 with the face in the upper third, then export the three sizes. Any image editor works. With Python and Pillow:

```python
from PIL import Image
im = Image.open("original.jpg").convert("RGB")   # already cropped to 4:5
for w in (480, 800):
    im.resize((w, w * 5 // 4), Image.LANCZOS).save(f"jane-doe-{w}.avif", quality=60)
im.resize((800, 1000), Image.LANCZOS).save("jane-doe.jpg", quality=84, optimize=True, progressive=True)
```

## Updating publications

Edit [`assets/data/publications.json`](assets/data/publications.json). The list is sorted newest first.

```json
{
  "title": "Paper title",
  "year": 2026,
  "type": "conference",
  "authors": "R. Patel, S. Mittal, S. Rahimi",
  "venue": "IEEE Conference 2026",
  "url": "https://doi.org/...",
  "topics": ["security", "xai"],
  "award": "Best Paper",
  "status": "Accepted"
}
```

- `type`: `journal`, `conference`, `workshop`, or `poster`.
- `cites`: Google Scholar citation count. `faculty`: which PATENT faculty are authors (`rahimi`, `mittal`, `golilarz`, `neupane`). These fields drive the filters and the "Most cited" sort.
- `topics` drive the filters: `security`, `healthcare`, `cps`, `vision`, `xai`.
- `authors`, `venue`, `award`, and `status` are optional. Current lab members' names appear in bold automatically.
- The home page publication count and lab member count are read from these files, so they stay current.

**What's included:** journal and conference papers from 2021 onward on the Google Scholar profiles of Drs. Rahimi, Mittal, Amiri Golilarz, and Neupane, with duplicate versions merged. Preprints, theses, books, patents, and grant records are left out.

**Partner lab:** the BRAINS Lab (sites.ua.edu/brains) is a partner, not part of PATENT. Its papers count as PATENT publications only when Dr. Rahimi or Dr. Mittal is a co-author; the sync script applies this rule (`partner_lab_*` in `scripts/scholar_config.json`). The site links to BRAINS from the footer and the About page only.

### Weekly Google Scholar sync

[`scripts/sync_scholar.py`](scripts/sync_scholar.py) refreshes everything that comes from Google Scholar. The [Weekly Google Scholar sync](.github/workflows/scholar-sync.yml) workflow runs it every Monday, and you can also start it from the Actions tab with **Run workflow**.

- Everyone in `people.json` with a `scholar` link gets citations, h-index, and i10-index in `metrics.json`. These appear on their People card. To add someone, add their Scholar link.
- Faculty profiles supply `publications.json`: journal and conference papers since `start_year` in [`scripts/scholar_config.json`](scripts/scholar_config.json), with copies of the same paper merged.
- Entries marked `"curated": true` are kept as written. Use this for papers with verified details, awards, or a DOI.
- If Google Scholar blocks the runner, the script tries [SerpAPI](https://serpapi.com) when a `SERPAPI_KEY` repository secret is set. Otherwise it keeps last week's copy in `scripts/cache/`, so a blocked run never wipes data.
- To run it locally: `python3 scripts/sync_scholar.py`. Add `--offline` to rebuild from the cache without any network requests.

### Highlights, awards, and posters

- **Highlights choose themselves.** The poster cards always show the six most-cited papers in `publications.json` (posters excluded), so they stay correct after every weekly sync. [`assets/data/highlights.json`](assets/data/highlights.json) only adds details, matched by the start of the title: a short title, a summary, a figure, a taxonomy, or an `illustration` topic, plus a `paper` link. Figures in `assets/img/highlights/` come from arXiv or open-access (CC BY) versions only; papers without one get a labeled research-area illustration.
- Award certificates: images are in `assets/img/awards/` and the original PDFs in `assets/docs/awards/`. The cards are written into `index.html` and `publications.html`.
- **Posters:** add an entry to [`assets/data/posters.json`](assets/data/posters.json). Put a portrait image, about 1200px wide, in `assets/img/posters/`, and optionally the PDF in `assets/docs/posters/`:

  ```json
  { "title": "Poster title", "authors": "R. Patel, S. Mittal", "event": "IEEE CogMI", "year": 2026,
    "image": "assets/img/posters/cogmi-2026.jpg", "pdf": "assets/docs/posters/cogmi-2026.pdf" }
  ```

  The Posters section on the Publications page stays hidden until the list has at least one entry.

### Contact form

The form on `contact.html` sends messages to **cs-patent@ua.edu** through [FormSubmit](https://formsubmit.co), because GitHub Pages can't send email itself.

**One-time activation:** the first message sent through the form triggers a FormSubmit email to cs-patent@ua.edu. Click **Activate Form** in it. Until then, visitors see a link that opens a pre-filled email instead. After activating, you can replace the address with FormSubmit's random alias: set `data-endpoint="https://formsubmit.co/ajax/<alias>"` on the form.

## Pages

| File | Page |
|---|---|
| `index.html` | Home |
| `research.html` | Research areas, focus areas, selected papers |
| `people.html` | Team (rendered from `people.json`) |
| `publications.html` | Searchable publications (rendered from `publications.json`) |
| `funding.html` | Current and past awards (NSF records), the McKay endowment, sponsors |
| `about.html` | History of the lab at MSU and UA, interdisciplinary scope |
| `contact.html` | Contact details, contact form, and how to join |
| `accessibility.html` | Accessibility statement and how to report problems |
| `404.html` | Not-found page (uses root-relative links) |

Every page repeats the same navigation and footer. If you change one, update all of them.

## Design notes

- Styles live in `assets/css/style.css`. Colors are design tokens at the top, with dark and light themes.
- Brand colors are UA Crimson `#9E1B32` and UA Gray `#828A8F`. Logo files are in `assets/img/logo/`:
  - `patent-mark.svg`: the crest mark, a shield with a P and an analytics bar chart.
  - `patent-lockup-light.svg` and `patent-lockup-dark.svg`: the full logo for light and dark backgrounds.
- **UA marks:** the nav shows UA's official Capstone A (Script A ®), and the footer shows the official UA wordmark. The unmodified files come from `assetfiles.ua.edu/brand/logos/` and live in `assets/img/ua/`. UA's rules require the Capstone A to appear with the University nameplate on the same page, so keep both. Don't recolor, redraw, or alter them; for other versions, contact Strategic Communications (brand.ua.edu).
- **Sponsor logos:** official logos for NSF, NSA, DoD, ERDC (U.S. Army Corps of Engineers), Army, DOE, DOT, and ARC are in `assets/img/sponsors/`. They were rendered unmodified from public-domain seals on Wikimedia Commons, nsf.gov, and arc.gov. The Funding page states that they identify funding sources and imply no endorsement; keep that sentence. NSF requires award recipients to use its logo. To add a sponsor, drop `name.webp` in that folder and add it to `SPONSOR_LOGOS` in the page generator.
- **Cache-busting:** every CSS and JS link carries `?v=<content hash>`, so visitors always get the current files after a change. Regenerate the pages after editing CSS or JS so the hash updates.
- The research simulations live in `assets/js/sims.js`. Any element with `data-sim="security|healthcare|cps|vision|training"` gets a canvas. The SVG inside it is the fallback. `data-compact` hides the text overlays.
- Motion follows the scroll position, using CSS scroll-driven animations where the browser supports them and a small JavaScript fallback elsewhere. It animates only `opacity` and `transform`.
- If the visitor's system asks for reduced motion, all motion is turned off.
- Lab at Mississippi State: <https://patent.cse.msstate.edu>

## Accessibility

The site targets **WCAG 2.2 Level AA**. As a public university site, it falls under the ADA Title II web rule, which requires WCAG 2.1 AA.

- Every page passes an [axe-core](https://github.com/dequelabs/axe-core) audit (WCAG 2.2 A/AA and best practices) with zero violations, in both light and dark themes, and reflows at 320px with no sideways scrolling. Re-run both checks after major changes.
- **Built in:** a skip link; landmarks and an ordered heading structure; visible focus; labels on every control; `aria-live` result counts; links that announce "opens in a new tab"; and scroll padding so sticky bars never hide the focused element.
- **Motion:** respects `prefers-reduced-motion`. The pause button in the nav stops all animation and is remembered (WCAG 2.2.2), and each simulation also has its own Pause button.
- **Contrast:** AA in both themes, extra contrast under `prefers-contrast: more`, and a solid-text fallback in Windows high-contrast mode (`forced-colors`).
- When you add content: write alt text for images, keep heading levels in order, and give PDFs a text equivalent on the page, as the award cards do.
