import "./shootout-vote-label.css";

const labels = { a: "Prefer A", tie: "Unsure / Tie", b: "Prefer B" } as const;

export default function ShootoutVoteLabel({ choice }: { choice: keyof typeof labels }) {
  return <span className="vote-button-label" data-vote-choice={choice}>{labels[choice]}</span>;
}
