#!/usr/bin/env python3
"""Weekly Google Scholar sync for the PATENT Lab site.

What it updates
  assets/data/metrics.json       citations, h-index, i10 for everyone in people.json with a Scholar link,
                                 plus lab-wide publication and citation totals
  assets/data/publications.json  journal and conference papers since `start_year` from the faculty profiles,
                                 merged across profiles; entries marked "curated": true are always kept
  scripts/cache/scholar_rows.json last good copy of each profile, used whenever a fetch fails

How it fetches
  1. Google Scholar directly (polite delays between requests).
  2. If Scholar blocks the request and SERPAPI_KEY is set, the SerpAPI google_scholar_author engine.
  3. Otherwise the cached copy, so a blocked run never wipes data.

Usage
  python3 scripts/sync_scholar.py            fetch and rebuild
  python3 scripts/sync_scholar.py --offline  rebuild from the cache only (no network)

Standard library only.
"""
import html
import json
import os
import random
import re
import sys
import time
import urllib.parse
import urllib.request
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)
PEOPLE, PUBS, METRICS = P("assets/data/people.json"), P("assets/data/publications.json"), P("assets/data/metrics.json")
CONFIG, CACHE = P("scripts/scholar_config.json"), P("scripts/cache/scholar_rows.json")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"


def load(path, default):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return default


def save(path, data, indent=1):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=indent, ensure_ascii=False)
        f.write("\n")


def scholar_id(url):
    m = re.search(r"user=([\w-]+)", url or "")
    return m.group(1) if m else None


# --------------------------------------------------------------------------- fetching
class Blocked(Exception):
    pass


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "en-US,en;q=0.9"})
    with urllib.request.urlopen(req, timeout=40) as r:
        body = r.read().decode("utf-8", "ignore")
    if re.search(r"captcha|unusual traffic|not a robot", body, re.I):
        raise Blocked(url)
    return body


def clean(t):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", t))).strip()


def parse_page(s):
    """Rows and metrics from one Scholar profile page."""
    metrics, name = {}, None
    m = re.search(r'<div id="gsc_prf_in">(.*?)</div>', s, re.S)
    if m:
        name = clean(m.group(1))
    st = re.search(r'<table id="gsc_rsb_st">(.*?)</table>', s, re.S)
    if st:
        for tr in re.findall(r"<tr>(.*?)</tr>", st.group(1), re.S):
            cells = [clean(c) for c in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", tr, re.S)]
            if len(cells) == 3 and cells[1].isdigit():
                metrics[cells[0]] = {"all": int(cells[1]), "since": int(cells[2])}
    rows = []
    for tr in re.findall(r'<tr class="gsc_a_tr">(.*?)</tr>', s, re.S):
        a = re.search(r'<a href="([^"]+)" class="gsc_a_at">(.*?)</a>', tr, re.S)
        if not a:
            continue
        grays = re.findall(r'<div class="gs_gray">(.*?)</div>', tr, re.S)
        yr = re.search(r'class="gsc_a_h gsc_a_hc gs_ibl">(\d{4})<', tr)
        cites = re.search(r'class="gsc_a_ac gs_ibl"[^>]*>(\d*)<', tr)
        venue = re.sub(r",?\s*\d{4}$", "", clean(grays[1]) if len(grays) > 1 else "").strip()
        rows.append({"title": clean(a.group(2)), "authors": clean(grays[0]) if grays else "", "venue": venue,
                     "year": int(yr.group(1)) if yr else None,
                     "cites": int(cites.group(1)) if cites and cites.group(1) else 0,
                     "url": "https://scholar.google.com" + html.unescape(a.group(1))})
    return name, metrics, rows


def fetch_scholar(sid, all_pages, start_year):
    name, metrics, rows = None, {}, []
    for cstart in range(0, 1000, 100):
        url = f"https://scholar.google.com/citations?user={sid}&hl=en&view_op=list_works&sortby=pubdate&cstart={cstart}&pagesize=100"
        n, m, r = parse_page(get(url))
        name, metrics = name or n, metrics or m
        rows += r
        years = [x["year"] for x in r if x["year"]]
        if not all_pages or len(r) < 100 or (years and min(years) < start_year):
            break
        time.sleep(random.uniform(6, 11))
    if not metrics:
        raise Blocked(f"no metrics parsed for {sid}")
    return {"name": name, "metrics": metrics, "rows": rows}


def fetch_serpapi(sid, all_pages, start_year, key):
    name, metrics, rows = None, {}, []
    for start in range(0, 1000, 100):
        q = urllib.parse.urlencode({"engine": "google_scholar_author", "author_id": sid, "api_key": key,
                                    "hl": "en", "sort": "pubdate", "num": 100, "start": start})
        with urllib.request.urlopen("https://serpapi.com/search.json?" + q, timeout=60) as r:
            d = json.load(r)
        if d.get("error"):
            raise RuntimeError(d["error"])
        name = name or d.get("author", {}).get("name")
        if not metrics:
            for row in d.get("cited_by", {}).get("table", []):
                for k, label in (("citations", "Citations"), ("h_index", "h-index"), ("i10_index", "i10-index")):
                    if k in row:
                        vals = list(row[k].values())
                        metrics[label] = {"all": int(vals[0]), "since": int(vals[1]) if len(vals) > 1 else int(vals[0])}
        arts = d.get("articles", [])
        for a in arts:
            y = str(a.get("year") or "")
            rows.append({"title": a.get("title", ""), "authors": a.get("authors", ""),
                         "venue": re.sub(r",?\s*\d{4}$", "", a.get("publication", "")).strip(),
                         "year": int(y) if y.isdigit() else None,
                         "cites": int((a.get("cited_by") or {}).get("value") or 0), "url": a.get("link", "")})
        years = [x["year"] for x in rows if x["year"]]
        if not all_pages or len(arts) < 100 or (years and min(years) < start_year):
            break
    return {"name": name, "metrics": metrics, "rows": rows}


# --------------------------------------------------------------------------- publication rules
EXCLUDE = [
    (r"arxiv|preprints|medrxiv|techrxiv|biorxiv|ssrn|research square", "preprint"),
    (r"patent app|us patent", "patent"),
    (r"^mississippi state university$|university$|dissertation|thesis", "thesis/dissertation"),
    (r"meeting abstracts|abstracts", "abstract"),
    (r"^springer nature$|studies in computational intelligence|^springer$|^elsevier$|^crc press", "book"),
    (r"^doi$", "venue unknown"),
    (r"^ieee$", "venue incomplete"),
    (r"^nsf award", "grant record"),
    (r"^malware analysis using artificial intelligence", "book chapter"),
    (r"stylistic of persian poem", "not this author"),
    (r"^$", "no venue listed"),
]
CONF = (r"conference|proceedings|symposium|congress|workshop|annual meeting|exposition|world forum|annals of computer science"
        r"|phm society|flairs|\bsummit\b|icmla|big ?data|cogmi|intelligence and security informatics|hotsos|\bchase\b|\bcai\b|\btps\b|\bcic\b|acsac")
CASE = [(r"\bai\b", "AI"), (r"\bllms\b", "LLMs"), (r"\bllm\b", "LLM"), (r"\bchatgpt\b", "ChatGPT"), (r"\bhmm\b", "HMM"),
        (r"\biot\b", "IoT"), (r"\bmlops\b", "MLOps"), (r"\bmri\b", "MRI"), (r"\becg\b", "ECG"), (r"\bmedinsight\b", "MedInsight"),
        (r"\btwinexplainer\b", "TwinExplainer"), (r"\blocalintel\b", "LocalIntel"), (r"\baad-LLM\b", "AAD-LLM"), (r"\bcnn\b", "CNN"),
        (r"\bbagley college of engineering\b", "Bagley College of Engineering"),
        (r"\bmississippi state university\b", "Mississippi State University"), (r"\bieee\b", "IEEE"), (r"IEEE access\b", "IEEE Access")]
TOPICS = {
    "security": r"intrusion|malware|cyber|secur|threat|ddos|proof of work|privacy|zero trust|attack|adversarial|poison|firewall|rules of engagement|defense|whitelist|bugs framework|cwe|vulnerab|ransomware|phishing",
    "healthcare": r"patient|medical|clinical|sepsis|covid|\bhealth(?:care)?\b|hospital|mri|lesion|sclerosis|cancer|tumor|retinal|ecg|arrhythmia|mental|ventilation|hipaa|drug|protein|compartmental|disinfection|disease|brain",
    "cps": r"robot|humanoid|vehicle|navigation|path planning|digital twin|cyber-physical|maintenance|remaining useful|machinery|fault|charging|internet of things|iot|smart cit|coverage|manufacturab|farming|agricultur|drone|uav|unmanned",
    "vision": r"image|vision|visual|lidar|point cloud|obstacle|crack detection|mri|flair|rgb|gaze|surface|handwritten|ocr|hyperspectral|segmentation|u-net|video|denois|pixel",
    "xai": r"explainab|interpretab|explanation|explainer|rule extraction|neuro-?symbolic|knowledge graph|graphrag|ontology|counterfactual|game theory|neurocognitive|cognitive",
}


def fix_case(t):
    for rx, rep in CASE:
        t = re.sub(rx, rep, t, flags=re.I)
    return t[:1].upper() + t[1:]


def tidy_venue(v):
    trunc = "…" in v
    v = v.replace("…", "").strip().rstrip(",")
    if trunc:
        v = re.sub(r"\s+(and|of|on|for|in|the|&)$", "", v, flags=re.I)
    if v.count("(") > v.count(")"):
        v = v[: v.rfind("(")].strip()
    return fix_case(v)


def key(t):
    t = re.sub(r"^research article\s+", "", t.lower())
    return " ".join(re.sub(r"[^a-z0-9 ]", "", t).split()[:8])


def topics(title):
    t = title.lower()
    return [k for k, rx in TOPICS.items() if re.search(rx, t)]


def name_key(a):
    parts = a.replace("Dr. ", "").replace(".", "").split()
    return (parts[0][0] + " " + parts[-1]).lower() if len(parts) > 1 else a.lower()


def slug(name):
    return re.sub(r"[^a-z]", "", name.replace("Dr. ", "").split()[-1].lower())


def build_publications(profiles, faculty, old, cfg):
    start = cfg["start_year"]
    skip = {s.lower() for s in cfg.get("skip_titles", [])}
    kept, excluded = [], []
    for sid, fslug in faculty.items():
        for r in profiles.get(sid, {}).get("rows", []):
            if not r["year"] or r["year"] < start:
                continue
            v = r["venue"].strip()
            reason = next((why for rx, why in EXCLUDE if re.search(rx, v, re.I)), None)
            if r["title"].strip().lower() in skip:
                reason = "skipped"
            if reason:
                excluded.append(reason)
                continue
            kept.append({"title": fix_case(r["title"].rstrip(".")), "year": r["year"],
                         "type": "conference" if re.search(CONF, v, re.I) else "journal",
                         "authors": r["authors"], "venue": tidy_venue(v), "url": r["url"],
                         "cites": r["cites"], "faculty": [fslug]})

    curated = [dict(p) for p in old if p.get("curated")]
    best = {}

    def find(k):
        for e in best:
            if e == k or e.startswith(k) or k.startswith(e):
                return e
        return None

    def score(p):  # curated wins, then a venue with page numbers, then more citations, then newer
        return (bool(p.get("curated")), bool(re.search(r"\d+\s*[-–]\s*\d+|\(\d+\)", p.get("venue", ""))), p.get("cites", 0), p["year"])

    for p in curated + kept:
        k = find(key(p["title"])) or key(p["title"])
        if k in best:
            a, b = best[k], p
            win = dict(a if score(a) >= score(b) else b)
            win["faculty"] = sorted(set(a.get("faculty", [])) | set(b.get("faculty", [])))
            win["cites"] = max(a.get("cites", 0), b.get("cites", 0))
            best[k] = win
        else:
            best[k] = p
    for a, b in cfg.get("aliases", {}).items():
        ka, kb = find(key(a)), find(key(b))
        if ka and kb and ka != kb:
            gone = best.pop(ka)
            best[kb]["faculty"] = sorted(set(best[kb].get("faculty", [])) | set(gone.get("faculty", [])))
            best[kb]["cites"] = max(best[kb].get("cites", 0), gone.get("cites", 0))

    fac_names = {name_key(n): s for s, n in ((s, n) for s, n in faculty_names.items())}
    brains = [key(t) for t in cfg.get("brains_titles", [])]
    director = cfg.get("brains_director_slug", "golilarz")
    pubs = list(best.values())
    for p in pubs:
        authors = {name_key(a) for a in p.get("authors", "").split(", ") if a and a != "..."}
        from_authors = {s for nk, s in fac_names.items() if nk in authors}
        # curated entries: the verified author list is the only source of faculty credit
        p["faculty"] = sorted(from_authors) if p.get("curated") else sorted(set(p.get("faculty", [])) | from_authors)
        p["topics"] = topics(p["title"])
        k = key(p["title"])
        p["labs"] = ["brains"] if any(k.startswith(b) or b.startswith(k) for b in brains) or (p["faculty"] == [director] and p["year"] >= 2025) else []
    order = {"journal": 0, "conference": 1, "workshop": 2, "poster": 3}
    pubs.sort(key=lambda p: (-p["year"], order.get(p["type"], 9), p["title"].lower()))
    return pubs, excluded


# --------------------------------------------------------------------------- main
faculty_names = {}


def main():
    offline = "--offline" in sys.argv
    cfg = load(CONFIG, {"start_year": 2021})
    start = cfg["start_year"]
    people = load(PEOPLE, {"people": []})["people"]
    cache = load(CACHE, {"profiles": {}})
    old_pubs = load(PUBS, {"publications": []})["publications"]
    serp_key = os.environ.get("SERPAPI_KEY", "").strip()

    targets = {}  # scholar id -> (name, is_faculty)
    for p in people:
        sid = scholar_id(p.get("scholar"))
        if sid:
            targets[sid] = (p["name"], p.get("group") == "faculty")
    faculty = {sid: slug(n) for sid, (n, fac) in targets.items() if fac}
    faculty_names.update({slug(n): n for sid, (n, fac) in targets.items() if fac})

    profiles, status = {}, {}
    blocked = False
    for i, (sid, (name, fac)) in enumerate(targets.items()):
        got = None
        if not offline and not blocked:
            try:
                if i:
                    time.sleep(random.uniform(7, 13))
                got = fetch_scholar(sid, fac, start)
                status[sid] = "scholar"
            except Blocked:
                blocked = True  # stop hammering Scholar for the rest of this run
                print(f"  Scholar blocked the request ({name}); switching to fallbacks.")
            except Exception as e:
                print(f"  Scholar fetch failed for {name}: {e}")
        if got is None and not offline and serp_key:
            try:
                got = fetch_serpapi(sid, fac, start, serp_key)
                status[sid] = "serpapi"
            except Exception as e:
                print(f"  SerpAPI failed for {name}: {e}")
        if got is None and sid in cache["profiles"]:
            got = cache["profiles"][sid]
            status[sid] = "cache"
        if got is None:
            status[sid] = "missing"
            continue
        if not got.get("rows") and sid in cache["profiles"]:
            got["rows"] = cache["profiles"][sid].get("rows", [])  # metrics-only result: keep cached rows
        profiles[sid] = got

    fresh = [s for s, v in status.items() if v in ("scholar", "serpapi")]
    if fresh:
        cache["profiles"].update({s: profiles[s] for s in fresh})
        cache["fetched"] = date.today().isoformat()
        save(CACHE, cache, indent=0)

    pubs, excluded = build_publications(profiles, faculty, old_pubs, cfg)
    if len(pubs) < 0.8 * len(old_pubs):
        print(f"Refusing to shrink the publication list from {len(old_pubs)} to {len(pubs)}; keeping the old file.")
        pubs = old_pubs
    else:
        save(PUBS, {"updated": cache.get("fetched", date.today().isoformat()),
                    "source": f"Google Scholar profiles of PATENT faculty, {start} onward; journal and conference papers",
                    "publications": pubs})

    m = {"updated": cache.get("fetched", date.today().isoformat()), "since": start, "people": {}, "faculty": {}}
    for sid, prof in profiles.items():
        mt = prof.get("metrics", {})
        if "Citations" not in mt:
            continue
        m["people"][sid] = {"name": targets[sid][0], "citations": mt["Citations"]["all"], "hIndex": mt["h-index"]["all"],
                            "i10": mt["i10-index"]["all"], "citationsSince": mt["Citations"]["since"]}
    for sid, s in faculty.items():
        m["faculty"][s] = {"name": targets[sid][0], "scholar": sid}
    m["lab"] = {"publications": len(pubs), "citations": sum(p.get("cites", 0) for p in pubs),
                "journal": sum(p["type"] == "journal" for p in pubs),
                "conference": sum(p["type"] in ("conference", "workshop") for p in pubs),
                "brains": sum("brains" in p.get("labs", []) for p in pubs)}
    save(METRICS, m)

    print(f"Profiles: " + ", ".join(f"{targets[s][0]}={v}" for s, v in status.items()))
    print(f"Publications: {m['lab']['publications']} ({m['lab']['journal']} journal, {m['lab']['conference']} conference), "
          f"citations {m['lab']['citations']}, BRAINS {m['lab']['brains']}; excluded {len(excluded)} Scholar rows")


if __name__ == "__main__":
    main()
