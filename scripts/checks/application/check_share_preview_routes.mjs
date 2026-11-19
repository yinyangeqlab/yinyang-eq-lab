import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import ts from "typescript";
import * as share from "../../../site/lib/share-pages.mjs";

const { SITE_ORIGIN, sharePageFor, sharePages, shareHtml, shareImageUrl, shareAnimationUrl, previewTitle } = share;
const aliasDestinations = new Map([
  ["/android/download", "/q5k4android"],
  ["/android", "/q5k4android"],
  ["/home", "/"],
  ["/personal-tuning", "/preference-tuning"],
  ["/discover", "/shootout?tab=rankings"],
]);
const queryDestinations = new Map([
  ["/shootout?mode=blind", ["blind-research", "Blind Research"]],
  ["/shootout?mode=bring", ["blind-research", "Blind Research"]],
  ["/shootout?mode=open", ["open-comparison", "Open Comparison"]],
  ["/shootout?tab=rankings", ["rankings", "Research Rankings"]],
  ["/shootout?tab=measurements", ["private", "Private Page"]],
  ["/shootout?tab=profile", ["private", "Private Page"]],
  ["/shootout?tab=eqs", ["private", "Private Page"]],
  ["/shootout?tab=upload", ["private", "Private Page"]],
  ["/shootout?tab=music", ["song-suggestions", "Song Suggestions"]],
  ["/music-library?view=suggestions", ["song-suggestions", "Song Suggestions"]],
]);

function cardFor(href) {
  const { pathname, search } = new URL(href, SITE_ORIGIN);
  const page = sharePageFor(pathname, search);
  assert.ok(page, `Missing preview for ${href}`);
  return page;
}

function checkDestination(href, expected = href) {
  const page = cardFor(href);
  const destination = SITE_ORIGIN + expected;
  for (const animated of [false, true]) {
    const html = shareHtml(page, { animated });
    assert.ok(html.includes(`<link rel="canonical" href="${destination}">`), href);
    assert.ok(html.includes(`<meta property="og:url" content="${destination}">`), href);
    assert.ok(html.includes(`href="${destination}">Open YinYang EQ</a>`), href);
    assert.ok(!html.includes("fixture-secret"), `Private input echoed by ${href}`);
    const asset = (animated ? shareAnimationUrl(page) : null) ?? shareImageUrl(page);
    assert.ok(html.includes(`<meta property="og:image" content="${asset.url}">`), href);
    if (page.private || page.noIndex) assert.ok(html.includes('content="noindex,nofollow"'), href);
  }
}

for (const { path } of sharePages) checkDestination(path);
for (const [alias, destination] of aliasDestinations) checkDestination(alias, destination);
for (const [destination, [slug, title]] of queryDestinations) {
  const page = cardFor(destination);
  assert.equal(page.slug, slug, destination);
  assert.equal(previewTitle(page), title, destination);
  checkDestination(`${destination}&key=fixture-secret`, destination);
}
checkDestination("/shootout?tab=rankings&mode=open", "/shootout?mode=open");
checkDestination("/shootout?mode=unknown&tab=rankings", "/shootout?tab=rankings");
checkDestination("/shootout?tab=shootout", "/shootout");
checkDestination("/shootout?tab=unknown", "/shootout");
checkDestination("/my-data?trial=fixture-secret", "/my-data");
checkDestination("/participation?review=1&return_to=fixture-secret", "/participation");
assert.equal(sharePageFor("/does-not-exist"), null);
assert.equal(sharePageFor("/api/my-data"), null);

function* sourceFiles(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) yield* sourceFiles(new URL(`${entry.name}/`, directory));
    else if (/\.tsx?$/.test(entry.name)) yield new URL(entry.name, directory);
  }
}

const linkedPages = new Set();
for (const directory of ["site/app", "site/components", "site/lib"]) {
  for (const file of sourceFiles(new URL(`../../../${directory}/`, import.meta.url))) {
    const ast = ts.createSourceFile(file.pathname, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
    function visit(node) {
      const href = (ts.isJsxAttribute(node) || ts.isPropertyAssignment(node)) && node.name.getText(ast) === "href" && node.initializer;
      const value = href && (ts.isJsxExpression(href) ? href.expression : href);
      if (value && ts.isStringLiteralLike(value) && value.text.startsWith("/")) {
        const url = new URL(value.text, SITE_ORIGIN);
        const asset = new URL(`../../../public${url.pathname}`, import.meta.url);
        if (url.origin === SITE_ORIGIN && !/^\/(?:api|vendor)\//.test(url.pathname) && !/\.[^/]+$/.test(url.pathname)
          && !statSync(asset, { throwIfNoEntry: false })?.isFile()) {
          cardFor(url);
          linkedPages.add(url.pathname + url.search);
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(ast);
  }
}
assert.ok(linkedPages.size > 20, "The link audit must cover navigation and in-page links");

function loadSource(file, dependencies) {
  const source = readFileSync(new URL(`../../../${file}`, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    fileName: file,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  });
  const exports = {};
  const requireFixture = name => {
    assert.ok(Object.hasOwn(dependencies, name), `Missing dependency fixture ${name} for ${file}`);
    return dependencies[name];
  };
  new Function("require", "exports", outputText)(requireFixture, exports);
  return exports;
}

for (const [file, path] of [["site/app/discover/page.tsx", "/discover"], ["site/app/personal-tuning/page.tsx", "/personal-tuning"]]) {
  const { default: route } = loadSource(file, { "next/navigation": { redirect(url) { throw new Error(url); } } });
  assert.throws(route, { message: aliasDestinations.get(path) }, `Preview must match the redirect for ${path}`);
}

const id = "k7m2q9xwab";
const sharedTitle = "Synthetic blind shootout";
let userAgent = "";
const shareMetadata = loadSource("site/lib/share-metadata.ts", {
  "next/headers": { headers: async () => new Headers({ "user-agent": userAgent }) },
  "./share-pages.mjs": share,
});
const dependencies = {
  "@/lib/share-pages.mjs": share,
  "@/lib/share-metadata": shareMetadata,
  "@/lib/embed-store": { getShootout: async key => key === id ? { title: sharedTitle, targetIds: ["a", "b"] } : null },
  "@/components/embed-shootout": {},
  "@/components/embed-results": {},
  "react/jsx-runtime": {},
};
const dynamicRoutes = [
  ["site/app/s/[id]/page.tsx", `/s/${id}`, sharedTitle, share.sharedShootoutCard],
  ["site/app/embed/[id]/page.tsx", `/embed/${id}`, "Blind Shootout", share.sharedShootoutCard],
  ["site/app/s/[id]/results/page.tsx", `/s/${id}/results`, "Private Page", share.privateShareCard],
];
for (const [file, path, title, card] of dynamicRoutes) {
  const { generateMetadata } = loadSource(file, dependencies);
  for (const animated of [false, true]) {
    userAgent = animated ? "Discordbot/2.0" : "Slackbot-LinkExpanding 1.0";
    const metadata = await generateMetadata({ params: Promise.resolve({ id }) });
    const asset = animated ? shareAnimationUrl(card) : shareImageUrl(card);
    assert.equal(metadata.alternates.canonical, path);
    assert.equal(metadata.openGraph.url, path);
    assert.equal(metadata.openGraph.title, title);
    assert.equal(metadata.twitter.title, title);
    assert.deepEqual(metadata.openGraph.images, [asset]);
    assert.deepEqual(metadata.twitter.images, animated ? [] : [asset.url]);
    assert.deepEqual(metadata.robots, { index: false, follow: false });
    if (card.private) {
      assert.equal(metadata.referrer, "no-referrer");
      assert.ok(!JSON.stringify(metadata).includes(sharedTitle));
    }
  }
}

const { generateMetadata: sharedMetadata } = loadSource("site/app/s/[id]/page.tsx", dependencies);
const missing = await sharedMetadata({ params: Promise.resolve({ id: "doesntexst" }) });
assert.equal(missing.openGraph.title, "Shootout Not Found");
assert.deepEqual(missing.openGraph.images, []);
assert.deepEqual(missing.twitter.images, []);
assert.deepEqual(missing.robots, { index: false, follow: false });

// Discord fetches crawler HTML before loading the MP4 independently.
const trailerPath = "/q5k4android/trailer";
const trailer = sharePageFor(trailerPath);
const videoUrl = SITE_ORIGIN + "/android/companion-tour-portrait.mp4";
const trailerHtml = shareHtml(trailer, { animated: true });
assert.ok(trailerHtml.includes('property="og:type" content="video.other"'));
assert.ok(trailerHtml.includes('property="og:video" content="' + videoUrl + '"'));
assert.ok(trailerHtml.includes('property="og:video:type" content="video/mp4"'));
for (const path of [trailerPath, trailerPath + "/portrait"]) {
  const page = sharePageFor(path);
  const html = shareHtml(page, { animated: true });
  assert.equal(page.path, path);
  assert.equal(share.shareMetadataFields(path).alternates.canonical, trailerPath);
  assert.ok(html.includes(`<link rel="canonical" href="${SITE_ORIGIN}${trailerPath}">`));
  assert.ok(html.includes(`property="og:url" content="${SITE_ORIGIN}${path}"`));
  for (const field of ["width", "height"]) {
    assert.equal(page.image[field], page.video[field]);
    for (const type of ["image", "video"]) assert.ok(html.includes(`property="og:${type}:${field}" content="${page.video[field]}"`));
  }
}
assert.equal(share.shareMetadataFields(trailerPath).openGraph.videos[0].url, videoUrl);
assert.ok(!shareHtml(sharePageFor("/q5k4android"), { animated: true }).includes('property="og:video"'));

console.log(`PASS share-preview destinations, ${linkedPages.size} distinct internal links and ${dynamicRoutes.length} dynamic routes.`);
