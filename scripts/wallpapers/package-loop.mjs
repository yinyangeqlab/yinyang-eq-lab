import {execFile} from "node:child_process";
import {mkdir, mkdtemp, readFile, rename, rm, stat, writeFile} from "node:fs/promises";
import {join, resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {promisify} from "node:util";

import {offlineWallpaperFilename, wallpaperEditions, wallpaperFilename, wallpaperFormats, wallpaperLayouts, wallpaperManifest, wallpaperScenesFor} from "../../site/lib/welcome-wallpapers.ts";

const run = promisify(execFile);
const html = await readFile(new URL("./loop-player.html", import.meta.url), "utf8");

async function packageLoop(folder, source, id, layout, usageFile) {
  const size = layout.sizes.find(size => size.label === "1080p");
  const video = wallpaperFilename(id, size.id, "mp4"), poster = wallpaperFilename(id, size.id, "jpg");
  const name = offlineWallpaperFilename(id, layout.id);


  await run("python3", [
    "-c", `import sys, zipfile
from pathlib import Path
folder=Path(sys.argv[1])
with zipfile.ZipFile(folder/sys.argv[2],"w") as z:
 z.writestr(zipfile.ZipInfo("index.html"),sys.argv[6])
 for filename, name in [(Path(sys.argv[3]),"wallpaper.mp4"),(Path(sys.argv[4]),"wallpaper.jpg"),(Path(sys.argv[5]),"WALLPAPER-USAGE.txt")]:
  z.writestr(zipfile.ZipInfo(name),filename.read_bytes())
with zipfile.ZipFile(folder/sys.argv[2]) as z:
 assert not z.testzip()`,
    folder, name, join(source, video), join(source, poster), usageFile, html
  ]);
  return name;
}

export async function packageLayoutLoops(library, sizes, layouts = wallpaperLayouts) {
  const staging = resolve("artifacts/wallpaper-variants");
  await mkdir(staging, {recursive: true});
  const folder = await mkdtemp(join(staging, "offline-"));
  try {
    const archives = new Map();
    for (const layout of layouts)
      for (const edition of wallpaperEditions) {
        for (const scene of wallpaperScenesFor(edition)) {
          for (const size of layout.sizes)
            for (const format of wallpaperFormats) {
              const name = wallpaperFilename(scene.id, size.id, format.extension);
              const bytes = sizes[name];
              if (!bytes || (await stat(join(library, name))).size !== bytes)
                throw Error("Incomplete wallpaper: " + name);
            }
          // The original desktop bundles keep their live WebGL renderer.
          if (layout.id === "desktop" && !edition.suffix) continue;
          const name = await packageLoop(folder, library, scene.id, layout, join(library, "usage.txt"));
          const bytes = (await stat(join(folder, name))).size;
          if (!bytes || bytes >= 25 * 1024 * 1024) throw Error("Invalid offline wallpaper size: " + name);
          archives.set(name, bytes);
        }
      }
    for (const [name, bytes] of archives) {
      await rename(join(folder, name), join(library, name));
      sizes[name] = bytes;
    }
    await writeFile(join(folder, wallpaperManifest), JSON.stringify(sizes, null, 2) + "\n");
    await rename(join(folder, wallpaperManifest), join(library, wallpaperManifest));
    console.log("Verified", archives.size, "offline wallpapers and all media sizes.");
  } finally {
    await rm(folder, {recursive: true, force: true});
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const library = resolve("public/wallpapers");
  await packageLayoutLoops(library, JSON.parse(await readFile(join(library, wallpaperManifest), "utf8")));
}
