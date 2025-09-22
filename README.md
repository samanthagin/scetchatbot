# HubBot — Internal Links Chat Widget

A small, static, embeddable chat widget that helps employees find internal links by keywords and answers common FAQs.

## Quick start

Include these scripts on your existing site (ideally before </body>):

```html
<script src="/links.js"></script>
<script src="/faqs.js"></script>
<script src="/hubbot.js" data-links="/links.js" data-faqs="/faqs.js" data-position="bottom-right" data-title="Company Hub Chat"></script>
```

- data-links (optional): path to a script that defines `window.HUB_LINKS = [...]`.
- data-faqs (optional): path to a script that defines `window.HUB_FAQS = [...]`.
- data-position (optional): `bottom-right` (default), `bottom-left`, `top-right`, or `top-left`.
- data-title (optional): widget header title.

Click the floating badge to open the chat. Ask “How do I request PTO?” or “VPN setup”.

## Customize links

Edit `links.js`:

```js
window.HUB_LINKS = [
  { title: 'PTO Policy', url: 'https://intranet/pto', tags: ['hr','vacation'], description: 'Paid time off process.' },
  // ...
];
```

## Customize FAQs

Edit `faqs.js`:

```js
window.HUB_FAQS = [
  { question: 'How do I request PTO?', answer: 'Submit in HR portal...', tags: ['hr','pto'], relatedLinks: ['https://intranet/pto'] },
  // ...
];
```

## Notes

- Pure client-side; no external calls beyond loading the datasets.
- The bot prioritizes FAQ answers; if none match, it returns link results.
- Works on any static host (S3, Netlify, GitHub Pages, etc.).
