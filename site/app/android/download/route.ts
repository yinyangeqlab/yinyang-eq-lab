const repository = "https://github.com/yinyangeqlab/yinyang-android";
const manager = "YinYang-APK-Manager.apk";

export async function GET(request: Request) {
  // The public catalog has no credentials and only exposes published releases.
  let state = "unavailable";
  try {
    const release = await fetch("https://api.github.com/repos/yinyangeqlab/yinyang-android/releases/latest", {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "YinYang-EQ-Lab" },
      signal: AbortSignal.timeout(5000),
    });
    if (release.ok) {
      const data = await release.json() as { assets?: { name: string; state: string }[] };
      if (data.assets?.some(asset => asset.name === manager && asset.state === "uploaded")) {
        return Response.redirect(repository + "/releases/latest/download/" + manager, 302);
      }
      state = "testing";
    } else if (release.status === 404) {
      state = "testing";
    }
  } catch {
    // Allow the listener to return to the install instructions if GitHub is unreachable.
  }
  return new Response(null, { status: 302, headers: {
    Location: new URL("/android?download=" + state + "#install", request.url).href,
    "Cache-Control": "no-store",
  } });
}
