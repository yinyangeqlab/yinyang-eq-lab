type ReleaseStatus = "published" | "missing" | "unavailable";

function edgeCache(): Cache | undefined {
  return typeof caches === "undefined" ? undefined : (caches as CacheStorage & { default?: Cache }).default;
}

function fetchGitHub(url: string, accept: string) {
  return fetch(url, {
    headers: { Accept: accept, "User-Agent": "YinYang-EQ-Version" },
    redirect: "manual",
    cache: "no-store",
    signal: AbortSignal.timeout(2_000),
  });
}

async function checkGitHub(endpoint: string, tag: string, publicReleaseUrl: string): Promise<ReleaseStatus> {
  try {
    const response = await fetchGitHub(endpoint, "application/vnd.github+json");
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

async function isInReleaseFeed(feedUrl: string, publicReleaseUrl: string) {
  try {
    const response = await fetchGitHub(feedUrl, "application/atom+xml");
    if (!response.ok || !response.headers.get("content-type")?.includes("application/atom+xml")) return false;

    const feed = await response.text();
    for (const [entry] of feed.matchAll(/<entry(?:\s[^>]*)?>[\s\S]*?<\/entry>/g)) {
      const link = entry.match(/<link\s+rel="alternate"\s+type="text\/html"\s+href="([^"]+)"\s*\/>/);
      if (link?.[1] === publicReleaseUrl) return true;
    }
  } catch {
    // A failed feed request supplies no publication evidence.
  }
  return false;
}

export function createPublishedBuildLookup(repositoryUrl: string, tag: string) {
  const apiPath = new URL(repositoryUrl).pathname;
  const safeTag = encodeURIComponent(tag);
  const endpoint = `https://api.github.com/repos${apiPath}/releases/tags/${safeTag}`;
  const publicReleaseUrl = `${repositoryUrl}/releases/tag/${safeTag}`;
  const feedUrl = `${repositoryUrl}/releases.atom`;
  const cacheKey = `https://yinyangeq.com/__internal/github-release/v2${apiPath}/${safeTag}`;
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

    let status = await checkGitHub(endpoint, tag, publicReleaseUrl);
    if (status === "unavailable" && await isInReleaseFeed(feedUrl, publicReleaseUrl)) status = "published";
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
    // An exact tag verified at publication does not depend on a live API lookup.
    if (verifiedTag === tag) return tag;
    const status = lastCheck && lastCheck.expiresAt > Date.now()
      ? lastCheck.status
      : await (pending ??= checkRelease().finally(() => { pending = undefined; }));
    return status === "published" ? tag : undefined;
  };
}
