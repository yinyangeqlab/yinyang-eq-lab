import type { ComponentPropsWithoutRef } from "react";
import { Check } from "lucide-react";
import "./shootout-ballot.css";

const labels = { a: "Prefer A", tie: "Unsure / Tie", b: "Prefer B" } as const;
type Choice = keyof typeof labels;
type VoteProps = ComponentPropsWithoutRef<"button"> & { choice: Choice; locked: boolean; selected?: boolean };

export function ShootoutBallot(props: ComponentPropsWithoutRef<"div">) {
  return <div className="shootout-ballot" role="group" aria-label="Which sound do you prefer?" {...props}/>;
}

export function ShootoutVote({ choice, locked, disabled, selected, ...props }: VoteProps) {
  return (
    <button {...props} type="button" className="shootout-vote" data-vote-choice={choice}
      data-locked={locked || undefined} disabled={locked || disabled} aria-pressed={selected}>
      {locked && <span className="vote-necklace" aria-hidden="true"/>}
      {locked && <span className="vote-lock" aria-hidden="true"/>}
      {selected && <Check className="vote-check" size={16} aria-hidden="true"/>}
      <span className="vote-button-label">{labels[choice]}</span>
    </button>
  );
}
