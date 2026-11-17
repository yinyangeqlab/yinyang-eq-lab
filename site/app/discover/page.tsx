import { redirect } from "next/navigation";

// Retain existing links while the directory is merged into the Research area.
export default function DiscoverPage() {
  redirect("/shootout?tab=rankings");
}
