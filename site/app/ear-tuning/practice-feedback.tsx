import type { ReactNode } from "react";

export function PracticeFeedback({ correct, streak, reversed, children }: {
  correct: boolean;
  streak: number;
  reversed: boolean;
  children: ReactNode;
}) {
  const title = correct
    ? streak >= 3 ? "You’re getting the hang of it!" : streak === 2 ? "Nailed it!" : "Correct! Good job!"
    : reversed ? "Other way around." : "Not quite.";

  return <div className="ear-practice-feedback" data-correct={correct}>
    <strong>{title}</strong>
    <p>{children}</p>
  </div>;
}
