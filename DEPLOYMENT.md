# Deployment Guide — Strategic Visibility

## Recommended V1 setup

Deploy the app on Vercel and connect it to a subdomain such as:

`ppa.strategicvisibility.net`

Then either send contractors directly to that URL or embed it on a page of the main Strategic Visibility website.

## 1. Create a dedicated OpenAI API project

Use a separate OpenAI API project for the PPA web app. This keeps usage, keys, limits, and spend isolated from unrelated API work.

Create a project API key and keep it private. Never put an OpenAI API key into browser JavaScript or a public website field.

## 2. Put the code in GitHub

Create a private GitHub repository and upload this project directory.

## 3. Deploy to Vercel

- Sign in to Vercel.
- Import the GitHub repository.
- Vercel should detect Next.js automatically.
- Add the environment variables from `.env.example`.
- Deploy.

## 4. Recommended production environment variables

```env
OPENAI_API_KEY=YOUR_PROJECT_KEY
PPA_INTERVIEW_MODEL=gpt-5.6-terra
PPA_BLUEPRINT_MODEL=gpt-5.6-sol
PPA_ENABLE_WEB_RESEARCH=true
PPA_ACCESS_CODE=CHANGE-THIS-CODE
NEXT_PUBLIC_PPA_REQUIRE_ACCESS=true
```

For warm leads and existing contacts, access-code protection is recommended for V1. It reduces accidental public usage and protects API spend without turning the assessment into a lead form.

## 5. Add a custom domain

In Vercel, add:

`ppa.strategicvisibility.net`

Vercel will show the DNS record to add at your domain provider.

## 6. Put it on an existing webpage

### Preferred option: direct branded page

Link a button on your website to:

`https://ppa.strategicvisibility.net`

This gives the cleanest mobile experience and makes printing the final Blueprint easier.

### Embed option

If you want it literally inside a page on strategicvisibility.net, use an iframe after the Vercel app is live:

```html
<iframe
  src="https://ppa.strategicvisibility.net"
  title="Premium Positioning Architect"
  style="width:100%;min-height:1100px;border:0;border-radius:16px;"
  loading="lazy">
</iframe>
```

For WordPress, paste this into a Custom HTML block. A direct page/subdomain is still preferred on mobile because the assessment grows vertically as the conversation progresses.

## 7. API spend guardrails

In the OpenAI Platform dashboard for the dedicated PPA project:

- set a monthly project budget/alert;
- review usage during the first 5–10 contractor runs;
- keep the shared access code enabled during beta;
- rotate the access code if it gets passed around too widely.

## 8. Beta test before broad use

Use 3–5 contractors you already know. Watch for:

- questions they misunderstand;
- places they become fatigued;
- answers the app fails to interpret correctly;
- whether the Blueprint sounds specifically like their company;
- whether the session actually fits the 30–45 minute target;
- whether the final positioning statement and differentiators feel defensible.

Do not expand scope until those tests show a real need.

## 9. Future upgrades (not required for V1)

- Cross-device resume with a database
- Unique invite links instead of a shared code
- File/review uploads
- Branded PDF generation on the server
- Admin dashboard for reviewing completed Blueprints
- Optional email delivery
- Analytics around drop-off points

These should be added only after the core assessment has been validated with real contractor sessions.
