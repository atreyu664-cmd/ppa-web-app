# PPA Web App v1.1.0 — Build QA

## Implemented
- Expanded discovery map without expanding the visible five-stage UI.
- Financial scope limited to current/ideal project value, optional AOV/LTV, and highest-value services.
- Captures 5–10 priority service areas.
- Captures lead intake/sales and project delivery as concise A-to-Z process discovery.
- Captures service hierarchy, qualification/disqualification, decision structure, and top-three competitor self-assessment.
- Enables selective web research during the pressure-test stage when `PPA_ENABLE_WEB_RESEARCH=true`.
- Final synthesis can also use web research.
- Adds compact Competitive Context Snapshot and Market Research Signals inside Blueprint section 6.
- Adds Save Blueprint and Save Full Assessment + Blueprint export paths.
- Full export includes every PPA message/reflection and every exact client answer from the current browser session.
- Session storage bumped to v3 to prevent stale beta state collisions.

## Static checks
- TypeScript source was parsed with `tsc --noEmit --noResolve`; only expected missing-dependency/module-resolution errors were returned because node_modules are not installed in this environment. No syntax-level errors surfaced.
- Final production compile should run in Vercel after upload.

## Production setting
Set `PPA_ENABLE_WEB_RESEARCH=true` in Vercel and redeploy to activate focused market/competitor research.


## v1.3.0 change

PDF export now uses `pdf-lib` server-side and returns `application/pdf`. Full production compilation should be verified by Vercel because package installation is unavailable in the local build environment.
