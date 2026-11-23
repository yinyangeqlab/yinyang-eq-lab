import { legacyAndroidRedirect, type AndroidSearchParams } from "../redirect";

export default function LegacyAndroidPage({ searchParams }: { searchParams: AndroidSearchParams }) {
  return legacyAndroidRedirect("/android/trailer", searchParams);
}
