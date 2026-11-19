"""Generate the crawlable static and WordPress entries using the live case template."""
from functools import partial
from hashlib import sha256
from html import escape
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import re
from threading import Thread

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
DOMAIN = "https://editadesign.co.il"
WP_ASSETS = "/wp-content/plugins/edita-site/site/"


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def write_entry(destination, html):
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(html, encoding="utf-8", newline="\n")


def build_entries(page, origin):
    page.goto(origin + "/#work", wait_until="domcontentloaded")
    rows = page.locator("a.ix-row")
    page.wait_for_function("()=>document.querySelector('.ix-row')?.href && document.querySelector('.ix-row')?.getAttribute('href')?.startsWith('/')")
    paths = [row.get_attribute("href") for row in rows.all()]
    assert paths and len(set(paths)) == len(paths)
    asset_version = sha256((ROOT / "js/app.js").read_bytes()).hexdigest()[:12]
    css_version = sha256((ROOT / "css/site.css").read_bytes()).hexdigest()[:12]
    fonts = [tag for tag in (ROOT / "index.html").read_text(encoding="utf-8").splitlines()
             if tag.startswith("<link") and "fonts." in tag]

    for path in paths:
        page.locator(f'a.ix-row[href="{path}"]').dispatch_event("click")
        case = page.locator(".cs[role=dialog]")
        case.wait_for()
        assert page.url == origin + path
        markup = case.evaluate("(el) => el.outerHTML")
        title = escape(page.title(), quote=True)
        intro = case.locator("h1,h2,h3").all_text_contents()
        slug = path.strip("/").split("/")[-1]
        assert re.fullmatch(r"[a-z0-9-]+", slug)
        metadata = page.evaluate("""() => {
          const c = Component.prototype.data.call({}).find(p => p.href === location.pathname);
          return {summary: c.hook || c.challenge, image: c.img, name:c.name};
        }""")
        summary = escape(metadata["summary"], quote=True)
        image = metadata["image"].removeprefix(origin + "/")
        assert image.startswith("assets/") and intro
        for destination, prefix in [(ROOT / (path.strip("/") + "/index.html"), "../../"),
                                    (ROOT / ("pages" + path.rstrip("/") + ".html"), WP_ASSETS)]:
            # The direct-entry document contains the same case a visitor sees after a click.
            # Use ordinary links and a page heading even before the app takes over.
            body = markup.replace(origin + "/assets/", prefix + "assets/")
            body = body.replace(origin + "/#work", "../../#work").replace(origin + "/#contact", "../../#contact")
            body = re.sub(r'href="/projects/([a-z0-9-]+)/"', r'href="../\1/"', body)
            assert origin not in body
            html = f'''<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="edita-home" content="../../">
<title>{title}</title>
<meta name="description" content="{summary}">
<link rel="canonical" href="{DOMAIN}{path}">
<meta property="og:type" content="article">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{summary}">
<meta property="og:url" content="{DOMAIN}{path}">
<meta property="og:image" content="{DOMAIN}{WP_ASSETS}{image}">
<meta property="og:image:alt" content="{escape(metadata["name"])}">
{chr(10).join(fonts)}
<link rel="stylesheet" href="{prefix}css/site.css?v={css_version}">
<noscript><style>.cs .rv{{opacity:1;transform:none}}</style></noscript>
</head>
<body>
<div id="app"><div class="ed hf" dir="rtl">{body}</div></div>
<script src="{prefix}js/react.production.min.js"></script>
<script src="{prefix}js/react-dom.production.min.js"></script>
<script src="{prefix}js/dc-lite.js"></script>
<script src="{prefix}js/app.js?v={asset_version}"></script>
</body>
</html>
'''
            write_entry(destination, html)
        page.go_back(wait_until="commit")
        case.wait_for(state="detached")
    manifest = ROOT / "pages/index.json"
    pages = [p for p in json.loads(manifest.read_text()) if not p.startswith("projects/")]
    write_entry(manifest, json.dumps(pages + [p.strip("/") for p in paths], indent=2) + "\n")
    sitemap = ROOT / "pages/sitemap.xml"
    xml = re.sub(r'<url><loc>[^<]+/projects/[^<]+</loc>.*?</url>\s*', '', sitemap.read_text())
    urls = "".join(f"<url><loc>{DOMAIN}{p}</loc></url>\n" for p in paths)
    write_entry(sitemap, xml.replace("</urlset>", urls + "</urlset>"))
    print(f"Built {len(paths)} project routes")


if __name__ == "__main__":
    with ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=ROOT)) as server:
        Thread(target=server.serve_forever, daemon=True).start()
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(executable_path=os.environ.get("CHROME_BIN") or None)
            page = browser.new_page(reduced_motion="reduce")
            page.route("**/*", lambda route: route.continue_() if route.request.url.startswith("http://127.0.0.1:") and route.request.resource_type != "media" else route.abort())
            build_entries(page, f"http://127.0.0.1:{server.server_port}")
            browser.close()
        server.shutdown()
