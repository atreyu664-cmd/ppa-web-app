# PPA Web App — Build QA

## Included

- Next.js web interface
- Adaptive five-stage PPA assessment
- Structured discovery state
- Browser-based resume on the same device
- GPT-5.6 Terra interview route
- GPT-5.6 Sol Blueprint route
- Structured Outputs JSON schemas
- Locked nine-section Blueprint rendering
- Print / Save PDF workflow
- Optional shared access code
- Optional final-stage web research feature flag
- API key isolated to server routes
- 12,000-character per-answer guardrail
- Prompt-injection boundary language
- Deployment and privacy-update guidance

## Static checks completed

- `plugin` PPA source material was extracted from the approved v1.0.1 package and embedded into the server-side PPA engine.
- JSON-schema objects are syntactically valid TypeScript object literals.
- All referenced local application files exist.
- API key is referenced only from server-side route code.
- The browser does not receive the OpenAI API key.
- Local resume data is stored under `ppa-web-session-v1` in browser localStorage.
- Access code is compared only against the server-side `PPA_ACCESS_CODE` environment variable.

## Runtime validation note

The current artifact environment could not complete `npm install` because package installation timed out, so a full `next build` was not executed here. The project is structured for a standard Next.js/Vercel build and should be run through `npm install && npm run build` when placed in the deployment environment. Resolve any dependency-version or SDK typing changes surfaced by that build before production traffic.

## Beta acceptance tests

1. New user receives orientation and one opening question.
2. A detailed first answer causes already-covered questions to be skipped.
3. “Quality” as a differentiator triggers a mechanism/evidence clarification.
4. “Everyone is our customer” triggers narrowing through best-customer patterns.
5. Exact remembered customer language is preserved as exact; paraphrase is not presented as a direct quote.
6. Contradictory desired work is surfaced for clarification.
7. After sufficient discovery, the app marks the Blueprint ready instead of continuing indefinitely.
8. “Build from what I’ve shared” produces a useful Blueprint with open questions when evidence is incomplete.
9. The final output contains the nine locked sections in order.
10. Exactly three strategic priorities are returned.
11. Refreshing the browser preserves progress on the same device.
12. Reset clears the saved local session.
13. An invalid access code is rejected when access protection is enabled.
14. OpenAI API key is not visible in browser source/network payloads.
15. Save / Print PDF produces a clean document layout.

## v1.0.1 UX patch
- Added server-reported access-code requirement and a visible access-code entry field.
- Added explicit access-code validation before the assessment begins.
- Hard-coded the opening PPA question so Question 1 renders immediately without an OpenAI round trip.
- Added animated, accessible Thinking indicator with pulsing ellipsis for adaptive follow-up generation.
- Preserved reduced-motion accessibility behavior.
- npm install/build could not be completed in this execution environment because dependency installation timed out; Vercel build remains the production compiler check.
