# Premium Positioning Architect™ Web App

Standalone web version of the Premium Positioning Architect™ by Strategic Visibility LLC.

## What this app does

- Runs the same adaptive PPA discovery logic as the ChatGPT plugin.
- Uses GPT-5.6 Terra for efficient interview/question selection.
- Uses GPT-5.6 Sol for the final Strategic Positioning Blueprint™ synthesis.
- Saves progress locally in the contractor's browser, so they can leave and resume on the same device.
- Keeps the OpenAI API key server-side.
- Does not require the contractor to have a ChatGPT account.
- Does not send leads to a CRM or capture contact details.
- Can optionally be protected with a shared access code.
- Supports two export paths: Blueprint only, or Full Assessment + Blueprint with the complete question/answer/PPA reflection transcript.
- Captures priority service areas, project values, lead intake/sales flow, project delivery, buying structure, service hierarchy, and competitor context without turning the assessment into a financial audit.
- Can perform a selective public-market and competitor research pass when web research is enabled.

## Architecture

Browser UI -> Next.js server routes -> OpenAI Responses API

The browser stores the structured assessment state in localStorage. Each turn sends a compact structured state plus recent conversation context to the server. The server calls the OpenAI Responses API using Structured Outputs, updates the state, and returns the next question.

The final Blueprint is generated in a separate higher-quality synthesis call.

## Models

Defaults:

- Interview: `gpt-5.6-terra`
- Final Blueprint: `gpt-5.6-sol`

Both are configurable with environment variables.

## Local setup

1. Install Node.js 20+.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Add your OpenAI API key to `OPENAI_API_KEY`.
5. Run `npm run dev`.
6. Open `http://localhost:3000`.

## Environment variables

```env
OPENAI_API_KEY=...
PPA_INTERVIEW_MODEL=gpt-5.6-terra
PPA_BLUEPRINT_MODEL=gpt-5.6-sol
PPA_ENABLE_WEB_RESEARCH=false
PPA_ACCESS_CODE=
NEXT_PUBLIC_PPA_REQUIRE_ACCESS=false
```

### Optional access protection

To keep the tool limited to people you send it to:

```env
PPA_ACCESS_CODE=your-shared-code
NEXT_PUBLIC_PPA_REQUIRE_ACCESS=true
```

The access code is verified server-side. Do not put the real code in any `NEXT_PUBLIC_` variable.

## Public research

Set `PPA_ENABLE_WEB_RESEARCH=true` to enable the focused market/competitor research pass. Research is permitted during the positioning pressure-test stage and during final synthesis. It is instructed to prioritize the client's public footprint, named competitors, public reviews, buyer language, and relevant service-area context while never overriding direct owner facts.

For the full Strategic Visibility client workflow, `true` is recommended. Use `false` only when you explicitly want a faster no-research assessment.

## Privacy behavior

The app uses `store: false` for model responses and does not maintain its own server-side assessment database. Browser progress is stored in localStorage on the user's device.

If you later add account login, cross-device resume, email delivery, analytics, CRM capture, or a database, update the public privacy policy before launch.

## Deployment

See `DEPLOYMENT.md`.

### v1.0.2 UX improvements
The opening question is rendered locally for an immediate start. When an access code is configured, the app detects that requirement from the server and presents a code field before starting. Adaptive AI transitions display an animated Thinking indicator while the next question is generated.


### v1.1.0 discovery expansion
- Keeps the 40–45 minute maximum target and avoids profit/margin interrogation.
- Captures current and ideal project value, optional AOV/LTV when relevant, highest-value services, and 5–10 priority service areas.
- Adds concise lead-intake/sales and project-delivery discovery, preferably as A-to-Z process questions rather than long checklists.
- Adds service hierarchy, qualification/disqualification, buying-decision structure, and top-three competitor self-assessment.
- Adds selective public research and a compact Competitive Context Snapshot / Market Research Signals inside the Blueprint.
- Adds Save Blueprint and Save Full Assessment + Blueprint export options.


## v1.4.1 changes

- Direct Word (`.docx`) downloads for Blueprint-only and Full Assessment + Blueprint exports.
- Kept Print / Save PDF as a separate optional action instead of mislabeling print as save.
- Final Blueprint synthesis now receives the full assessment conversation in addition to structured discovery state, preserving nuance and exact client language.
- Full Assessment export includes the complete conversation, Blueprint, and available research/source notes.
- Added a stricter silent completeness audit before the interview can move to `ready`; question count remains adaptive rather than fixed.


## v1.4.1 PDF export

- Blueprint downloads are now real PDF files.
- Full Assessment + Blueprint downloads are now real PDF files.
- Browser Print / Save PDF remains available as a separate fallback.
- DOCX generation was removed, so recipients do not need Microsoft Word.


## v1.4.1 PDF redesign
- Premium branded PDF cover matching the web app navy/gold system.
- Section-number hierarchy, branded page headers/footers, and page numbers.
- Differentiator cards, positioning statement callout, Voice of Customer quote panels, strategic priority cards, and styled transcript appendix.
- PDF remains a true direct download; Print / Save PDF remains separate.

## v1.4.1 PDF parity upgrade

The PDF exporter now renders the Blueprint as HTML/CSS through headless Chromium rather than drawing a conventional report with PDF primitives. The export intentionally mirrors the web Blueprint design: same navy cover, Georgia-style editorial headings, section numbering, whitespace rhythm, differentiator cards, positioning statement treatment, Voice of Customer styling, priority layout, and transcript message bubbles. Full Assessment exports place the polished Blueprint first and the complete conversation in an appendix.
