/* ============================================================================
   Press Release For Business — newswire embed widget
   https://pressreleaseforbusiness.com/embed/

   Renders headlines, dates, issuing organizations and short snippets, each
   linking to the canonical release. It NEVER renders full release text —
   duplicating full announcements across sites is the pattern search engines
   penalize, so the widget is built so that it cannot happen.

   Install:
     <div data-prfb-wire></div>
     <script src="https://pressreleaseforbusiness.com/embed.js" defer></script>

   Options (attributes on the div):
     data-feed="all"          all | optimized | featured | <category>
     data-count="5"           1-20
     data-theme="auto"        auto | light | dark
     data-layout="list"       list | compact | cards
     data-title="Latest news" heading text, or "" for none
     data-snippet="true"      true | false
   ========================================================================== */
(function () {
  'use strict';

  var ORIGIN = 'https://pressreleaseforbusiness.com';
  var MAX = 20;
  var VALID = ['all', 'optimized', 'featured', 'accessibility', 'ecommerce',
               'education', 'health', 'home-services', 'insurance', 'marketing',
               'retail', 'small-business', 'technology'];

  var CSS = [
    '.prfbw{--pw-ink:#0f1524;--pw-ink2:#39435a;--pw-ink3:#6b7488;--pw-rule:#dfe4ed;',
    '--pw-bg:#fff;--pw-bg2:#f7f8fb;--pw-brand:#2a3fd4;--pw-sig:#00c2a8;',
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;',
    'color:var(--pw-ink);background:var(--pw-bg);border:1px solid var(--pw-rule);',
    'border-radius:10px;overflow:hidden;max-width:100%;box-sizing:border-box;line-height:1.5}',
    '.prfbw *,.prfbw *::before,.prfbw *::after{box-sizing:inherit}',
    '.prfbw--dark{--pw-ink:#f2f5fa;--pw-ink2:#c3cddd;--pw-ink3:#8fa0bb;--pw-rule:#28324a;',
    '--pw-bg:#0f1524;--pw-bg2:#161d30;--pw-brand:#7f92ff}',
    '.prfbw-hd{display:flex;align-items:center;justify-content:space-between;gap:10px;',
    'padding:12px 16px;background:var(--pw-bg2);border-bottom:1px solid var(--pw-rule)}',
    '.prfbw-hd h3{margin:0;font-size:11px;font-weight:800;letter-spacing:1.4px;',
    'text-transform:uppercase;color:var(--pw-ink)}',
    '.prfbw-hd a{font-size:11px;color:var(--pw-ink3);text-decoration:none;white-space:nowrap}',
    '.prfbw-hd a:hover{color:var(--pw-brand)}',
    '.prfbw-li{display:block;padding:14px 16px;border-bottom:1px solid var(--pw-rule);',
    'text-decoration:none;color:inherit;transition:background .15s}',
    '.prfbw-li:last-of-type{border-bottom:0}',
    '.prfbw-li:hover{background:var(--pw-bg2)}',
    '.prfbw-li:hover .prfbw-h{color:var(--pw-brand)}',
    '.prfbw-m{display:flex;flex-wrap:wrap;gap:4px 10px;align-items:center;margin-bottom:5px;',
    'font-size:10.5px;color:var(--pw-ink3);letter-spacing:.4px;text-transform:uppercase;font-weight:600}',
    '.prfbw-m b{color:var(--pw-ink2);font-weight:700}',
    '.prfbw-h{margin:0;font-size:15px;font-weight:650;line-height:1.35;color:var(--pw-ink);',
    'transition:color .15s}',
    '.prfbw-s{margin:6px 0 0;font-size:13px;color:var(--pw-ink3);line-height:1.5}',
    '.prfbw--compact .prfbw-li{padding:10px 14px}',
    '.prfbw--compact .prfbw-h{font-size:13.5px}',
    '.prfbw--compact .prfbw-s{display:none}',
    '.prfbw--cards{border:0;background:none;display:grid;gap:12px;',
    'grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}',
    '.prfbw--cards .prfbw-hd{grid-column:1/-1;border:1px solid var(--pw-rule);border-radius:8px}',
    '.prfbw--cards .prfbw-li{border:1px solid var(--pw-rule);border-radius:8px;',
    'background:var(--pw-bg)}',
    '.prfbw-ft{padding:9px 16px;font-size:10.5px;color:var(--pw-ink3);background:var(--pw-bg2);',
    'border-top:1px solid var(--pw-rule);text-align:center}',
    '.prfbw-ft a{color:var(--pw-ink3);text-decoration:none;border-bottom:1px solid transparent}',
    '.prfbw-ft a:hover{color:var(--pw-brand);border-bottom-color:currentColor}',
    '.prfbw-sk{padding:14px 16px;border-bottom:1px solid var(--pw-rule)}',
    '.prfbw-sk i{display:block;height:9px;border-radius:4px;background:var(--pw-rule);',
    'margin-bottom:7px;animation:prfbwP 1.3s ease-in-out infinite}',
    '.prfbw-sk i:nth-child(1){width:34%;height:7px}',
    '.prfbw-sk i:nth-child(2){width:92%;height:12px}',
    '.prfbw-sk i:nth-child(3){width:64%;height:12px;margin-bottom:0}',
    '@keyframes prfbwP{0%,100%{opacity:.45}50%{opacity:.9}}',
    '.prfbw-err{padding:16px;font-size:13px;color:var(--pw-ink3);text-align:center}',
    '.prfbw-err a{color:var(--pw-brand)}',
    '@media(prefers-reduced-motion:reduce){.prfbw-sk i{animation:none}}'
  ].join('');

  function injectCSS() {
    if (document.getElementById('prfbw-css')) return;
    var st = document.createElement('style');
    st.id = 'prfbw-css';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function fmtDate(iso) {
    var p = String(iso).split('-');
    if (p.length !== 3) return '';
    var M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var mi = parseInt(p[1], 10) - 1;
    if (mi < 0 || mi > 11) return '';
    return parseInt(p[2], 10) + ' ' + M[mi] + ' ' + p[0];
  }

  function resolveTheme(pref, el) {
    if (pref === 'light' || pref === 'dark') return pref;
    // auto: sample the host page's background behind the widget
    var node = el, bg = '';
    for (var i = 0; i < 6 && node && node !== document.documentElement; i++) {
      bg = window.getComputedStyle(node).backgroundColor;
      if (bg && bg !== 'transparent' && bg.indexOf('rgba(0, 0, 0, 0)') === -1) break;
      node = node.parentElement;
    }
    var m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(bg || '');
    if (m) {
      var lum = (0.299 * +m[1] + 0.587 * +m[2] + 0.114 * +m[3]);
      return lum < 128 ? 'dark' : 'light';
    }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark' : 'light';
  }

  function skeleton(n) {
    var out = '';
    for (var i = 0; i < n; i++) {
      out += '<div class="prfbw-sk"><i></i><i></i><i></i></div>';
    }
    return out;
  }

  function render(el, data, opt) {
    var items = (data && data.releases ? data.releases : []).slice(0, opt.count);
    if (!items.length) {
      el.innerHTML = '<div class="prfbw-err">No releases to show right now. ' +
        '<a href="' + ORIGIN + '/releases/" target="_blank" rel="noopener">Browse the wire →</a></div>';
      return;
    }
    var html = '';
    if (opt.title !== '') {
      html += '<div class="prfbw-hd"><h3>' + esc(opt.title) + '</h3>' +
              '<a href="' + ORIGIN + '/releases/" target="_blank" rel="noopener">View all &rarr;</a></div>';
    }
    items.forEach(function (r) {
      html += '<a class="prfbw-li" href="' + esc(r.url) +
              '" target="_blank" rel="noopener">' +
              '<div class="prfbw-m"><b>' + esc(r.organization) + '</b>' +
              '<span>' + esc(fmtDate(r.date)) + '</span></div>' +
              '<p class="prfbw-h">' + esc(r.headline) + '</p>' +
              (opt.snippet && r.snippet
                 ? '<p class="prfbw-s">' + esc(r.snippet) + '</p>' : '') +
              '</a>';
    });
    html += '<div class="prfbw-ft">Press releases via ' +
            '<a href="' + ORIGIN + '/" target="_blank" rel="noopener">Press Release For Business</a>' +
            ' &middot; announcements, not editorial reporting</div>';
    el.innerHTML = html;
  }

  function mount(el) {
    if (el.getAttribute('data-prfb-ready') === '1') return;
    el.setAttribute('data-prfb-ready', '1');

    var feed = (el.getAttribute('data-feed') || 'all').toLowerCase();
    if (VALID.indexOf(feed) === -1) feed = 'all';

    var count = parseInt(el.getAttribute('data-count') || '5', 10);
    if (isNaN(count) || count < 1) count = 5;
    if (count > MAX) count = MAX;

    var layout = (el.getAttribute('data-layout') || 'list').toLowerCase();
    if (['list', 'compact', 'cards'].indexOf(layout) === -1) layout = 'list';

    var titleAttr = el.getAttribute('data-title');
    var opt = {
      count: count,
      title: titleAttr === null ? 'Latest announcements' : titleAttr,
      snippet: el.getAttribute('data-snippet') !== 'false'
    };

    var theme = resolveTheme((el.getAttribute('data-theme') || 'auto').toLowerCase(), el);
    el.className = ((el.className || '') + ' prfbw prfbw--' + layout +
                    (theme === 'dark' ? ' prfbw--dark' : '')).trim();
    el.innerHTML = skeleton(Math.min(count, 3));

    var file = (feed === 'all') ? 'releases' : feed;
    fetch(ORIGIN + '/api/' + file + '.json', { cache: 'no-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (d) { render(el, d, opt); })
      .catch(function () {
        el.innerHTML = '<div class="prfbw-err">Couldn\'t load announcements. ' +
          '<a href="' + ORIGIN + '/releases/" target="_blank" rel="noopener">Read them here →</a></div>';
      });
  }

  function boot() {
    injectCSS();
    var nodes = document.querySelectorAll('[data-prfb-wire]');
    for (var i = 0; i < nodes.length; i++) mount(nodes[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // expose for sites that inject the container after page load
  window.PRFBWire = { refresh: boot };
})();
