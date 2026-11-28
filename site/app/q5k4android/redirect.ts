import { permanentRedirect } from "next/navigation";

export type AndroidSearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function legacyAndroidRedirect(path: string, searchParams: AndroidSearchParams) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === "string") query.append(key, value);
    else for (const item of value ?? []) query.append(key, item);
  }
  permanentRedirect(path + (query.size ? "?" + query : ""));
}
