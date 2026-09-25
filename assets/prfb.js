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
