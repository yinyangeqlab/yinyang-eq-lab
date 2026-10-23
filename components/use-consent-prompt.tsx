"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import DataChoicesEditor from "@/components/data-choices-editor";
import { VOTE_DATA_NOTICE_VERSION } from "@/lib/vote-data-notice";

/** Browsing needs no agreement. The same data-choices box appears the first time someone starts a test or asks to keep results; once agreed it is remembered for the page and never repeated. */
let agreed = false;

type Privacy = { submissionsEnabled?: boolean; agreementVersion?: string | null; sharedAdmin?: boolean; testOnly?: boolean; consentTestOnly?: boolean };
export const consentAccepted = (data: Privacy) => data.sharedAdmin === true || (data.testOnly === true && data.consentTestOnly !== true) || (data.submissionsEnabled === true && data.agreementVersion === VOTE_DATA_NOTICE_VERSION);

export function useConsentPrompt(context: string) {
  const [open, setOpen] = useState(false);
  const after = useRef<null | (() => void)>(null);
  const ask = useCallback(async (then: () => void) => {
    if (agreed) { then(); return; }
    try {
      const response = await fetch("/api/my-data", { cache: "no-store" });
      if (response.ok && consentAccepted(await response.json() as Privacy)) { agreed = true; then(); return; }
    } catch { /* Fall through to the box; saving there reports a real error if the service is unreachable. */ }
    after.current = then; setOpen(true);
  }, []);
  const close = useCallback(() => { after.current = null; setOpen(false); }, []);
  const saved = useCallback(() => { agreed = true; setOpen(false); const next = after.current; after.current = null; next?.(); }, []);
  const dialog: ReactNode = open ? <DataChoicesEditor forceReview context={context} onClose={close} onSaved={saved} /> : null;
  return { ask, dialog };
}
