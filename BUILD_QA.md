# PPA Web App v1.4.0 - Build QA

- Assessment flow is unchanged from v1.3.1.
- Replaced manual pdf-lib renderer with HTML/CSS-to-PDF rendering via puppeteer-core + @sparticuz/chromium.
- PDF template mirrors the existing Blueprint web UI classes, spacing, hierarchy, cards, and colors.
- Full Assessment PDF places the polished Blueprint first and transcript/research appendix second.
- PDF user/client text is HTML-escaped before rendering.
- API key remains server-side.
- Vercel production build/runtime is the final compatibility check for the Chromium package.
