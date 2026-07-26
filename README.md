# நம்மமொய் | NammaMoi — Landing Website

A complete, production-ready landing website for **NammaMoi** — a family moi
(கொடை/நன்கொடை) register app rooted in South Indian Tamil family tradition.

Pure HTML + CSS + Vanilla JS. No frameworks, no build tools, no npm.
Open `index.html` in a browser and everything works.

## Project structure

```
NammaMoi/
├── index.html          Main landing page (10 sections)
├── privacy.html         Privacy Policy
├── help.html            Help Center (with live topic/FAQ search)
├── contact.html         Contact form + info
├── robots.txt
├── sitemap.xml           Placeholder — update lastmod/domain once deployed
├── css/
│   ├── style.css         Design tokens + base styles + every section
│   ├── responsive.css    Breakpoints (1200 / 992 / 768 / 560px, landscape)
│   └── animations.css    Keyframes + scroll-reveal classes
├── js/
│   ├── main.js           Header scroll state, mobile nav, smooth scroll,
│   │                     back-to-top, page loader
│   ├── animation.js      IntersectionObserver reveals, animated counters,
│   │                     light parallax
│   └── app.js            CONFIG object, FAQ accordion, dashboard tabs,
│                         contact form, help search
└── assets/
    ├── images/           (empty — hero/dashboard mockups are pure SVG/CSS)
    ├── icons/            favicon.svg (all other icons are inline SVG)
    └── fonts/            (empty — fonts load from Google Fonts by default)
```

## Design system

| Token | Value |
|---|---|
| Cream | `#FBF3E3` |
| Cream Deep | `#F1E4C8` |
| Maroon | `#7A1128` |
| Maroon Deep | `#4E0B1A` |
| Temple Gold | `#C89340` |
| Gold Light | `#E8C77E` |
| Dark Brown | `#2B1B12` |
| White / Ivory | `#FFFFFF` / `#FFFCF6` |

- **Display / Tamil type:** Noto Sans Tamil (700/800 weights for headlines)
- **Body / UI type:** Poppins (300–700)
- **Signature element:** a hand-drawn kolam (rangoli) motif — used as a
  faint full-bleed background texture in dark sections, and as small
  animated section dividers that "draw themselves" in on scroll — echoing
  the app's own theme of a family tradition passed down and re-drawn each
  generation. Twin brass kuthuvilakku lamps flank the hero phone mockup
  with a gentle independent flicker animation.

## Wiring up your Apps Script backend

Open `js/app.js` and fill in the `CONFIG` object at the top:

```js
const CONFIG = {
  API_URL:    "https://script.google.com/macros/s/XXXX/exec",
  LOGIN_URL:  "",
  SAVE_URL:   "",
  SEARCH_URL: "",
  REPORT_URL: ""
};
```

Nothing on this site currently calls a live backend — CTA buttons point to
in-page anchors, and the Contact form shows a local success message. Once
you have your deployment URL(s), wire them into the relevant `fetch()` /
`google.script.run`-style calls in `app.js`.

## Accessibility & performance notes

- Semantic landmarks (`header`, `main`, `footer`, `nav`), skip-link, visible
  focus rings, `aria-expanded`/`aria-label` on interactive controls.
- `prefers-reduced-motion` is respected globally — animations collapse to
  instant state changes.
- No render-blocking scripts (all JS is loaded at the end of `<body>`,
  no external JS dependencies).
- No custom web fonts beyond the two Google Fonts links; icons are inline
  SVG (no icon-font or image requests).

## Customizing content

All Tamil copy lives directly in the HTML files — no CMS, no placeholders.
Update figures (hero stats, dashboard numbers), testimonials, and FAQ
answers directly in `index.html`, `help.html`.

## Browser support

Modern evergreen browsers (Chrome, Edge, Safari, Firefox — last 2 versions).
Uses `IntersectionObserver`, CSS custom properties, `clamp()`, and CSS Grid.
