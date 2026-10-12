# Privacy policy update for PPA web app v1.6.0

The standalone PPA web app now supports two data-handling behaviors that should be reflected in the published privacy policy before broad client use:

1. **Automatic Strategic Visibility review copy.** When a user completes the assessment, the app may automatically email Strategic Visibility a PDF containing the completed assessment conversation and Strategic Positioning Blueprint for review. Resend is used as the transactional email provider.

2. **Progress/results persistence.** The app saves assessment progress in the user's browser. When server-side persistence is enabled, assessment state and completed results are also stored temporarily in a server-side key-value store associated with a random browser session identifier so the user can return to the assessment or completed Blueprint. The current default retention target is 60 days.

Suggested disclosure language:

> The standalone Premium Positioning Architect web application may temporarily store assessment progress and completed results so you can resume the assessment or retrieve your Blueprint after leaving the page. When you complete the assessment, a copy of the completed assessment and Blueprint may be automatically sent to Strategic Visibility for review. Strategic Visibility uses service providers, including OpenAI for AI processing, Resend for transactional email delivery, and a server-side storage provider when progress recovery is enabled. Do not submit passwords, payment-card information, government identifiers, protected health information, or unrelated sensitive personal data through the assessment.
