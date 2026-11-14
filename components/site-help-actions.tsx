"use client";

import { createContext, useContext, useRef, useState, type ReactNode } from "react";

export type BassCutApproval = { before: number; after: number };
export type BassCutReceipt = { restoredGain: number };

export type BassCutRequest =
  | { phase: "prepare" }
  | { phase: "confirm"; approval: BassCutApproval }
  | { phase: "cancel"; approval: BassCutApproval }
  | { phase: "undo"; receipt: BassCutReceipt };

export type BassCutResult =
  | { status: "ready"; approval: BassCutApproval }
  | { status: "applied"; receipt: BassCutReceipt }
  | { status: "undone" | "cancelled" | "unavailable" | "limit" | "changed" };

type BassCutHandler = (request: BassCutRequest) => BassCutResult;

const SiteHelpActions = createContext<{
  register: (handler: BassCutHandler) => () => void;
  bassCut: BassCutHandler;
} | null>(null);

export function SiteHelpActionsProvider({ children }: { children: ReactNode }) {
  const handler = useRef<BassCutHandler | null>(null);
  const [actions] = useState(() => ({
    register(next: BassCutHandler) {
      handler.current = next;
      return () => { if (handler.current === next) handler.current = null; };
    },
    bassCut(request: BassCutRequest): BassCutResult {
      return handler.current?.(request) ?? { status: "unavailable" };
    },
  }));
  return <SiteHelpActions.Provider value={actions}>{children}</SiteHelpActions.Provider>;
}

export function useSiteHelpActions() {
  return useContext(SiteHelpActions);
}
