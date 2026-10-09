"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createInitialState } from "@/lib/ppaState";
import type { PpaState, TurnMessage, TurnResponse } from "@/lib/ppaTypes";

type Differentiator = { title: string; difference: string; buyerRelevance: string; reasonToBelieve: string };
type Voc = { label: string; content: string; kind: "exact" | "paraphrase" | "theme" };
type Priority = { title: string; focus: string; whyItMatters: string };
type CompetitorSnapshot = { competitor: string; theirPositioning: string; apparentStrengths: string; apparentWeaknesses: string; clientOpportunity: string };
type Blueprint = {
  title: string;
  executivePositioningSummary: string;
  businessIdentity: string;
  idealCustomer: string;
  whyCustomersChooseYou: string;
  coreDifferentiators: Differentiator[];
  marketPosition: string;
  positioningStatement: string;
  competitiveContextSnapshot: CompetitorSnapshot[];
  marketResearchSignals: string[];
  voiceOfCustomerHighlights: Voc[];
  trustAndProofSnapshot: string[];
  strategicPriorities: Priority[];
  openQuestions: string[];
  nextStep: string;
};

const STORAGE_KEY = "ppa-web-session-v3";
const LEGACY_STORAGE_KEYS = ["ppa-web-session-v1", "ppa-web-session-v2"];
const OPENING_QUESTION = "Before we get into positioning, give me the quick picture: what does your company do, where do you operate, and what kind of work makes up most of the business today?";
const STAGES = [
  ["business_direction", "Business Direction"],
  ["best_customer", "Best Customer"],
  ["differentiation", "Differentiation"],
  ["evidence", "Evidence"],
  ["pressure_test", "Positioning"],
] as const;

function stageIndex(stage: string) {
  if (stage === "ready") return STAGES.length;
  return Math.max(0, STAGES.findIndex(([id]) => id === stage));
}

export default function PpaApp() {
  const [state, setState] = useState<PpaState>(() => createInitialState());
  const [messages, setMessages] = useState<TurnMessage[]>([]);
  const [answer, setAnswer] = useState("");
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [blueprintLoading, setBlueprintLoading] = useState(false);
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [error, setError] = useState("");
  const [restored, setRestored] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [accessRequired, setAccessRequired] = useState<boolean | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      // v1.0.2 intentionally starts a clean beta session so stale pre-instant-opening
      // state cannot renumber or duplicate the first question.
      for (const key of LEGACY_STORAGE_KEYS) localStorage.removeItem(key);
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.state && Array.isArray(saved.messages)) {
          setState(saved.state);
          setMessages(saved.messages);
          setBlueprint(saved.blueprint || null);
          setRestored(Boolean(saved.started && saved.messages.length));
        }
      }
    } catch {
      // Ignore invalid local state.
    }

    void fetch("/api/ppa/access", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        const required = Boolean(data.required);
        setAccessRequired(required);
        if (!required) setAuthorized(true);
      })
      .catch(() => {
        setAccessRequired(true);
      });
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ state, messages, started, blueprint }));
    } catch {
      // The assessment still works without browser storage.
    }
  }, [state, messages, started, blueprint]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, loading]);

  const currentQuestion = useMemo(() => {
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    return last?.content || "";
  }, [messages]);

  const displayedQuestionNumber = useMemo(() => {
    const assistantQuestions = messages.filter((m) => m.role === "assistant").length;
    return Math.max(1, assistantQuestions);
  }, [messages]);

  async function requestTurn(payload: { start?: boolean; userAnswer?: string; nextMessages: TurnMessage[] }) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/ppa/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state, messages: payload.nextMessages, userAnswer: payload.userAnswer, start: payload.start, accessCode }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Something went wrong.");
      const result = data as TurnResponse;
      const assistantMessage: TurnMessage = { role: "assistant", content: result.assistantMessage };
      setState(result.state);
      setMessages([...payload.nextMessages, assistantMessage]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function begin() {
    if (accessRequired === null) return;

    if (accessRequired && !authorized) {
      if (!accessCode.trim()) {
        setError("Enter the access code to begin.");
        return;
      }
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/ppa/access", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessCode }),
        });
        const data = await response.json();
        if (!response.ok || !data.valid) throw new Error(data.error || "Invalid assessment access code.");
        setAuthorized(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Invalid assessment access code.");
        setLoading(false);
        return;
      }
      setLoading(false);
    }

    if (restored && messages.length) {
      setStarted(true);
      return;
    }

    const initial = createInitialState();
    initial.questionCount = 1;
    initial.progress = 3;
    setState(initial);
    setMessages([{ role: "assistant", content: OPENING_QUESTION }]);
    setStarted(true);
  }

  async function submitAnswer(event: FormEvent) {
    event.preventDefault();
    const value = answer.trim();
    if (!value || loading) return;
    const userMessage: TurnMessage = { role: "user", content: value };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setAnswer("");
    await requestTurn({ userAnswer: value, nextMessages });
  }

  async function buildBlueprint() {
    setBlueprintLoading(true);
    setError("");
    try {
      const response = await fetch("/api/ppa/blueprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state, messages, useResearch: true, accessCode }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to generate the Blueprint.");
      setBlueprint(data as Blueprint);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to generate the Blueprint.");
    } finally {
      setBlueprintLoading(false);
    }
  }

  function reset() {
    if (!window.confirm("Start over? This clears the saved assessment on this device.")) return;
    localStorage.removeItem(STORAGE_KEY);
    setState(createInitialState());
    setMessages([]);
    setAnswer("");
    setStarted(false);
    setBlueprint(null);
    setRestored(false);
    setError("");
    if (accessRequired) setAuthorized(false);
  }

  if (blueprint) {
    return <BlueprintView blueprint={blueprint} messages={messages} state={state} accessCode={accessCode} onReset={reset} />;
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a
          className="sv-brand"
          href="https://strategicvisibility.net"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Visit Strategic Visibility"
        >
          <img src="/strategic-visibility-logo.png" alt="Strategic Visibility" />
        </a>
        {started && <button className="text-button" type="button" onClick={reset}>Start over</button>}
      </header>

      {!started ? (
        <section className="welcome">
          <div className="welcome-mark-wrap">
            <img
              className="welcome-mark"
              src="/ppa-premium-mark.png"
              alt="Premium Positioning Architect"
            />
          </div>
          <div className="eyebrow">Strategic Positioning Assessment</div>
          <h1>Get clear on why the right customers should choose you.</h1>
          <p className="lede">
            This guided assessment looks beneath generic claims like “quality” and “great service” to uncover
            who your best-fit customer really is, what they care about, and what makes your company meaningfully different.
          </p>
          <div className="welcome-grid">
            <div><b>One question at a time</b><span>Built around your actual business, not a rigid form.</span></div>
            <div><b>About 30–45 minutes</b><span>Detailed answers can shorten the process.</span></div>
            <div><b>A finished Blueprint</b><span>Nine sections you can use as a positioning reference.</span></div>
          </div>
          {restored && <p className="resume-note">A saved assessment was found on this device.</p>}
          {accessRequired && !authorized && <div className="access-box"><label htmlFor="accessCode">Assessment access code</label><input id="accessCode" type="password" value={accessCode} onChange={(e) => setAccessCode(e.target.value)} placeholder="Enter the code you were given" autoComplete="off" /></div>}
          {error && <div className="error-box welcome-error" role="alert">{error}</div>}
          <button className="primary-button large" type="button" onClick={begin} disabled={loading || accessRequired === null}>
            {loading ? "Checking access…" : restored ? "Continue assessment" : "Build my Positioning Blueprint"}
          </button>
          <p className="privacy-note">Your progress is saved in this browser so you can come back later. Don’t enter passwords, payment details, or other sensitive personal information.</p>
        </section>
      ) : (
        <div className="assessment-layout">
          <aside className="progress-panel" aria-label="Assessment progress">
            <div className="progress-number">{Math.min(100, state.progress)}%</div>
            <div className="progress-track"><span style={{ width: `${Math.min(100, state.progress)}%` }} /></div>
            <ol>
              {STAGES.map(([id, label], i) => {
                const active = stageIndex(state.stage);
                return <li key={id} className={i < active ? "done" : i === active ? "active" : ""}><span>{i + 1}</span>{label}</li>;
              })}
            </ol>
          </aside>

          <section className="conversation-panel">
            <div className="conversation-heading">
              <span>Question {displayedQuestionNumber}</span>
              <span>{STAGES[Math.min(stageIndex(state.stage), STAGES.length - 1)]?.[1] || "Positioning"}</span>
            </div>

            <div className="conversation" aria-live="polite">
              {messages.map((message, i) => (
                <div key={`${message.role}-${i}`} className={`message ${message.role}`}>
                  <div className="message-label">{message.role === "assistant" ? "PPA" : "You"}</div>
                  <p>{message.content}</p>
                </div>
              ))}
              {loading && <div className="message assistant thinking" role="status" aria-label="PPA is thinking"><div className="message-label">PPA</div><div className="thinking-row"><span>Thinking</span><span className="thinking-dots" aria-hidden="true"><i></i><i></i><i></i></span></div></div>}
              <div ref={bottomRef} />
            </div>

            {error && <div className="error-box" role="alert">{error}</div>}

            {state.stage !== "ready" ? (
              <form className="answer-form" onSubmit={submitAnswer}>
                <label htmlFor="answer">Your answer</label>
                <textarea
                  id="answer"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Be as specific as you can. Real customers and real examples are especially useful."
                  rows={6}
                  maxLength={12000}
                  disabled={loading}
                />
                <div className="form-actions">
                  {state.questionCount >= 6 && (
                    <button className="secondary-button" type="button" onClick={buildBlueprint} disabled={loading || blueprintLoading}>
                      Build from what I’ve shared
                    </button>
                  )}
                  <button className="primary-button" type="submit" disabled={!answer.trim() || loading}>
                    {loading ? "Processing…" : "Continue"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="ready-card">
                <div><span className="ready-kicker">Discovery complete</span><h2>Your Strategic Positioning Blueprint is ready.</h2><p>{currentQuestion}</p></div>
                <button className="primary-button large" type="button" onClick={buildBlueprint} disabled={blueprintLoading}>
                  {blueprintLoading ? "Building Blueprint…" : "Generate my Blueprint"}
                </button>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

function BlueprintView({ blueprint, messages, state, accessCode, onReset }: { blueprint: Blueprint; messages: TurnMessage[]; state: PpaState; accessCode: string; onReset: () => void }) {
  const [exporting, setExporting] = useState<"blueprint" | "full" | null>(null);
  const [exportError, setExportError] = useState("");

  function safeFileName(value: string) {
    const cleaned = (value || "PPA").replace(/[^a-z0-9\-_ ]/gi, "").trim().replace(/\s+/g, "-").slice(0, 80);
    return cleaned || "PPA";
  }

  async function downloadDocument(includeTranscript: boolean) {
    const kind = includeTranscript ? "full" : "blueprint";
    setExporting(kind);
    setExportError("");
    try {
      const response = await fetch("/api/ppa/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blueprint, messages, state, includeTranscript, accessCode }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Unable to create the PDF.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const base = safeFileName(blueprint.title || state.facts.companyName || "PPA");
      a.download = includeTranscript ? `${base}-Full-Assessment-and-Blueprint.pdf` : `${base}-Strategic-Positioning-Blueprint.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "Unable to create the PDF.");
    } finally {
      setExporting(null);
    }
  }

  function printOrSavePdf() {
    window.print();
  }

  return (
    <main className="blueprint-shell">
      <div className="blueprint-actions no-print">
        <div className="brand compact"><img src="/ppa-logo.svg" alt="" /><div><strong>Premium Positioning Architect™</strong><span>Strategic Visibility</span></div></div>
        <div className="export-actions">
          <button className="secondary-button" type="button" onClick={onReset}>New assessment</button>
          <button className="secondary-button" type="button" onClick={printOrSavePdf}>Print / Save PDF</button>
          <button className="secondary-button" type="button" onClick={() => downloadDocument(false)} disabled={exporting !== null}>{exporting === "blueprint" ? "Preparing…" : "Download Blueprint PDF"}</button>
          <button className="primary-button" type="button" onClick={() => downloadDocument(true)} disabled={exporting !== null}>{exporting === "full" ? "Preparing…" : "Download Full Assessment + Blueprint PDF"}</button>
        </div>
      </div>
      {exportError && <div className="error-box no-print" role="alert">{exportError}</div>}

      <article className="blueprint-document">
        <header className="blueprint-cover">
          <div className="eyebrow">Strategic Positioning Blueprint™</div>
          <h1>{blueprint.title}</h1>
          <p>Prepared through the Premium Positioning Architect™</p>
        </header>

        <BlueprintSection n="01" title="Executive Positioning Summary"><Prose text={blueprint.executivePositioningSummary} /></BlueprintSection>
        <BlueprintSection n="02" title="Business Identity"><Prose text={blueprint.businessIdentity} /></BlueprintSection>
        <BlueprintSection n="03" title="Ideal Customer"><Prose text={blueprint.idealCustomer} /></BlueprintSection>
        <BlueprintSection n="04" title="Why Customers Choose You"><Prose text={blueprint.whyCustomersChooseYou} /></BlueprintSection>

        <BlueprintSection n="05" title="Core Differentiators">
          <div className="diff-grid">
            {blueprint.coreDifferentiators.map((d, i) => <div className="diff-card" key={i}><h3>{d.title}</h3><dl><dt>Difference</dt><dd>{d.difference}</dd><dt>Why it matters</dt><dd>{d.buyerRelevance}</dd><dt>Reason to believe</dt><dd>{d.reasonToBelieve}</dd></dl></div>)}
          </div>
        </BlueprintSection>

        <BlueprintSection n="06" title="Market Position & Positioning Statement">
          <Prose text={blueprint.marketPosition} />
          <div className="positioning-statement"><span>Positioning statement</span><p>{blueprint.positioningStatement}</p></div>
          {!!blueprint.competitiveContextSnapshot.length && <div className="competitive-snapshot"><h3>Competitive Context Snapshot</h3>{blueprint.competitiveContextSnapshot.map((c, i) => <div className="competitor-card" key={i}><h4>{c.competitor}</h4><dl><dt>Positioning</dt><dd>{c.theirPositioning}</dd><dt>Visible strengths</dt><dd>{c.apparentStrengths}</dd><dt>Visible weaknesses</dt><dd>{c.apparentWeaknesses}</dd><dt>Client opportunity</dt><dd>{c.clientOpportunity}</dd></dl></div>)}</div>}
          {!!blueprint.marketResearchSignals.length && <div className="market-signals"><h3>Market Research Signals</h3><ul className="proof-list">{blueprint.marketResearchSignals.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
        </BlueprintSection>

        <BlueprintSection n="07" title="Voice of Customer Highlights">
          <div className="voc-list">{blueprint.voiceOfCustomerHighlights.map((v, i) => <div className="voc-item" key={i}><span>{v.label}</span><p>{v.content}</p><small>{v.kind === "exact" ? "Exact remembered language" : v.kind === "paraphrase" ? "Close paraphrase" : "Recurring theme"}</small></div>)}</div>
        </BlueprintSection>

        <BlueprintSection n="08" title="Trust & Proof Snapshot"><ul className="proof-list">{blueprint.trustAndProofSnapshot.map((x, i) => <li key={i}>{x}</li>)}</ul></BlueprintSection>

        <BlueprintSection n="09" title="Three Strategic Priorities">
          <div className="priority-list">{blueprint.strategicPriorities.map((p, i) => <div className="priority-item" key={i}><span>{i + 1}</span><div><h3>{p.title}</h3><p>{p.focus}</p><small>{p.whyItMatters}</small></div></div>)}</div>
        </BlueprintSection>

        {!!blueprint.openQuestions.length && <BlueprintSection n="+" title="Open Questions / Information Gaps"><ul className="proof-list">{blueprint.openQuestions.map((x, i) => <li key={i}>{x}</li>)}</ul></BlueprintSection>}

        <footer className="blueprint-footer"><h2>What this Blueprint is for</h2><p>{blueprint.nextStep}</p></footer>
      </article>
    </main>
  );
}

function BlueprintSection({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return <section className="blueprint-section"><div className="section-heading"><span>{n}</span><h2>{title}</h2></div>{children}</section>;
}

function Prose({ text }: { text: string }) {
  return <div className="prose">{text.split(/\n{2,}/).filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}</div>;
}
