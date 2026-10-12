# Deployment Guide — PPA Web App v1.6.0

## Update the current Vercel deployment

1. Unzip the v1.6.0 package.
2. Upload the contents to the root of the existing GitHub `ppa-web-app` repository, replacing matching files.
3. Commit the changes.
4. Vercel should deploy the new commit automatically.

## Required existing variables

Keep these in Vercel:

```env
OPENAI_API_KEY=YOUR_PROJECT_KEY
PPA_INTERVIEW_MODEL=gpt-5.6-terra
PPA_BLUEPRINT_MODEL=gpt-5.6-sol
PPA_ENABLE_WEB_RESEARCH=true
PPA_ACCESS_CODE=YOUR_ACCESS_CODE
```

## Automatic email delivery

Add these Vercel environment variables:

```env
RESEND_API_KEY=YOUR_RESEND_KEY
PPA_RESULTS_EMAIL=YOUR_DESTINATION_EMAIL
PPA_FROM_EMAIL=PPA <ppa@strategicvisibility.net>
```

`PPA_FROM_EMAIL` must use a domain verified in Resend.

After changing environment variables, redeploy the project so the production functions receive the new values.

## Server-side progress/results persistence — recommended

The app always saves locally in the browser. For stronger recovery after a user closes the page, connect an Upstash Redis database and add:

```env
UPSTASH_REDIS_REST_URL=YOUR_UPSTASH_REST_URL
UPSTASH_REDIS_REST_TOKEN=YOUR_UPSTASH_REST_TOKEN
```

The code uses the Redis REST API directly, so no additional npm package is required.

### Easiest Vercel setup

1. In Vercel, open the PPA project.
2. Open **Storage / Marketplace** and add an **Upstash Redis** database to this project.
3. Choose a region near the Vercel deployment.
4. Let the integration add the Redis environment variables, or copy the REST URL and REST token from Upstash into the names above.
5. Redeploy.

When enabled, progress and completed results are retained for 60 days and associated with a random HttpOnly browser session cookie.

## Test after deployment

Run one full test and confirm:

1. Start-page logo sizing and centered Strategic Visibility header look correct on desktop and mobile.
2. The fourth review box appears above the Start button.
3. Complete several questions, close the tab, return, and confirm the assessment resumes.
4. Complete the Blueprint, close the tab, return, and confirm the results screen returns with download buttons.
5. Confirm the Full Assessment + Blueprint PDF arrives at `PPA_RESULTS_EMAIL`.
6. Confirm both PDF download buttons still work.
7. If automatic email fails, confirm the results screen shows a warning but the Blueprint remains accessible.

## Custom domain

Keep the app on the existing Vercel custom domain, e.g. `https://ppa.strategicvisibility.net`.
