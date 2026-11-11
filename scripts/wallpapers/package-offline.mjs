import { execFileSync } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { build } from "esbuild";
import { offlineWallpaperFilename, wallpaperScenes } from "../../lib/welcome-wallpapers.ts";

const readme = `YinYang EQ — Offline desktop wallpaper

Extract the ZIP to its own folder. Open index.html in a modern browser to
preview the animation. It works directly from disk without internet access.

Wallpaper Engine (Windows): Open the wallpaper editor, choose Create Wallpaper,
and import index.html as a web wallpaper from the extracted folder.
https://docs.wallpaperengine.io/en/web/first/gettingstarted.html

Lively Wallpaper (Windows): Import the local index.html as a web wallpaper.
https://github.com/lively-community/lively/wiki/Web-Player

Use a downloaded still for a standard desktop background, or import an MP4
loop if your wallpaper app does not support web wallpapers or WebGL.
`;

export async function packageOfflineWallpapers(root, folder) {
  const css = await readFile(join(root, "app/welcome.css"), "utf8");
  const image = async name => "data:image/webp;base64," + (await readFile(join(root, "public", name))).toString("base64");
  const [texture, still, headphones, iems] = await Promise.all([
    "brand-landscape.webp", "brand-landscape-crimson.webp", "welcome-headphone-carpet.webp", "welcome-iem-carpet.webp",
  ].map(image));
  const sizes = {};
  for (const scene of wallpaperScenes) {
    const flights = scene.id === "flying-gear";
    const bundle = await build({
      entryPoints: [join(root, "scripts/wallpapers/offline.tsx")],
      tsconfig: join(root, "tsconfig.json"), bundle: true, write: false, minify: true, format: "iife", jsx: "automatic",
      define: {
        "process.env.NODE_ENV": '"production"',
        OFFLINE_FLIGHTS: JSON.stringify(flights),
        OFFLINE_ARTWORK: JSON.stringify({ texture, still, flights: flights ? { headphones, iems } : { headphones: "", iems: "" } }),
      },
    });
    const script = bundle.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
    const title = scene.title.replaceAll("&", "&amp;");
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'">
<link rel="icon" href="data:,"><title>YinYang EQ · ${title}</title>
<style>${css}
html,body{margin:0;overflow:hidden;background:#020608}
#wallpaper{position:fixed;inset:0;container-type:inline-size;isolation:isolate}
#wallpaper .welcome-art{z-index:0}
</style></head><body><main id="wallpaper" aria-label="YinYang EQ wallpaper"></main><script>${script}</script></body></html>`;
    const name = offlineWallpaperFilename(scene.id);
    const path = join(folder, name);
    execFileSync("python3", ["-c", `import sys, zipfile
with zipfile.ZipFile(sys.argv[1], "w") as archive:
    archive.writestr(zipfile.ZipInfo("index.html"), sys.stdin.buffer.read(), compress_type=zipfile.ZIP_DEFLATED)
    archive.writestr(zipfile.ZipInfo("README.txt"), sys.argv[2], compress_type=zipfile.ZIP_DEFLATED)
with zipfile.ZipFile(sys.argv[1]) as archive:
    if archive.testzip() is not None:
        raise RuntimeError("Offline wallpaper failed its ZIP integrity check")
`, path, readme], { input: html });
    const { size } = await stat(path);
    if (!size || size >= 25 * 1024 * 1024) throw Error(`Invalid static asset size: ${name}`);
    sizes[name] = size;
  }
  return sizes;
}
