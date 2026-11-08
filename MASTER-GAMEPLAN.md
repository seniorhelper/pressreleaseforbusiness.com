# pressreleaseforbusiness.com · MASTER-GAMEPLAN
Last updated 2026-11-08 (overnight marketing session). Network plan: `Desktop\01 SEARCH CONVERTS LLC\Search Converts Website Network\05 TIER 3 - Authority - PR, News & Directories\`.

## Role
Paid press-release writing and distribution for small businesses (all sales final; submit-first path). Publishes client and network releases; carries releases from distributepressreleases.com. Links to eyetoad.com are nofollow/sponsored only and point at the apex host (fixed on main; the stale `secure-checkout` branch still had www links and is abandoned).

## State (Nov 8, 2026)
- Repo on `main` (was checked out on the stale `secure-checkout` branch locally; switched back Nov 8). Live on GitHub Pages.
- GA4 G-8JFKKTBLVC live on the home page and all but 5 pages (the 5 are redirect/utility pages). Search Console verified; GA4↔SC link pending.
- Lighthouse mobile (local lab): home 93 perf / 90 a11y / 100 BP / 100 SEO.
- llms.txt present. No AdSense (a sales site; keep it that way).
- Security: order/payment flows must stay on the invoice or Turnstile path (see `site-security-check`); never a public checkout button.

## Next steps
1. Accessibility misses on the home page (90): contrast or label issues, check with Lighthouse and fix in CSS only.
2. Confirm the order-request form delivers to the network lead catcher or FormSubmit with CAPTCHA (orders need CAPTCHA, not just a honeypot).
3. Publish only real releases; every claim sourced from the client.
4. Link GA4 to Search Console.
