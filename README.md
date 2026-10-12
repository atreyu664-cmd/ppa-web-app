# Premium Positioning Architect™ Web App — v1.6.0

Standalone web version of the Premium Positioning Architect™ by Strategic Visibility LLC.

## What this build does

- Runs the adaptive PPA discovery interview outside ChatGPT.
- Uses GPT-5.6 Terra for the interview and GPT-5.6 Sol for final Blueprint synthesis.
- Uses focused public web research when `PPA_ENABLE_WEB_RESEARCH=true`.
- Generates a polished Strategic Positioning Blueprint plus an optional Full Assessment + Blueprint PDF.
- Automatically emails the completed Full Assessment + Blueprint PDF to Strategic Visibility when Resend is configured.
- Saves progress locally in the browser on every step.
- Adds recommended server-side progress/results persistence through Upstash Redis, with a 60-day session window.
- Restores incomplete assessments and completed Blueprints when the same browser returns later.
- Keeps OpenAI, Resend, and Redis credentials server-side.
- Supports an optional shared PPA access code.

## v1.6.0 UI changes

- Strategic Visibility logo is centered in the top header and links to `https://strategicvisibility.net`.
- PPA start-page mark is smaller and a readable `Premium Positioning Architect` product name is displayed beneath it.
- Main headline is slightly smaller.
- Removed the gold `Strategic Positioning Assessment` eyebrow from the start page.
- Updated start-page description to the approved positioning-focused copy.
- Added a fourth review notice immediately above the Start button explaining that completed results are automatically emailed to Strategic Visibility.
- Added completion-page delivery status so the client can see whether the automatic review copy was sent successfully.

## Environment variables

```env
OPENAI_API_KEY=...
PPA_INTERVIEW_MODEL=gpt-5.6-terra
PPA_BLUEPRINT_MODEL=gpt-5.6-sol
PPA_ENABLE_WEB_RESEARCH=true
PPA_ACCESS_CODE=...

RESEND_API_KEY=...
PPA_RESULTS_EMAIL=you@strategicvisibility.net
PPA_FROM_EMAIL=PPA <ppa@strategicvisibility.net>

UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

`RESEND_*` variables enable automatic completed-assessment email delivery.

`UPSTASH_REDIS_*` variables enable server-side progress/results recovery. If they are absent, the app still uses browser localStorage as a fallback.

## Persistence behavior

The browser saves the structured assessment state, conversation, and completed Blueprint locally. When Upstash is configured, the same snapshot is also saved server-side under a random HttpOnly session cookie and retained for 60 days. This means a user can close the page and return later in the same browser without losing a completed Blueprint, even if local browser storage fails.

This is not an account system and does not collect a client email address. Cross-device recovery is not included in this build.

## Automatic email behavior

Immediately after a Blueprint is generated, the app creates the Full Assessment + Blueprint PDF and sends it to `PPA_RESULTS_EMAIL` using Resend. The user still retains the normal PDF download buttons.

The assessment does not fail if the email service has a temporary problem. Instead, the results screen displays a delivery warning and asks the user to download the Full Assessment PDF manually.

## Deployment

See `DEPLOYMENT.md`.
