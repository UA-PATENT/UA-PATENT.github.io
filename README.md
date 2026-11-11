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
  "website": "https://example.com",
  "photo": "assets/img/people/jane-doe"
}
```

- `group` must be one of the `id`s in the `groups` list: `faculty`, `phd`, `ms`, `ug`. Empty groups are hidden.
- `office`, `scholar`, `linkedin`, `website`, and `photo` are optional. Fields you leave out are hidden.
- `lab: "brains"` adds a BRAINS Lab tag to the card.
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
- `cites`: Google Scholar citation count. `faculty`: which PATENT faculty are authors (`rahimi`, `mittal`, `amiri`, `neupane`). `labs`: `["brains"]` for BRAINS Lab papers. These fields drive the filters and the "Most cited" sort.
- `topics` drive the filters: `security`, `healthcare`, `cps`, `vision`, `xai`.
- `authors`, `venue`, `award`, and `status` are optional. Current lab members' names appear in bold automatically.
- The home page publication count and lab member count are read from these files, so they stay current.

**What's included:** journal and conference papers from 2021 onward on the Google Scholar profiles of Drs. Rahimi, Mittal, Amiri Golilarz, and Neupane, with duplicate versions merged. Preprints, theses, books, patents, and grant records are left out.

### Metrics and highlights

- [`assets/data/metrics.json`](assets/data/metrics.json) holds each faculty member's Scholar citations, h-index, and i10-index, plus lab totals: publications, citations to those papers, journal and conference counts, and BRAINS papers. Update it when you refresh the publication list.
- [`assets/data/highlights.json`](assets/data/highlights.json) lists the most-cited papers shown as poster cards on the home and Publications pages. `match` is the beginning of the paper's title in `publications.json`, which is where the citation count comes from. The figures in `assets/img/highlights/` come from each paper's arXiv version.

## Pages

| File | Page |
|---|---|
| `index.html` | Home |
| `research.html` | Research areas, focus areas, selected papers |
| `people.html` | Team (rendered from `people.json`) |
| `publications.html` | Searchable publications (rendered from `publications.json`) |
| `about.html` | History of the lab at MSU and UA, funders |
| `contact.html` | Contact details and how to join |
| `404.html` | Not-found page (uses root-relative links) |

Every page repeats the same navigation and footer. If you change one, update all of them.

## Design notes

- Styles live in `assets/css/style.css`. Colors are design tokens at the top, with dark and light themes.
- Motion follows the scroll position, using CSS scroll-driven animations where the browser supports them and a small JavaScript fallback elsewhere. It animates only `opacity` and `transform`.
- If the visitor's system asks for reduced motion, all motion is turned off.
- Lab at Mississippi State: <https://patent.cse.msstate.edu>
