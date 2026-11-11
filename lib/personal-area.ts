export const PERSONAL_AREA_TITLE = "My Collection";
export const PERSONAL_AREA_TABS = [
  { section: "profile", label: "Results" },
  { section: "measurements", label: "Headphones" },
  { section: "upload", label: "Targets" },
  { section: "eqs", label: "Saved EQs" },
] as const;
export type PersonalAreaSection = typeof PERSONAL_AREA_TABS[number]["section"];
export function isPersonalAreaSection(value: string | null): value is PersonalAreaSection {
  return PERSONAL_AREA_TABS.some(tab => tab.section === value);
}
