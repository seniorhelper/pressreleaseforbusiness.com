#!/usr/bin/env python3
"""Carry Distribute Press Releases announcements on Press Release For Business.

Reads https://distributepressreleases.com/syndication/pressreleaseforbusiness.json,
writes releases/<slug>/index.html in this site's release design (rel=canonical
to the original, same label and disclosure), and adds each one to the top of the
"Latest releases" list on the home page and on /releases/. Never deletes a page.
"""
import json, re, html, os, base64, datetime, urllib.request

SRC = 'https://distributepressreleases.com/syndication/pressreleaseforbusiness.json'
TEMPLATE = 'releases/aging-safely-baths-new-website-launch/index.html'
SITE = 'https://pressreleaseforbusiness.com'
UA = 'Mozilla/5.0 (compatible; PRFBSync/1.0; +https://pressreleaseforbusiness.com/about/)'
CATS = {  # DPR industry -> this site's categories (data-cat, visible tag)
    'home-accessibility': ('home-services accessibility', 'Accessibility'),
    'home-services': ('home-services', 'Home Services'),
    'marketing-technology': ('marketing technology', 'Marketing'),
    'marketing': ('marketing', 'Marketing'),
    'technology': ('technology', 'Technology'),
    'health': ('health', 'Health'),
    'retail': ('retail', 'Retail'),
    'outdoor-gear': ('retail', 'Retail'),
    'insurance': ('insurance', 'Insurance'),
    'education': ('education', 'Education'),
    'ecommerce': ('ecommerce', 'Ecommerce'),
}
DEFAULT_CAT = ('small-business', 'Small Business')


def esc(s):
    return html.escape(str(s or ''), quote=True)


def day(iso):
    try:
        return datetime.date.fromisoformat(iso[:10])
    except Exception:
        return datetime.date.today()


def b64(s):
    return base64.b64encode(s.encode()).decode()


def build_page(tpl, it):
    x = it['_dpr']
    slug = re.sub(r'[^a-z0-9-]', '', x['slug'])
    url = '%s/releases/%s/' % (SITE, slug)
    canon, title, summary = it['url'], it['title'], it.get('summary', '')
    d = day(it.get('date_published', ''))
    long_d = d.strftime('%B %-d, %Y')
    t_tag = (title if len(title) <= 60 else title[:60].rsplit(' ', 1)[0] + '…') + ' | Press Release For Business'
    head, rest = tpl.split('<main id="main">', 1)
    after = rest.split('</main>', 1)[1]
    share = re.search(r'<div class="share" data-share>.*?</article>', rest, re.S).group(0)
    head = re.sub(r'<title>.*?</title>', lambda m: '<title>%s</title>' % esc(t_tag), head, flags=re.S)
    head = re.sub(r'<meta name="description" content="[^"]*">', lambda m: '<meta name="description" content="%s">' % esc(summary[:158]), head)
    head = re.sub(r'<link rel="canonical" href="[^"]*">', lambda m: '<link rel="canonical" href="%s">' % esc(canon), head)
    for attr, name, val in (('property', 'og:title', title), ('name', 'twitter:title', title),
                            ('property', 'og:description', summary), ('name', 'twitter:description', summary),
                            ('property', 'og:url', canon)):
        head = re.sub(r'<meta %s="%s" content="[^"]*">' % (attr, name),
                      lambda m: '<meta %s="%s" content="%s">' % (attr, name, esc(val)), head)
    head = re.sub(r'<meta property="article:published_time" content="[^"]*">',
                  lambda m: '<meta property="article:published_time" content="%s">' % d.isoformat(), head)
    graph = {"@context": "https://schema.org", "@graph": [
        {"@type": "NewsArticle", "@id": url + "#article", "headline": title[:110], "description": summary,
         "datePublished": d.isoformat(), "url": url, "mainEntityOfPage": canon, "isBasedOn": canon,
         "creditText": x.get('label', 'Press release'), "inLanguage": "en-US",
         "author": {"@type": "Organization", "name": x.get('company', ''),
                    **({"url": x['company_url']} if x.get('company_url') else {})},
         "publisher": {"@type": "Organization", "name": "Press Release For Business", "url": SITE + "/"}},
        {"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": SITE + "/"},
            {"@type": "ListItem", "position": 2, "name": "Releases", "item": SITE + "/releases/"},
            {"@type": "ListItem", "position": 3, "name": x.get('company', ''), "item": url}]}]}
    head = re.sub(r'(<script type="application/ld\+json">).*?(</script>)',
                  lambda m: m.group(1) + '\n' + json.dumps(graph, indent=2, ensure_ascii=False) + '\n' + m.group(2),
                  head, count=1, flags=re.S)
    content = re.sub(r'<(script|style|iframe)[^>]*>.*?</\1>', '', it.get('content_html', ''), flags=re.S | re.I)
    content = re.sub(r'<a href="(https?://[^"]+)"[^>]*>', r'<a href="\1" target="_blank" rel="noopener sponsored nofollow">', content)
    c = x.get('contact') or {}
    contact = ['<strong>%s</strong>' % esc(c.get('name') or x.get('company'))]
    if c.get('phone'):
        contact.append('Telephone: <a href="tel:%s">%s</a>' % (re.sub(r'[^0-9+]', '', c['phone']), esc(c['phone'])))
    if c.get('email'):
        e = b64(c['email'])
        contact.append('Email: <a href="#" class="eml" data-eml="%s"><span data-eml="%s"></span></a>' % (e, e))
    site_li = ('<li><a href="%s" target="_blank" rel="noopener sponsored nofollow">%s</a></li>'
               % (esc(x['company_url']), esc(re.sub(r'^https?://', '', x['company_url']).rstrip('/')))) if x.get('company_url') else ''
    main = '''<main id="main">

<div class="wrap"><nav class="crumb" aria-label="Breadcrumb">
  <a href="/">Home</a><span>&rsaquo;</span><a href="/releases/">Releases</a>
  <span>&rsaquo;</span>{company}</nav></div>

<div class="wrap">
  <article class="rel">
    <div class="rel-flag">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/>
        <path d="M12 16v-5M12 8h.01"/></svg>
      <span><strong>{label}.</strong> {disclosure} Carried here from <a href="{canon}">Distribute Press Releases</a>, where it was first published. <a href="/guidelines/">Our publishing standards &rarr;</a></span>
    </div>

    <p class="rel-kicker">For immediate release &middot; via Distribute Press Releases</p>
    <h1>{title}</h1>
    <p class="subhead">{summary}</p>

    <div class="rel-meta">
      <span class="org"><strong>{company}</strong>
        <span>Issuing organization</span></span>
      <span class="sp"></span>
      <span class="dateline">{date}</span>
    </div>

{content}

    <p class="rel-end">###</p>
{entity}
    <div class="rel-contact">
      <h3>Media contact</h3>
<p>{contact}</p>
    </div>

{share}
</div>
'''.format(company=esc(x.get('company')), label=esc(x.get('label', 'Press release')),
           disclosure=esc(x.get('disclosure', '')), canon=esc(canon), title=esc(title), summary=esc(summary),
           date=long_d, content=content, contact='<br>\n'.join(contact), share=share,
           entity=('''
    <div class="entity-box">
      <h4>Organization</h4>
      <p>Original release: <a href="{c}">{c}</a></p>
      <ul class="entity-list">
        {li}
      </ul>
    </div>
'''.format(c=esc(canon), li=site_li)))
    return slug, d, head + main + '</main>' + after


def row(it, d):
    x = it['_dpr']
    cat, tag = CATS.get(x.get('industry', ''), DEFAULT_CAT)
    href = '/releases/%s/' % x['slug']
    where = ', '.join(v for v in (x.get('city'), {'Colo.': 'Colorado'}.get(x.get('state'), x.get('state'))) if v)
    return '''      <article class="prow" data-cat="{cat}">
        <div class="prow-date"><strong>{dd}</strong>{mon}<br>{yy}</div>
        <div class="prow-main">
          <h3><a href="{href}">{title}</a></h3>
          <p>{summary}</p>
          <div class="prow-tags"><span class="ptag">{label}</span><span class="ptag cat">{tag}</span></div>
        </div>
        <div class="prow-side">
          <span class="prow-org"><strong>{company}</strong>{where}</span>
          <a class="prow-read" href="{href}">Read release &rarr;</a>
        </div>
      </article>
'''.format(cat=cat, dd=d.day, mon=d.strftime('%b').upper(), yy=d.year, href=href, title=esc(it['title']),
           summary=esc(it.get('summary')), label=esc(x.get('label', 'Press release')), tag=tag,
           company=esc(x.get('company')), where=esc(where))


def add_rows(path, rows):
    s = open(path, encoding='utf-8').read()
    anchor = '<div class="stack" id="release-stack" data-per="15">\n'
    if anchor not in s:
        print('no release stack in', path)
        return
    new = ''.join(r for href, r in rows if ('href="%s"' % href) not in s)
    if new:
        open(path, 'w', encoding='utf-8').write(s.replace(anchor, anchor + new, 1))


def main():
    req = urllib.request.Request(SRC, headers={'User-Agent': UA})
    feed = json.loads(urllib.request.urlopen(req, timeout=30).read())
    tpl = open(TEMPLATE, encoding='utf-8').read()
    rows, written = [], []
    for it in sorted(feed.get('items', []), key=lambda i: i.get('date_published', '')):
        slug, d, page = build_page(tpl, it)
        path = 'releases/%s/index.html' % slug
        if os.path.exists(path) and 'via Distribute Press Releases' not in open(path, encoding='utf-8').read():
            continue  # a native page owns this slug
        os.makedirs(os.path.dirname(path), exist_ok=True)
        if not os.path.exists(path) or open(path, encoding='utf-8').read() != page:
            open(path, 'w', encoding='utf-8').write(page)
            written.append(slug)
        rows.insert(0, ('/releases/%s/' % slug, row(it, d)))
    for p in ('index.html', 'releases/index.html'):
        add_rows(p, rows)
    print('items %d, pages written %d: %s' % (len(rows), len(written), ', '.join(written)))


if __name__ == '__main__':
    main()
