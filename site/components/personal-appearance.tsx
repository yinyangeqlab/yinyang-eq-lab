import type { PersonalAppearance } from "@/lib/personal-shootout";
import "./personal-appearance.css";

const labels: Record<PersonalAppearance["status"], string> = {
  unheard: "Unheard · stays in rotation",
  active: "In rotation",
  contender: "Shows more often",
  rare: "Shows occasionally",
  retired: "Out of rotation",
  retained: "Kept to make a pair",
  restored: "Restored to rotation",
  excluded: "Set aside by you",
};

export default function PersonalAppearanceBar({ appearance, name }: { appearance: PersonalAppearance | undefined; name: string }) {
  if (!appearance) return null;
  const { progress, status } = appearance;
  const label = labels[status];
  return <div className="personal-appearance" data-status={status}>
    <span className="personal-appearance-label">
      <span>{label}</span>
      {status !== "excluded" && <span>{progress}% to cutoff</span>}
    </span>
    <progress value={progress} max={100} aria-label={`${name} rotation cutoff progress`} aria-valuetext={status === "excluded" ? label : `${progress}% to cutoff. ${label}.`}/>
  </div>;
}
