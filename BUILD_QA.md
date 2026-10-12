# Build QA — v1.6.0

## Changes reviewed

- Start-page PPA mark reduced in size.
- Readable HTML product name added beneath the PPA mark.
- Main headline reduced in size.
- Removed start-page `Strategic Positioning Assessment` eyebrow.
- Approved three-line positioning description added.
- Strategic Visibility logo centered in the top header and remains linked to `https://strategicvisibility.net`.
- Fourth start-page review notice added immediately above the Start button.
- Automatic completed-assessment email route added using Resend.
- Email delivery status added to the results page.
- Existing PDF export renderer moved into a shared server utility so both downloads and automatic email use the same Full Assessment + Blueprint PDF.
- Browser persistence hardened with hydration-before-save behavior.
- Explicit synchronous save added when the Blueprint is generated.
- Optional Upstash Redis server persistence added with a 60-day TTL and HttpOnly session cookie.
- Completed Blueprint and transcript can be restored after returning in the same browser when server persistence is configured.

## Validation limitation

The production dependency set is unchanged from v1.5.0, but a full local `npm install` / Next.js production build could not be completed in this environment because dependency installation timed out. Vercel remains the authoritative production compile check.
