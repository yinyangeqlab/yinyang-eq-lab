type ReleaseStatus = "published" | "missing" | "unavailable";

function edgeCache(): Cache | undefined {
  return typeof caches === "undefined" ? undefined : (caches as CacheStorage & { default?: Cache }).default;
}

async function checkGitHub(endpoint: string, tag: string, publicReleaseUrl: string): Promise<ReleaseStatus> {
  try {
    const response = await fetch(endpoint, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "YinYang-EQ-Version" },
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(2_000),
    });
    if (response.status === 404) return "missing";
    if (!response.ok) return "unavailable";

    const release = await response.json() as {
      tag_name?: string; html_url?: string; draft?: boolean; published_at?: string | null;
    } | null;
    return release?.tag_name === tag && release.html_url === publicReleaseUrl
      && release.draft === false && typeof release.published_at === "string" && release.published_at.length > 0
      ? "published"
      : "unavailable";
  } catch {
    return "unavailable";
  }
}

export function createPublishedBuildLookup(repositoryUrl: string, tag: string) {
  const apiPath = new URL(repositoryUrl).pathname;
  const safeTag = encodeURIComponent(tag);
  const endpoint = `https://api.github.com/repos${apiPath}/releases/tags/${safeTag}`;
  const publicReleaseUrl = `${repositoryUrl}/releases/tag/${safeTag}`;
  const cacheKey = `https://yinyangeq.com/__internal/github-release/v1${apiPath}/${safeTag}`;
  let pending: Promise<ReleaseStatus> | undefined;
  let lastCheck: { status: ReleaseStatus; expiresAt: number } | undefined;

  function remember(status: ReleaseStatus, seconds: number) {
    lastCheck = { status, expiresAt: Date.now() + seconds * 1000 };
    return status;
  }

  async function checkRelease() {
    const cache = edgeCache();
    try {
      const status = await (await cache?.match(cacheKey))?.text();
      if (status === "published" || status === "missing" || status === "unavailable") return remember(status, 15);
    } catch {
      // The release can still be checked if the edge cache is unavailable.
    }

    const status = await checkGitHub(endpoint, tag, publicReleaseUrl);
    const seconds = status === "published" ? 3600 : 300;
    remember(status, seconds);
    try {
      await cache?.put(cacheKey, new Response(status, { headers: { "Cache-Control": `public, max-age=${seconds}` } }));
    } catch {
      // The isolate keeps the result until it expires if the edge write fails.
    }
    return status;
  }

  return async function publishedBuildTag(verifiedTag?: string): Promise<string | undefined> {
    const status = lastCheck && lastCheck.expiresAt > Date.now()
      ? lastCheck.status
      : await (pending ??= checkRelease().finally(() => { pending = undefined; }));
    if (status === "published") return tag;
    return status === "unavailable" && verifiedTag === tag ? verifiedTag : undefined;
  };
}
