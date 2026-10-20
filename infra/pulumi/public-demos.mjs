// Public promotional recordings only. Protected listening media never uses this route.
const origin = "https://yinyangeq.com";
const demos = {
  trailer: {
    title: "YinYang EQ League — cinematic trailer",
    description: "Find your sound. Let your ears decide. A 54.6-second tour of YinYang EQ League, recorded October 17, 2026.",
    asset: "https://github.com/user-attachments/assets/a2e7a979-1a78-453f-836a-da6df3ad8a12",
    poster: "https://raw.githubusercontent.com/yinyangeqlab/yinyang-eq-league/main/docs/images/demo-poster.jpg",
    width: 1280, height: 720,
    credits: '“Discovery” by Scott Buckley — <a href="https://www.scottbuckley.com.au/library/discovery/">original source</a> · <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. Excerpt starts at 2:10; trimmed, loudness normalized and faded.',
  },
  demo: {
    title: "YinYang EQ League — mobile demo",
    description: "A 45.2-second tour of the mobile listening lab, recorded October 17, 2026.",
    asset: "https://github.com/user-attachments/assets/3502a781-9a84-45a2-8352-ff9a57ba0e49",
    poster: "https://raw.githubusercontent.com/yinyangeqlab/yinyang-eq-league/main/docs/images/mobile-demo-poster.jpg",
    width: 720, height: 1280,
    credits: '“The Funk” by Hotham — <a href="https://freemusicarchive.org/music/hotham/single/the-funk/">Free Music Archive source</a> · <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. Excerpt starts at 0:28; trimmed, loudness normalized and faded.',
  },
};
const paths = new Map(Object.keys(demos).flatMap(key => [[`/${key}`, key], [`/${key}.mp4`, key]]));
export function isPublicDemo(path) { return paths.has(path); }
export function publicDemoResponse(request) {
  const path = new URL(request.url).pathname;
  const key = paths.get(path);
  if (!key) return null;
  const headers = {"Cache-Control": "public, max-age=300", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer"};
  if (!["GET", "HEAD"].includes(request.method)) return new Response(null, {status: 405, headers: {...headers, Allow: "GET, HEAD"}});
  const demo = demos[key];
  if (path.endsWith(".mp4")) return new Response(null, {status: 307, headers: {...headers, Location: demo.asset}});
  const page = `${origin}/${key}`, video = `${page}.mp4`;
  const html = `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${demo.title}</title><meta name="description" content="${demo.description}"><link rel="canonical" href="${page}">
<meta property="og:site_name" content="YinYang EQ League"><meta property="og:title" content="${demo.title}">
<meta property="og:description" content="${demo.description}"><meta property="og:url" content="${page}">
<meta property="og:type" content="video.other"><meta property="og:video" content="${video}"><meta property="og:video:secure_url" content="${video}">
<meta property="og:video:type" content="video/mp4"><meta property="og:video:width" content="${demo.width}"><meta property="og:video:height" content="${demo.height}">
<meta property="og:image" content="${demo.poster}"><meta name="twitter:card" content="player"><meta name="twitter:title" content="${demo.title}">
<meta name="twitter:image" content="${demo.poster}"><meta name="twitter:player" content="${page}"><meta name="twitter:player:stream" content="${video}">
<meta name="twitter:player:stream:content_type" content="video/mp4"><meta name="twitter:player:width" content="${demo.width}"><meta name="twitter:player:height" content="${demo.height}">
<meta name="theme-color" content="#59d9ce">
<style>html{color-scheme:dark}body{margin:0;background:#080d12;color:#edf6f7;font:16px/1.6 system-ui,sans-serif}main{max-width:960px;margin:auto;padding:24px}h1{font-size:clamp(25px,5vw,38px);line-height:1.2}a{color:#79ddd1}a:focus-visible{outline:3px solid #b5a6ff;outline-offset:4px}video{display:block;width:100%;max-height:75vh;background:#000;border:1px solid #34434a;border-radius:12px;box-sizing:border-box}p{color:#becdd3}nav{display:flex;gap:20px;flex-wrap:wrap}.share{font-size:20px;overflow-wrap:anywhere}.credits{font-size:14px}</style>
</head><body><main><nav><a href="/">YinYang EQ League</a><a href="/${key === "trailer" ? "demo" : "trailer"}">${key === "trailer" ? "Mobile demo" : "Cinematic trailer"}</a></nav>
<h1>${demo.title}</h1><video controls playsinline preload="metadata" poster="${demo.poster}" width="${demo.width}" height="${demo.height}"><source src="${video}" type="video/mp4"><a href="${video}">Watch the video</a></video>
<p class="share">Share: <a href="${page}">${page.replace("https://", "")}</a></p><p>Recorded October 17, 2026. The current site includes additional features.</p>
<p class="credits">Music: ${demo.credits}</p><p><a href="https://github.com/yinyangeqlab/yinyang-eq-league/blob/main/docs/VIDEOS.md">Full video credits and original downloads</a></p>
</main></body></html>`;
  return new Response(request.method === "HEAD" ? null : html, {headers: {...headers, "Content-Type": "text/html; charset=utf-8", "Content-Length": String(new TextEncoder().encode(html).length)}});
}
