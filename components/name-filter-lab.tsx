"use client";

import { useMemo, useState } from "react";
import { screenTargetName } from "@/lib/target-name-policy";

const challenge: [string, "allow" | "block"][] = [
  ["Bass Boost", "allow"], ["Class A reference", "allow"], ["Cockpit EQ", "allow"],
  ["Scunthorpe Neutral", "allow"], ["Glass Harman", "allow"], ["Schiit Modi", "allow"],
  ["Dickinson Studio", "allow"], ["Essex Audio", "allow"], ["Assistant 3", "allow"],
  ["Warm reference v2", "allow"], ["shit", "block"], ["sh1t", "block"],
  ["s.h.i.t", "block"], ["f*ck", "block"], ["f.u.c.k", "block"],
  ["fuuuck", "block"], ["f@ck", "block"], ["fuckbass", "block"], ["B!TCH", "block"], ["motherfucker", "block"],
  ["asshole", "block"], ["cunt", "block"], ["c\u200bunt", "block"],
  ["d!ck", "block"], ["damn", "block"], ["hell", "block"],
];

export default function NameFilterLab() {
  const [batch, setBatch] = useState("");
  const [loadedChallenge, setLoadedChallenge] = useState(false);
  const rows = useMemo(() => batch.split(/\r?\n/).map(line => {
    const [name, expected] = line.split("\t");
    return { name: name?.trim() ?? "", expected: expected?.trim().toLowerCase(), result: screenTargetName(name ?? "") };
  }).filter(row => row.name).slice(0, 500), [batch]);
  const blocked = rows.filter(row => row.result.blocked).length;
  const labeled = rows.filter(row => row.expected === "allow" || row.expected === "block");
  const mistakes = labeled.filter(row => (row.result.blocked ? "block" : "allow") !== row.expected);
  return <section className="name-filter-lab"><h2>Target name filter test</h2>
    <p>Test the same rules used when someone creates or submits a target. Paste up to 500 names, one per line. Add a tab followed by <code>allow</code> or <code>block</code> to score expected results. Nothing entered here is saved or submitted.</p>
    <div className="name-filter-actions"><button type="button" onClick={() => { setBatch(challenge.map(([name, expected]) => `${name}\t${expected}`).join("\n")); setLoadedChallenge(true); }}>Load challenge set</button><button type="button" onClick={() => { setBatch(""); setLoadedChallenge(false); }}>Clear</button></div>
    <textarea aria-label="Target names to test" value={batch} onChange={event => { setBatch(event.target.value); setLoadedChallenge(false); }} placeholder={"Bass Boost\tallow\nf.u.c.k\tblock\nYour own name"} rows={9} spellCheck={false} />
    <p className="footnote">{rows.length} names · {blocked} blocked · {rows.length - blocked} allowed{labeled.length ? ` · ${mistakes.length} disagreement${mistakes.length === 1 ? "" : "s"} with expected labels` : ""}. {loadedChallenge ? "The challenge set includes safe audio terms and disguised profanity." : ""}</p>
    {rows.length > 0 && <div className="owner-table-wrap"><table><thead><tr><th>Name</th><th>Result</th><th>Matched rule</th><th>Expected</th></tr></thead><tbody>{rows.map((row, index) => { const actual = row.result.blocked ? "block" : "allow"; const mismatch = (row.expected === "allow" || row.expected === "block") && actual !== row.expected; return <tr key={`${index}-${row.name}`} className={mismatch ? "name-filter-mismatch" : ""}><td>{row.name}</td><td>{actual === "block" ? "Block" : "Allow"}</td><td>{row.result.flags.length ? row.result.flags.map(flag => `${flag.category}: ${flag.rule} (${flag.form})`).join(", ") : "—"}</td><td>{row.expected === "allow" || row.expected === "block" ? <>{row.expected}{mismatch ? " · mismatch" : ""}</> : "—"}</td></tr>; })}</tbody></table></div>}
    <p className="footnote">The filter covers a broad English list plus common terms in several other languages. No word list can catch every new spelling or avoid every false positive; submitted targets still require owner approval.</p>
  </section>;
}
