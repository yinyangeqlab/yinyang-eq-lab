"use client";

import { ArrowUpRight, CircleHelp, LocateFixed, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { helpTopics, type HelpTopic } from "@/lib/site-help-guide";
import type { createSiteHelpMatcher } from "@/lib/site-help-model";
import { HELP_QUESTION_LIMIT, canShowHelpTopic, normalizeHelpQuestion, searchSiteHelp, suggestedTopics } from "@/lib/site-help-search";
import { useSiteHelpActions, type BassCutApproval, type BassCutReceipt } from "@/components/site-help-actions";
import { walkthroughPanel, walkthroughSteps } from "@/lib/site-help-walkthrough";
import "./site-help.css";

type Walkthrough = { topic: HelpTopic; index: number; moveFocus: boolean };
type StepStatus = "finding" | "ready" | "prerequisite" | "missing" | "away";

function gainLabel(gain: number) {
  return `${gain > 0 ? "+" : gain < 0 ? "−" : ""}${Number(Math.abs(gain).toFixed(3))} dB`;
}

const startReasons: Record<string, string> = {
  storage: "This browser can’t save progress right now. Check its site storage settings before starting.",
  headphones: "Pick your headphones in step 1 to unlock Start.",
  pool: "Check the number of targets selected in Targets to compare. Start shows the required range for your setup.",
  channel: "Uploaded channel matching is selected. Add a two-channel preset, or switch to Auto or Off.",
  music: "Choose at least one song under Music source.",
  "sharing-unavailable": "The site couldn’t check your sharing settings. Use Check again below Start.",
  checking: "The tournament is still checking your settings.",
};

function pageStatus(topic: HelpTopic | undefined, pathname: string) {
  if (pathname !== "/shootout/personal") return;
  if (topic?.id === "start") return startReasons[document.getElementById("personal-start-reason")?.dataset.reason ?? ""];
  if (topic?.id !== "vote") return;
  switch (document.getElementById("personal-vote-availability")?.dataset.helpStatus) {
    case "ready": return "Your preference buttons are ready to use.";
    case "loading": return "The target curves aren’t ready yet. Check the status above the player.";
    case "music": return "Select music for this round before listening to A and B.";
    case "matched": return "Voting is waiting for five seconds of the same passage on both sides.";
    case "both": return "Voting is waiting for you to play both samples.";
    default: return "The choice controls appear when you’re listening to a round.";
  }
}

function visibleTarget(selector: string): HTMLElement | undefined {
  return [...document.querySelectorAll<HTMLElement>(selector)].find(node => {
    if (node.closest("[hidden], [inert], [aria-hidden='true']") || !node.getClientRects().length || getComputedStyle(node).visibility !== "visible") return false;
    const closed = node.parentElement?.closest("details:not([open])");
    return !closed || Boolean(closed.querySelector(":scope > summary")?.contains(node));
  });
}

function onTopicPage(href: string) {
  const url = new URL(href, window.location.origin);
  return window.location.pathname.replace(/\/$/, "") === url.pathname.replace(/\/$/, "") &&
    [...url.searchParams].every(([key, value]) => new URLSearchParams(window.location.search).get(key) === value);
}

function positionControl(target: HTMLElement, panel: HTMLElement | null) {
  target.scrollIntoView({ block: "center", behavior: "instant" });
  if (!panel) return;
  const bottom = panel.getBoundingClientRect().top - 12;
  const rect = target.getBoundingClientRect();
  const lowerEdge = rect.height > bottom - 80 ? rect.top + 60 : rect.bottom;
  if (lowerEdge > bottom) window.scrollBy({ top: lowerEdge - bottom, behavior: "instant" });
}

function controlIsDisabled(control: HTMLElement) {
  return control.matches(":disabled, [aria-disabled='true']") ||
    !!control.querySelector("button:disabled") && !control.querySelector("button:enabled");
}

function focusControl(target: HTMLElement) {
  const needsTabIndex = target.tabIndex < 0 && !target.hasAttribute("tabindex");
  if (needsTabIndex) target.setAttribute("tabindex", "-1");
  target.focus({ preventScroll: true });
  if (needsTabIndex) target.removeAttribute("tabindex");
}

type Matcher = ReturnType<typeof createSiteHelpMatcher>;

async function loadMatcher(): Promise<Matcher | undefined> {
  try {
    const model = await import("@/lib/site-help-model");
    const response = await fetch(model.SITE_HELP_MODEL_PATH, {
      credentials: "omit", redirect: "error", cache: "force-cache", signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return;
    return model.createSiteHelpMatcher(await response.arrayBuffer());
  } catch {
    // The text guide remains available when the optional asset is absent.
  }
}

export default function SiteHelp() {
  const pathname = (usePathname() ?? "/").replace(/\/$/, "") || "/";
  const router = useRouter();
  const helpActions = useSiteHelpActions();
  const [approval, setApproval] = useState<BassCutApproval>();
  const [bassReceipt, setBassReceipt] = useState<BassCutReceipt>();
  const [actionMessage, setActionMessage] = useState("");
  const confirmDialog = useRef<HTMLDialogElement>(null);
  const undoCutButton = useRef<HTMLButtonElement>(null);
  const actionButton = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<ReturnType<typeof searchSiteHelp>>();
  const [status, setStatus] = useState<string>();
  const [matching, setMatching] = useState(false);
  const matcher = useRef<Promise<Matcher | undefined> | null>(null);
  const submission = useRef(0);
  const [tour, setTour] = useState<Walkthrough>();
  const [stepStatus, setStepStatus] = useState<StepStatus>("finding");
  const launch = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const tourPanel = useRef<HTMLElement>(null);
  const progress = useRef<HTMLSpanElement>(null);
  const currentControl = useRef<HTMLElement | null>(null);

  useEffect(() => () => { submission.current++; }, []);
  useEffect(() => {
    const dialog = confirmDialog.current;
    if (!dialog) return;
    if (approval && pathname === "/preference-tuning") {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) dialog.close();
  }, [approval, pathname]);
  useEffect(() => { if (open && !tour) input.current?.focus(); }, [open, tour]);
  useEffect(() => {
    if (window.location.hash === "#ask-site-help" && !launch.current?.hidden && launch.current?.getAttribute("aria-expanded") === "false") launch.current.click();
  }, [pathname]);
  useEffect(() => {
    if (!tour) return;
    const step = walkthroughSteps(tour.topic)[tour.index];
    if (!tour.moveFocus) progress.current?.focus({ preventScroll: true });
    const started = performance.now();
    const opened = new Set<HTMLElement>();
    let highlight: HTMLElement | undefined;
    let frame = 0;
    let observer: MutationObserver | undefined;
    const mutationOptions = { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "open", "disabled", "aria-disabled", "aria-hidden", "inert"] };
    const forward = () => {
      const onPage = onTopicPage(tour.topic.href);
      if (!onPage && performance.now() - started > 4500) {
        setStepStatus("away");
        return;
      }
      if (onPage) {
        for (const name of step.open ?? []) {
          const { selector, disclosure } = walkthroughPanel(name);
          const panel = visibleTarget(selector);
          if (!panel || opened.has(panel)) continue;
          opened.add(panel);
          if (disclosure && panel instanceof HTMLDetailsElement) panel.open = true;
          else if (!disclosure && panel instanceof HTMLButtonElement && !panel.disabled && panel.type === "button") panel.click();
        }
        const target = step.target ? visibleTarget(step.target) : undefined;
        const canWait = performance.now() - started < 1000;
        const fallback = step.ifMissing && !canWait ? visibleTarget(step.ifMissing) : undefined;
        const control = target || fallback;
        if (control) {
          highlight = control;
          control.setAttribute("data-site-help-highlight", "");
          currentControl.current = target ?? null;
          positionControl(control, tourPanel.current);
          const disabled = controlIsDisabled(control);
          if (tour.moveFocus && target && !disabled && !step.manual) focusControl(control);
          setStepStatus(!target || disabled ? "prerequisite" : "ready");
          observer?.disconnect();
          observer = new MutationObserver(() => {
            observer?.disconnect();
            frame = window.requestAnimationFrame(() => {
              const nextTarget = step.target && visibleTarget(step.target);
              const nextControl = nextTarget || (step.ifMissing && visibleTarget(step.ifMissing));
              if (control === nextControl) {
                currentControl.current = nextTarget || null;
                setStepStatus(!nextTarget || controlIsDisabled(control) ? "prerequisite" : "ready");
                observer?.observe(document.body, mutationOptions);
                return;
              }
              control.removeAttribute("data-site-help-highlight");
              currentControl.current = null;
              forward();
            });
          });
          observer.observe(document.body, mutationOptions);
          return;
        }
        if (!step.target || !canWait) {
          setStepStatus(step.target ? "missing" : "ready");
          return;
        }
      }
      frame = window.requestAnimationFrame(forward);
    };
    frame = window.requestAnimationFrame(forward);
    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      highlight?.removeAttribute("data-site-help-highlight");
      currentControl.current = null;
    };
  }, [tour, pathname]);
  useEffect(() => {
    if (!tour) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || event.target instanceof Element &&
          event.target.closest("dialog[open], [role='dialog']")) return;
      event.preventDefault();
      setTour(undefined);
      setOpen(true);
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [tour]);

  function close() {
    submission.current++;
    setMatching(false);
    setTour(undefined);
    setResult(undefined);
    setQuestion("");
    setOpen(false);
    launch.current?.focus();
  }

  async function answer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!question.trim() || matching) return;
    const listeningMode = pathname === "/shootout" ? visibleTarget(".shootout-view[data-mode]")?.dataset.mode : undefined;
    const context = listeningMode ? `/shootout?mode=${listeningMode === "open" ? "open" : "blind"}` : pathname;
    const query = normalizeHelpQuestion(question);
    const request = ++submission.current;
    const inThread = result?.context === context || (result?.context === pathname && context.startsWith(pathname + "?"));
    const next = searchSiteHelp(query, context, inThread ? result?.followUp : undefined, inThread ? result?.answer : undefined);
    setResult(next.tryModel ? { ...next, answer: undefined } : next);
    setStatus(next.tryModel ? undefined : pageStatus(next.answer, pathname));
    setQuestion("");
    setMatching(next.tryModel);
    if (!next.tryModel) return;

    matcher.current ??= loadMatcher();
    const model = await matcher.current;
    if (request !== submission.current) return;

    const matched = helpTopics.find(topic => topic.id === model?.(query, next.context, next.answer?.id));
    const answer = matched && canShowHelpTopic(matched, query) ? matched : next.answer;
    setMatching(false);
    setResult({ ...next, answer, related: answer === next.answer ? next.related : answer ? [] : suggestedTopics(pathname), tryModel: false });
    setStatus(pageStatus(answer, pathname));
  }

  function pick(topic: HelpTopic) {
    submission.current++;
    setMatching(false);
    setResult({ answer: topic, related: [], tryModel: false, context: result?.context ?? pathname });
    setStatus(pageStatus(topic, pathname));
  }

  function showMe(topic: HelpTopic) {
    setActionMessage("");
    setOpen(false);
    setStepStatus("finding");
    setTour({ topic, index: 0, moveFocus: false });
    if (!onTopicPage(topic.href)) router.push(topic.href);
  }

  function changeStep(index: number, moveFocus = false) {
    if (!tour) return;
    setStepStatus("finding");
    setTour({ ...tour, index, moveFocus });
    if (!onTopicPage(tour.topic.href)) router.push(tour.topic.href);
  }

  function finishTour() {
    setTour(undefined);
    setOpen(true);
  }

  function prepareBassCut() {
    if (tour?.topic.href !== "/preference-tuning" || !onTopicPage(tour.topic.href) ||
        walkthroughSteps(tour.topic)[tour.index]?.action !== "lower-bass" || approval || !confirmDialog.current) return;
    const result = helpActions?.bassCut({ phase: "prepare" });
    if (result?.status === "ready") {
      setActionMessage("");
      setApproval(result.approval);
      return;
    }
    setActionMessage(result?.status === "limit"
      ? "A full 1 dB cut would exceed the Bass range."
      : "Return to Your tuning before applying a bass cut.");
  }

  function clearBassApproval() {
    if (approval) helpActions?.bassCut({ phase: "cancel", approval });
    setApproval(undefined);
  }

  function applyBassCut() {
    if (!approval || !confirmDialog.current?.open) return;
    const result = helpActions?.bassCut({ phase: "confirm", approval });
    confirmDialog.current.close();
    setApproval(undefined);
    if (result?.status === "applied") {
      setBassReceipt(result.receipt);
      setActionMessage(`Bass lowered to ${gainLabel(approval.after)}.`);
      requestAnimationFrame(() => undoCutButton.current?.focus({ preventScroll: true }));
    } else {
      setActionMessage("Tuning changed while you were reviewing the cut. Check the current Bass value and try again.");
    }
  }

  function undoBassCut() {
    if (!bassReceipt) return;
    const result = helpActions?.bassCut({ phase: "undo", receipt: bassReceipt });
    setBassReceipt(undefined);
    setActionMessage(result?.status === "undone"
      ? `Bass restored to ${gainLabel(bassReceipt.restoredGain)}.`
      : "The tuning has changed. Use Tuning’s history to review later edits.");
    requestAnimationFrame(() => (actionButton.current ?? progress.current)?.focus({ preventScroll: true }));
  }

  const topic = result?.answer;
  const related = result?.related ?? suggestedTopics(pathname);
  const steps = tour ? walkthroughSteps(tour.topic) : [];
  const step = tour ? steps[tour.index] : undefined;
  const onTourTuning = tour?.topic.href === "/preference-tuning" && pathname === "/preference-tuning";
  return <div className="site-help">
    <button id="ask-site-help" ref={launch} type="button" className="site-help-launch" hidden={!!tour} aria-expanded={open} aria-controls="site-help-panel"
      onClick={() => {
        if (tour) return;
        if (open) close();
        else {
          setOpen(true);
          setStatus(pageStatus(topic, pathname));
        }
      }}>
      <CircleHelp size={19} aria-hidden="true" /> <span>Ask for help</span>
    </button>
    {tour && step && <section id="site-help-walkthrough" ref={tourPanel} className="site-help-walkthrough" role="region" aria-labelledby="site-help-step-title">
      <div className="site-help-tour-header">
        <span ref={progress} tabIndex={-1}>Step {tour.index + 1} of {steps.length}</span>
        <button type="button" aria-label="End walkthrough" onClick={finishTour}><X size={19} aria-hidden="true" /></button>
      </div>
      <div className="site-help-tour-copy" aria-live="polite" aria-atomic="true">
        <h2 id="site-help-step-title">{tour.topic.title}</h2>
        <p>{step.text}</p>
        {stepStatus === "finding" && <p className="site-help-tour-status">Finding the control…</p>}
        {stepStatus === "away" && <p className="site-help-tour-status">Return to the walkthrough page to find this control.</p>}
        {(stepStatus === "prerequisite" || stepStatus === "missing") && <p className="site-help-tour-status">{step.prerequisite ?? "This control is unavailable in the current view."}</p>}
      </div>
      <div className="site-help-tour-actions">
        <button type="button" disabled={tour.index === 0} onClick={() => changeStep(tour.index - 1)}>Back</button>
        {step.target && <button type="button" disabled={stepStatus === "finding"} onClick={() => {
          const control = currentControl.current;
          if (control?.isConnected && step.target && visibleTarget(step.target) === control && !controlIsDisabled(control)) {
            positionControl(control, tourPanel.current);
            if (!step.manual) focusControl(control);
          } else changeStep(tour.index, true);
        }}><LocateFixed size={16} aria-hidden="true" /> {stepStatus === "away" ? "Go to page" : "Find control"}</button>}
        {tour.index === steps.length - 1
          ? <button type="button" className="site-help-tour-next" onClick={finishTour}>Done</button>
          : <button type="button" className="site-help-tour-next" onClick={() => changeStep(tour.index + 1)}>Next</button>}
      </div>
      {(step.action === "lower-bass" || bassReceipt) && onTourTuning && stepStatus !== "away" && stepStatus !== "finding" &&
        <div className="site-help-tour-local">
          <div className="site-help-tour-actions">
            {bassReceipt
              ? <button ref={undoCutButton} type="button" onClick={undoBassCut}>Undo bass cut</button>
              : step.action === "lower-bass" && <button ref={actionButton} type="button" disabled={stepStatus !== "ready"} onClick={prepareBassCut}>Do it for me</button>}
          </div>
          <p role="status">{actionMessage}</p>
        </div>}
    </section>}
    <dialog ref={confirmDialog} className="site-help-confirm" aria-labelledby="site-help-confirm-title" aria-describedby="site-help-confirm-change"
      onClose={clearBassApproval}>
      <h2 id="site-help-confirm-title">Lower Bass by 1 dB?</h2>
      <p id="site-help-confirm-change">{approval && <>Bass will change from <strong>{gainLabel(approval.before)}</strong> to <strong>{gainLabel(approval.after)}</strong>.</>}</p>
      <div className="site-help-tour-actions">
        <button type="button" autoFocus onClick={() => confirmDialog.current?.close()}>Cancel</button>
        <button type="button" className="site-help-tour-next" disabled={!approval} onClick={applyBassCut}>Apply −1 dB</button>
      </div>
    </dialog>
    <section id="site-help-panel" className="site-help-panel" role="dialog" aria-labelledby="site-help-title" hidden={!open}
      onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); } }}>
      <header><h2 id="site-help-title">Site help</h2><button type="button" aria-label="Close site help" onClick={close}><X size={20} aria-hidden="true" /></button></header>
      <form onSubmit={answer}>
        <label htmlFor="site-help-question">Ask about a page or feature</label>
        <div className="site-help-input-row">
          <input ref={input} id="site-help-question" type="text" placeholder={result?.followUp ? "Type your reply" : "Does this support EQ?"} autoComplete="off" maxLength={HELP_QUESTION_LIMIT}
            value={question} onChange={event => setQuestion(event.target.value)} />
          <button type="submit" aria-label="Find an answer" disabled={!question.trim() || matching}><Search size={19} aria-hidden="true" /></button>
        </div>
      </form>
      <div className="site-help-results">
        <div aria-live="polite" aria-atomic="true">
          {topic ? <article className="site-help-answer">
            <h3>{topic.title}</h3>
            {status && <p className="site-help-status">{status}</p>}
            {topic.steps.map(step => <p key={step}>{step}</p>)}
          </article> : matching ? <p className="site-help-miss">Checking the site guide on this device…</p> : result && <p className="site-help-miss">{result.clarification ?? "I couldn’t find a close match. Try naming a control or pick a topic below."}</p>}
        </div>
        {topic && <div className="site-help-actions">
          {topic.targets ? <button type="button" onClick={() => showMe(topic)}>Show me <ArrowUpRight size={15} aria-hidden="true" /></button> :
            <Link href={topic.href} prefetch={false} onClick={close}>Open page <ArrowUpRight size={15} aria-hidden="true" /></Link>}
        </div>}
        {related.length > 0 && <div className="site-help-topics" aria-label={result?.followUp ? "Reply options" : topic ? "Related topics" : "Suggested topics"}>
          {!result?.clarification && <p>{topic ? "Related topics" : "Try asking about"}</p>}
          {related.map(entry => <button type="button" key={entry.id} onClick={() => pick(entry)}>{entry.title}</button>)}
        </div>}
      </div>
      <p className="site-help-privacy">Questions stay in this browser.</p>
    </section>
  </div>;
}
