/* ============================================================
   PRESS RELEASE FOR BUSINESS — core scripts
   Search, filtering, sharing, navigation, checkout hooks.
   No dependencies.
   ============================================================ */
(function () {
  'use strict';

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------------------------------------------------------
     1. MOBILE NAV
     --------------------------------------------------------- */
  function initNav() {
    var t = document.getElementById('navtoggle');
    var n = document.getElementById('hdrnav');
    if (!t || !n) return;
    t.addEventListener('click', function () {
      var open = n.classList.toggle('open');
      t.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  /* ---------------------------------------------------------
     2. RELEASE SEARCH + FILTER
     Operates on the stacked rows already in the DOM, so the
     page works with JavaScript disabled — search simply
     becomes unavailable rather than the list disappearing.
     --------------------------------------------------------- */
  function initSearch() {
    var form = document.getElementById('psearch-form');
    var input = document.getElementById('psearch-input');
    var stack = document.getElementById('release-stack');
    if (!stack) return;

    var rows = Array.prototype.slice.call(stack.querySelectorAll('.prow'));
    var count = document.getElementById('res-count');
    var empty = document.getElementById('no-res');
    var filters = Array.prototype.slice.call(document.querySelectorAll('.pfilter'));
    var activeCat = 'all';

    rows.forEach(function (r) {
      r.dataset.hay = (r.textContent || '').toLowerCase().replace(/\s+/g, ' ');
    });

    function apply() {
      var term = (input && input.value || '').trim().toLowerCase();
      var words = term ? term.split(/\s+/) : [];
      var shown = 0;

      rows.forEach(function (r) {
        var catOK = activeCat === 'all' ||
                    (r.dataset.cat || '').split(' ').indexOf(activeCat) !== -1;
        var textOK = !words.length || words.every(function (w) {
          return r.dataset.hay.indexOf(w) !== -1;
        });
        var vis = catOK && textOK;
        r.style.display = vis ? '' : 'none';
        if (vis) shown++;
      });

      if (count) {
        if (term || activeCat !== 'all') {
          count.textContent = shown + (shown === 1 ? ' release' : ' releases') +
            (term ? ' matching "' + input.value.trim() + '"' : '') +
            (activeCat !== 'all' ? ' in ' + activeCat : '');
          count.style.display = '';
        } else {
          count.textContent = rows.length + ' releases';
          count.style.display = '';
        }
      }
      if (empty) empty.style.display = shown ? 'none' : '';
    }

    if (form) form.addEventListener('submit', function (e) { e.preventDefault(); apply(); });
    if (input) input.addEventListener('input', apply);

    filters.forEach(function (b) {
      b.addEventListener('click', function () {
        activeCat = b.dataset.cat || 'all';
        filters.forEach(function (x) {
          x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
        });
        apply();
      });
    });

    var q = new URLSearchParams(location.search).get('q');
    if (q && input) { input.value = q; }
    apply();
  }

  /* ---------------------------------------------------------
     3. SHARE
     Native share sheet where available, platform intents
     otherwise. No third-party scripts, no tracking pixels.
     --------------------------------------------------------- */
  function initShare() {
    var bar = document.querySelector('[data-share]');
    if (!bar) return;
    var url = window.location.href.split('#')[0];
    var title = (document.querySelector('meta[property="og:title"]') || {}).content ||
                document.title;

    var intents = {
      x: 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(title) +
         '&url=' + encodeURIComponent(url),
      linkedin: 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(url),
      facebook: 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url),
      email: 'mailto:?subject=' + encodeURIComponent(title) +
             '&body=' + encodeURIComponent(title + '\n\n' + url)
    };

    Array.prototype.forEach.call(bar.querySelectorAll('[data-sh]'), function (b) {
      var kind = b.getAttribute('data-sh');
      b.addEventListener('click', function () {
        if (kind === 'copy') {
          var done = function () {
            var old = b.innerHTML;
            b.classList.add('ok');
            b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' +
              '<path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>Copied';
            setTimeout(function () { b.classList.remove('ok'); b.innerHTML = old; }, 2200);
          };
          if (navigator.clipboard) {
            navigator.clipboard.writeText(url).then(done, done);
          } else {
            var ta = document.createElement('textarea');
            ta.value = url; document.body.appendChild(ta); ta.select();
            try { document.execCommand('copy'); } catch (e) {}
            document.body.removeChild(ta); done();
          }
          return;
        }
        if (kind === 'native') {
          if (navigator.share) { navigator.share({ title: title, url: url }); }
          return;
        }
        if (intents[kind]) {
          window.open(intents[kind], '_blank', 'noopener,width=600,height=560');
        }
      });
    });

    var nat = bar.querySelector('[data-sh="native"]');
    if (nat && !navigator.share) nat.style.display = 'none';
  }

  /* ---------------------------------------------------------
     4. CHECKOUT HOOKS
     Payment links are held in one place. Until they are filled
     in, the buttons explain themselves rather than failing
     silently or sending anyone to a dead URL.
     --------------------------------------------------------- */
  window.PRFB = window.PRFB || {};

  window.PRFB.CHECKOUT = {
    standard:  '',   // Stripe Payment Link — Standard, $19.99
    optimized: '',   // Stripe Payment Link — Optimized, $49.99
    network:   ''    // Stripe Payment Link — Network, $99
  };

  function initCheckout() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-tier]'), function (b) {
      var tier = b.getAttribute('data-tier');
      var link = (window.PRFB.CHECKOUT || {})[tier];
      if (link) {
        b.setAttribute('href', link);
        b.removeAttribute('data-pending');
        return;
      }
      b.setAttribute('href', '/submit/?tier=' + encodeURIComponent(tier));
      b.setAttribute('data-pending', 'true');
    });

    // Pre-select tier on the submission form when arriving from pricing
    var sel = document.getElementById('sub-tier');
    if (sel) {
      var t = new URLSearchParams(location.search).get('tier');
      if (t) {
        Array.prototype.forEach.call(sel.options, function (o) {
          if (o.value === t) sel.value = t;
        });
      }
    }
  }

  /* ---------------------------------------------------------
     5. FORMS — mailto handoff, no backend required
     --------------------------------------------------------- */
  function initForms() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-mailto]'), function (f) {
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var to = f.getAttribute('data-mailto');
        var subj = f.getAttribute('data-subject') || 'Website enquiry';
        var lines = [];
        Array.prototype.forEach.call(f.querySelectorAll('input,select,textarea'), function (el) {
          if (!el.name || el.type === 'submit') return;
          var lbl = f.querySelector('label[for="' + el.id + '"]');
          lines.push((lbl ? lbl.textContent.trim() : el.name) + ':\n' + el.value + '\n');
        });
        var note = f.querySelector('.form-note');
        if (note) { note.textContent = 'Opening your email client…'; note.style.display = 'block'; }
        window.location.href = 'mailto:' + to + '?subject=' + encodeURIComponent(subj) +
          '&body=' + encodeURIComponent(lines.join('\n'));
      });
    });
  }

  /* ---------------------------------------------------------
     6. WORD COUNTER on the submission form
     --------------------------------------------------------- */
  function initCounter() {
    var ta = document.getElementById('sub-body');
    var out = document.getElementById('wc');
    if (!ta || !out) return;
    function upd() {
      var w = ta.value.trim() ? ta.value.trim().split(/\s+/).length : 0;
      out.textContent = w + ' words';
      out.style.color = w > 1400 ? 'var(--amber)' : 'var(--ink-3)';
      if (w > 1400) out.textContent += ' — over the 1,400-word Standard limit';
    }
    ta.addEventListener('input', upd);
    upd();
  }

  /* ---------------------------------------------------------
     7. YEAR
     --------------------------------------------------------- */
  function initYear() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-yr]'), function (el) {
      el.textContent = new Date().getFullYear();
    });
  }

  function boot() {
    initNav(); initSearch(); initShare(); initCheckout();
    initForms(); initCounter(); initYear();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else { boot(); }
})();

/* ============================================================
   QUILL — tier recommender and eligibility checker
   A guided flow, not an open chat box. It answers the two
   questions that actually block a sale: which tier do I need,
   and will you publish mine.
   ============================================================ */
(function () {
  'use strict';

  var FLOW = {
    start: {
      bot: "I'm Quill. I can tell you which publishing tier fits your announcement, " +
           "or whether we'd publish it at all. Takes about thirty seconds.",
      opts: [
        ["Which tier do I need?", "goal"],
        ["Will you publish my announcement?", "elig"],
        ["What does 'Optimized' actually do?", "optwhat"],
        ["What does it cost?", "cost"]
      ]
    },

    goal: {
      bot: "What are you mainly trying to achieve?",
      opts: [
        ["Get the news on the record at a real URL", "r_standard"],
        ["Be found when people ask AI assistants about us", "q_profiles"],
        ["Reach beyond our own audience", "r_network"],
        ["Honestly not sure", "q_profiles"]
      ]
    },

    q_profiles: {
      bot: "Do you have verified profiles we could link your identity across &mdash; a Google " +
           "Business Profile, LinkedIn page, industry listings?",
      opts: [
        ["Yes, several", "r_optimized"],
        ["A couple", "r_optimized"],
        ["Just our website", "r_opt_thin"],
        ["What does that do?", "optwhat"]
      ]
    },

    elig: {
      bot: "Which of these best describes your announcement?",
      opts: [
        ["Product, service or location launch", "r_yes"],
        ["Funding, partnership or leadership change", "r_yes"],
        ["Research, data or an event", "r_yes"],
        ["Something health, investment or crypto related", "r_check"],
        ["Honestly, mostly for the link", "r_no"]
      ]
    },

    cost: {
      bot: "Three tiers, one-time per release, no subscription:<br><br>" +
           "<strong>Standard &mdash; $19.99</strong><br>Published as written, permanent URL, " +
           "dated and labelled.<br><br>" +
           "<strong>Optimized &mdash; $49.99</strong><br>Adds eight items of structural work " +
           "so retrieval systems can parse and cite it.<br><br>" +
           "<strong>Network &mdash; $99</strong><br>Adds editorial pickup and up to two " +
           "relevance-matched placements.<br><br>" +
           "Nothing is charged until you approve the final document.",
      opts: [
        ["Which one fits me?", "goal"],
        ["What's in the Optimized work?", "optwhat"],
        ["See the full comparison", "link_pricing"]
      ]
    },

    optwhat: {
      bot: "Eight things, but the one that matters most is <strong>entity linking</strong>.<br><br>" +
           "We declare in structured data that the business in your release is the same business " +
           "as the one at your website, your Google profile, your LinkedIn. That's how an AI " +
           "system decides scattered mentions describe one company rather than several.<br><br>" +
           "It isn't a hyperlink, so there's no link-scheme risk &mdash; and almost nobody in " +
           "this category does it.",
      opts: [
        ["Show me the other seven", "link_opt"],
        ["Does that guarantee I'll show up in AI answers?", "r_honest"],
        ["OK, which tier do I need?", "goal"]
      ]
    },

    r_honest: {
      bot: "No, and anyone promising that is guessing.<br><br>" +
           "What it does is remove a specific reason a system would leave you out &mdash; not " +
           "being able to confirm you're one business. That's a real obstacle removed, not an " +
           "outcome purchased. One release also isn't a strategy; several corroborating sources " +
           "over time is.",
      opts: [
        ["Fair. Show me the tiers", "link_pricing"],
        ["Submit an announcement", "link_submit"]
      ]
    },

    link_opt:     { rec: ["Optimized", "$49.99", "All eight items, itemized with what each one actually does.", "/optimization/", "Read the breakdown"] },
    link_pricing: { rec: ["Compare tiers", "", "Full line-by-line comparison of what each tier includes.", "/pricing/", "See pricing"] },
    link_submit:  { rec: ["Submit", "", "Send it for review. Nothing is charged until you approve the final document.", "/submit/", "Submit a release"] },

    r_standard: {
      bot: "<strong>Standard</strong> is probably right. You get a permanent canonical URL, an " +
           "explicit date, attribution and a labelled announcement &mdash; which is what " +
           "&ldquo;on the record&rdquo; actually requires.",
      rec: ["Standard", "$19.99", "Published as written at a permanent URL, up to 1,400 words.",
            "/submit/?tier=standard", "Submit a Standard release"]
    },
    r_optimized: {
      bot: "<strong>Optimized</strong> is the fit. With profiles to link across, entity linking " +
           "has something to work with &mdash; that's the item doing most of the work at this tier.",
      rec: ["Optimized", "$49.99", "Eight items of structural work, including sameAs entity linking.",
            "/submit/?tier=optimized", "Submit an Optimized release"]
    },
    r_opt_thin: {
      bot: "<strong>Optimized</strong> still helps &mdash; the rewritten opening, FAQ markup and " +
           "speakable passages don't depend on profiles. But honestly, entity linking is the " +
           "strongest part and it works better with more addresses to connect.<br><br>" +
           "Worth claiming your Google Business Profile first if you haven't. It's free and it " +
           "makes this materially more effective.",
      rec: ["Optimized", "$49.99", "Strong on its own; stronger once you have more verified profiles.",
            "/submit/?tier=optimized", "Submit an Optimized release"]
    },
    r_network: {
      bot: "<strong>Network</strong>. Everything in Optimized, plus editorial pickup on Action " +
           "Global News and up to two relevance-matched placements &mdash; matched by sector and " +
           "geography, capped deliberately.",
      rec: ["Network", "$99", "Optimized, plus editorial pickup and up to two matched placements.",
            "/submit/?tier=network", "Submit a Network release"]
    },
    r_yes: {
      bot: "That's squarely in what we publish. Send it over &mdash; we review before anything " +
           "is charged, and we'll tell you what needs changing before it goes live.",
      rec: ["Looks publishable", "", "Review happens before payment. Declined releases are refunded in full.",
            "/submit/", "Submit for review"]
    },
    r_check: {
      bot: "That needs a look. We decline investment solicitations and crypto offerings outright, " +
           "and we publish health-related announcements only where they describe a service rather " +
           "than promise an outcome.<br><br>" +
           "Send it anyway &mdash; we'll tell you straight away, and you're not charged unless we " +
           "can publish it.",
      rec: ["Needs review", "", "Read the guidelines first, then send it. No charge if we decline.",
            "/guidelines/", "Read the guidelines"]
    },
    r_no: {
      bot: "Then this isn't the right product, and I'd rather say so than take your money.<br><br>" +
           "Links in paid announcements carry sponsored attributes here &mdash; that's what " +
           "search engines expect and we don't sell exceptions. If the announcement has real " +
           "news in it, we're a good fit. If the link is the point, it won't do what you want.",
      rec: ["Worth reading first", "", "Our guidelines explain exactly what this does and doesn't buy.",
            "/guidelines/", "Read the guidelines"]
    }
  };

  var QUILL_SVG =
    '<svg viewBox="0 0 64 64" role="img" aria-label="Quill">' +
    '<rect x="12" y="10" width="34" height="44" rx="3" fill="#f7f8fb" stroke="#0f1524" stroke-width="3"/>' +
    '<path d="M20 20h18M20 28h18M20 36h12" stroke="#94a1ba" stroke-width="2.6" stroke-linecap="round"/>' +
    '<path d="M52 8c-9 4-16 13-18 23l-2 9 8-4c9-5 14-14 14-24z" fill="#00c2a8" stroke="#0f1524" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M32 40l-6 10" stroke="#0f1524" stroke-width="3" stroke-linecap="round"/>' +
    '<circle cx="44" cy="20" r="2.4" fill="#0f1524"/></svg>';

  function boot() {
    var root = document.getElementById('quill-root');
    if (!root) return;
    var panel = document.getElementById('quill-panel'),
        toggle = document.getElementById('quill-toggle'),
        log = document.getElementById('quill-log'),
        opts = document.getElementById('quill-opts'),
        dot = document.getElementById('quill-dot');
    if (!panel || !toggle || !log || !opts) return;

    function push(who, htmlStr) {
      var d = document.createElement('div');
      d.className = 'q-msg q-' + who;
      d.innerHTML = htmlStr;
      log.appendChild(d);
      log.scrollTop = log.scrollHeight;
      return d;
    }

    function recommend(r) {
      var d = document.createElement('div');
      d.className = 'q-rec';
      d.innerHTML = '<span class="rl">Recommended</span>' +
        '<div class="rt">' + r[0] + (r[1] ? ' <span style="font-size:16px;color:#94a1ba">' + r[1] + '</span>' : '') + '</div>' +
        '<p class="rp">' + r[2] + '</p>' +
        '<a href="' + r[3] + '">' + r[4] + ' &rarr;</a>';
      opts.innerHTML = '';
      opts.appendChild(d);
    }

    function go(key) {
      var node = FLOW[key];
      if (!node) return;
      opts.innerHTML = '';
      var typing = document.createElement('div');
      typing.className = 'q-msg q-bot q-typing';
      typing.innerHTML = '<i></i><i></i><i></i>';
      log.appendChild(typing);
      log.scrollTop = log.scrollHeight;

      setTimeout(function () {
        typing.remove();
        if (node.bot) push('bot', node.bot);
        if (node.rec) { recommend(node.rec); return; }
        (node.opts || []).forEach(function (o) {
          var b = document.createElement('button');
          b.className = 'q-opt';
          b.type = 'button';
          b.innerHTML = o[0];
          b.addEventListener('click', function () {
            push('me', o[0]);
            go(o[1]);
          });
          opts.appendChild(b);
        });
      }, 340 + Math.random() * 260);
    }

    var opened = false;
    toggle.addEventListener('click', function () {
      var open = panel.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (dot) dot.style.display = 'none';
      if (open && !opened) { opened = true; go('start'); }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else { boot(); }
})();
