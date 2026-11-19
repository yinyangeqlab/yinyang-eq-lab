import { permanentRedirect } from "next/navigation";

export default async function LegacyAndroidPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === "string") query.append(key, value);
    else for (const item of value ?? []) query.append(key, item);
  }
  permanentRedirect("/q5k4android" + (query.size ? "?" + query : ""));
}
