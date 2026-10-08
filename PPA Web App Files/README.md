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
- Supports a print / Save as PDF workflow for the finished Blueprint.

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

Set `PPA_ENABLE_WEB_RESEARCH=true` if you want the final synthesis request to have access to OpenAI's web search tool. The model is instructed to use research selectively and never override direct owner facts.

For the first contractor beta, leaving this `false` is recommended. It keeps the assessment simpler, faster, and less expensive while you validate the experience.

## Privacy behavior

The app uses `store: false` for model responses and does not maintain its own server-side assessment database. Browser progress is stored in localStorage on the user's device.

If you later add account login, cross-device resume, email delivery, analytics, CRM capture, or a database, update the public privacy policy before launch.

## Deployment

See `DEPLOYMENT.md`.

### v1.0.2 UX improvements
The opening question is rendered locally for an immediate start. When an access code is configured, the app detects that requirement from the server and presents a code field before starting. Adaptive AI transitions display an animated Thinking indicator while the next question is generated.
