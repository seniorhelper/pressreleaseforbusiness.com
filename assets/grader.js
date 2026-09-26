/* =========================================================================
   Press Release Grader
   Runs entirely in the browser. Nothing is transmitted, stored or logged.
   Nine structural checks mirroring the Optimized tier's editorial pass.
   ========================================================================= */
(function () {
  'use strict';

  var VAGUE_DATE = /\b(soon|shortly|in the coming (?:weeks|months|days)|recently|in the near future|later this (?:year|month)|at a later date|to be announced|TBA|TBD)\b/gi;
  var SPECIFIC_DATE = /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t|tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{1,2}\b|\b\d{4}-\d{2}-\d{2}\b|\bQ[1-4]\s+\d{4}\b|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g;
  var HYPE = /\b(revolutionary|game[- ]chang(?:er|ing)|cutting[- ]edge|state[- ]of[- ]the[- ]art|world[- ]class|best[- ]in[- ]class|industry[- ]leading|unparalleled|unmatched|premier|_?leading_?|innovative|disruptive|seamless|robust|synerg(?:y|istic)|paradigm|next[- ]generation|one[- ]stop|turnkey|bespoke|thrilled|excited|delighted|proud to announce|pleased to announce)\b/gi;
  var ABSOLUTE = /\b(guarantee[ds]?|guaranteed|always|never fails?|100%|risk[- ]free|no risk|proven to|will (?:increase|double|triple|boost|generate))\b/gi;
  var QUOTE = /["\u201C\u201D][^"\u201C\u201D]{25,}["\u201C\u201D]/g;
  var ATTRIB = /\b(said|says|stated|according to|explained|added|noted|commented)\b/i;
  var TITLE = /\b(CEO|CFO|CTO|COO|President|Founder|Co[- ]?founder|Director|Manager|Owner|Partner|Principal|Chief\s+\w+|Vice President|VP|Head of|Lead)\b/i;
  var EMAIL = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  var PHONE = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
  var URL = /\b(?:https?:\/\/|www\.)[^\s<>"]+|\b[a-z0-9-]+\.(?:com|org|net|io|co|us|biz)\b/i;
  var NUMBER = /\b\d+(?:[.,]\d+)?%?\b/g;
  var PRONOUN_START = /^\s*(?:it|this|that|they|these|those|he|she|we)\b/i;

  var CHECKS = [
    {
      id: 'lead',
      name: 'The opening stands alone',
      why: 'An AI system often extracts your first paragraph without the headline attached. If it opens with "This new service" or "The company," the fragment it quotes makes no sense on its own. The opening has to name who did what.'
    },
    {
      id: 'claims',
      name: 'Claims are checkable',
      why: 'Guarantees and absolutes ("100%", "guaranteed", "proven to increase") are the fastest way to get a release distrusted, and in some sectors they create real legal exposure. Retrieval systems weight sources they can corroborate.'
    },
    {
      id: 'quote',
      name: 'A named person is quoted',
      why: 'A quote attributed to a person with a title is a citable unit. "We are excited about this opportunity" is not — vague quotes get skipped by AI systems entirely.'
    },
    {
      id: 'dates',
      name: 'Dates are specific',
      why: '"Soon" and "in the coming months" cannot be indexed, compared or verified. A specific date makes the announcement a fact with a position in time.'
    },
    {
      id: 'contact',
      name: 'Contact details are present',
      why: 'Without a way to reach the organization, a release is a dead end for a journalist and for an AI agent acting on a reader\u2019s behalf. This is the single most commonly missing item.'
    },
    {
      id: 'length',
      name: 'Length is in range',
      why: 'Under 200 words rarely carries enough substance to be worth citing. Over 1,400 and the important facts get buried. Most effective releases land between 350 and 800.'
    },
    {
      id: 'hype',
      name: 'Hype is under control',
      why: '"Revolutionary", "industry-leading", "thrilled to announce" — these carry no information and signal marketing copy rather than news. A few are survivable; a pile of them changes how the whole document is read.'
    },
    {
      id: 'structure',
      name: 'It is broken into sections',
      why: 'A wall of text is hard to extract a specific answer from. Sections let a retrieval system find the part that answers the question it was asked.'
    },
    {
      id: 'facts',
      name: 'It contains concrete facts',
      why: 'Numbers, dates, named places, named products. A release with no specifics has nothing for anyone to cite — it reads as an opinion about a company rather than news from it.'
    }
  ];

  function $(id) { return document.getElementById(id); }

  function words(t) {
    var m = t.trim().match(/\S+/g);
    return m ? m.length : 0;
  }

  function firstPara(t) {
    var parts = t.split(/\n\s*\n/).map(function (p) { return p.trim(); })
      .filter(function (p) { return p.length > 0; });
    // skip a headline-looking first line (short, no terminal period)
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      var w = words(p);
      if (w >= 18) return p;
    }
    return parts[parts.length - 1] || t;
  }

  function stripDateline(p) {
    return p.replace(/^[A-Z][A-Za-z.\s]{2,40},?\s*[A-Za-z.\s]{0,30}\s*[—–-]{1,2}\s*/, '')
            .replace(/^[A-Z\s,.]{4,40}\s*[—–-]{1,2}\s*/, '');
  }

  function count(t, re) {
    var m = t.match(re);
    return m ? m.length : 0;
  }

  function grade(text) {
    var n = words(text);
    var lead = stripDateline(firstPara(text));
    var results = [];

    /* 1 — lead independence */
    var leadStartsVague = PRONOUN_START.test(lead);
    var hasProperNoun = /\b[A-Z][a-zA-Z&'.-]+(?:\s+[A-Z][a-zA-Z&'.-]+)*/.test(lead.slice(0, 160));
    var leadPass = !leadStartsVague && hasProperNoun && words(lead) >= 15;
    results.push({
      pass: leadPass,
      detail: leadStartsVague
        ? 'The opening starts with a pronoun, so it does not make sense on its own if it is quoted without the headline.'
        : (!hasProperNoun ? 'The opening does not name the organization.'
          : (words(lead) < 15 ? 'The opening is very short — there may not be enough there to stand alone.'
            : 'The opening names who did what and reads independently.'))
    });

    /* 2 — checkable claims */
    var abs = count(text, ABSOLUTE);
    results.push({
      pass: abs === 0,
      detail: abs === 0
        ? 'No absolute or guarantee-style claims found.'
        : abs + ' absolute or guarantee-style claim' + (abs > 1 ? 's' : '') +
          ' found. These are the ones that create exposure as well as distrust.'
    });

    /* 3 — quote */
    var quotes = text.match(QUOTE) || [];
    var goodQuote = false;
    for (var i = 0; i < quotes.length; i++) {
      var idx = text.indexOf(quotes[i]);
      var around = text.slice(Math.max(0, idx - 200), Math.min(text.length, idx + quotes[i].length + 200));
      if (ATTRIB.test(around) && TITLE.test(around)) { goodQuote = true; break; }
    }
    results.push({
      pass: goodQuote,
      detail: quotes.length === 0
        ? 'No quote found. A named spokesperson makes the release citable.'
        : (goodQuote ? 'Quote found, attributed to a named person with a title.'
          : 'A quote is present but is not clearly attributed to a named person with a title.')
    });

    /* 4 — dates */
    var vague = count(text, VAGUE_DATE);
    var specific = count(text, SPECIFIC_DATE);
    results.push({
      pass: specific > 0 && vague === 0,
      detail: specific === 0
        ? 'No specific date found. Add the date this actually happens.'
        : (vague > 0 ? specific + ' specific date' + (specific > 1 ? 's' : '') + ', but ' + vague +
            ' vague reference' + (vague > 1 ? 's' : '') + ' such as "soon" or "in the coming months".'
          : specific + ' specific date' + (specific > 1 ? 's' : '') + ' and no vague timing language.')
    });

    /* 5 — contact */
    var hasE = EMAIL.test(text), hasP = PHONE.test(text), hasU = URL.test(text);
    var contactScore = (hasE ? 1 : 0) + (hasP ? 1 : 0) + (hasU ? 1 : 0);
    results.push({
      pass: contactScore >= 2,
      detail: contactScore === 0
        ? 'No contact details at all — no email, phone or web address.'
        : (contactScore === 1 ? 'Only one contact route found. Two is the practical minimum.'
          : 'Contact details present (' +
            [hasE ? 'email' : null, hasP ? 'phone' : null, hasU ? 'web' : null]
              .filter(Boolean).join(', ') + ').')
    });

    /* 6 — length */
    results.push({
      pass: n >= 200 && n <= 1400,
      detail: n < 200 ? n + ' words — too short to carry enough substance to cite.'
        : (n > 1400 ? n + ' words — over the limit, and the key facts will be buried.'
          : n + ' words — in range.')
    });

    /* 7 — hype */
    var hype = count(text, HYPE);
    var per500 = n > 0 ? (hype / n) * 500 : 0;
    results.push({
      pass: hype <= 2,
      detail: hype === 0 ? 'No hype language found.'
        : hype + ' hype phrase' + (hype > 1 ? 's' : '') + ' found' +
          (per500 >= 4 ? ' — dense enough that the whole document reads as marketing copy.' : '.')
    });

    /* 8 — structure */
    var paras = text.split(/\n\s*\n/).filter(function (p) { return p.trim().length > 40; }).length;
    var headings = (text.match(/^[^\n]{4,70}$/gm) || []).filter(function (l) {
      return !/[.!?]\s*$/.test(l.trim()) && words(l) >= 2 && words(l) <= 12;
    }).length;
    var structured = paras >= 4 || headings >= 2;
    results.push({
      pass: structured,
      detail: structured
        ? paras + ' paragraphs' + (headings >= 2 ? ' and section headings' : '') + ' — readable structure.'
        : 'Only ' + paras + ' substantial paragraph' + (paras === 1 ? '' : 's') +
          ' and no clear sections. Break it up.'
    });

    /* 9 — factual density */
    var nums = count(text, NUMBER);
    var per100 = n > 0 ? (nums / n) * 100 : 0;
    results.push({
      pass: nums >= 3 && per100 >= 0.7,
      detail: nums === 0 ? 'No numbers, figures or quantities anywhere.'
        : nums + ' numeric fact' + (nums > 1 ? 's' : '') +
          (nums < 3 ? ' — thin. Add specifics a reader could verify.' : ' — good factual density.')
    });

    return results;
  }

  function letterFor(passed) {
    if (passed >= 9) return { l: 'A+', k: 'a', v: 'Ready to publish.', s: 'This passes every check. Structurally there is nothing here we would send back.' };
    if (passed === 8) return { l: 'A', k: 'a', v: 'Strong.', s: 'One item short of clean. Worth fixing, but this is publishable as it stands.' };
    if (passed === 7) return { l: 'B', k: 'b', v: 'Solid, with gaps.', s: 'The structure is sound. Two items are working against it.' };
    if (passed === 6) return { l: 'C', k: 'c', v: 'It needs work.', s: 'Three failed checks is the point where AI systems start preferring a competitor they are surer about.' };
    if (passed === 5) return { l: 'D', k: 'd', v: 'This will underperform.', s: 'More than half the structural checks failed. Published as-is, this is unlikely to be cited by anything.' };
    if (passed >= 3) return { l: 'E', k: 'e', v: 'Not ready.', s: 'This reads as marketing copy rather than an announcement. A rewrite is faster than patching it.' };
    return { l: 'F', k: 'f', v: 'Do not publish this yet.', s: 'Almost every structural check failed. There is a real announcement in here somewhere, but this is not it yet.' };
  }

  function render(text) {
    var results = grade(text);
    var passed = results.filter(function (r) { return r.pass; }).length;
    var g = letterFor(passed);

    var out = $('g-out');
    out.hidden = false;
    out.setAttribute('data-grade', g.k);

    $('g-letter').textContent = g.l;
    $('g-verdict').textContent = g.v;
    $('g-sub').textContent = g.s;
    $('g-passed').textContent = passed;

    var ring = $('g-ring-fg');
    var circ = 2 * Math.PI * 52;
    ring.style.strokeDasharray = circ;
    ring.style.strokeDashoffset = circ;
    setTimeout(function () {
      ring.style.strokeDashoffset = circ - (circ * (passed / 9));
    }, 60);

    var html = '';
    for (var i = 0; i < CHECKS.length; i++) {
      var r = results[i], c = CHECKS[i];
      html += '<div class="g-check ' + (r.pass ? 'pass' : 'fail') + '" style="animation-delay:' +
        (i * 55) + 'ms">' +
        '<span class="g-mark" aria-hidden="true">' + (r.pass ? '&#10003;' : '&#10007;') + '</span>' +
        '<div class="g-check-body"><h4>' + c.name + '</h4><p>' + r.detail + '</p></div></div>';
    }
    $('g-checks').innerHTML = html;

    var failed = 9 - passed;
    if (passed >= 8) {
      $('g-cta').hidden = true;
      $('g-cta-good').hidden = false;
    } else {
      $('g-cta-good').hidden = true;
      $('g-cta').hidden = false;
      $('g-cta-h').textContent = failed + ' of these are things we fix by hand.';
      $('g-cta-p').textContent =
        'The Optimized tier is an editorial pass that addresses exactly this list, then adds the ' +
        'structured data — entity linking, FAQ markup, speakable passages and machine-readable ' +
        'contact data. If you would rather do it yourself, the guide is free and covers the same ground.';
    }

    var ex = '';
    for (var j = 0; j < CHECKS.length; j++) {
      ex += '<details class="g-ex"><summary>' + CHECKS[j].name + '</summary><p>' +
        CHECKS[j].why + '</p></details>';
    }
    $('g-explain').innerHTML = ex;

    out.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function init() {
    var input = $('g-in');
    if (!input) return;

    function updateCount() { $('g-words').textContent = words(input.value); }
    input.addEventListener('input', updateCount);
    updateCount();

    $('g-go').addEventListener('click', function () {
      var t = input.value.trim();
      if (words(t) < 30) {
        alert('Paste a bit more — at least 30 words — so there is something to grade.');
        input.focus();
        return;
      }
      render(t);
    });

    $('g-clear').addEventListener('click', function () {
      input.value = '';
      updateCount();
      $('g-out').hidden = true;
      input.focus();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
