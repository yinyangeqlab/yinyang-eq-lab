// Render the additional wallpaper editions from the released, matching original loops.
// The original downloads and previously sealed release directories are read-only inputs.
import {execFile} from "node:child_process";
import {createHash} from "node:crypto";
import {link, mkdir, readFile, rename, stat, unlink, writeFile} from "node:fs/promises";
import {basename, join, resolve} from "node:path";
import {promisify} from "node:util";
import sharp from "sharp";

import {wallpaperEditions, wallpaperFilename, wallpaperFormats, wallpaperLayouts, wallpaperManifest, wallpaperScenes,} from "../../site/lib/welcome-wallpapers.ts";

import {packageLayoutLoops} from "./package-loop.mjs";
import {addStillUsageNotice} from "./usage-notice.mjs";

const run = promisify(execFile);
const library = resolve("public/wallpapers");
const sky = resolve("scripts/wallpapers/artwork/aurora-sky.webp");
const panorama = resolve("site/components/first-listen/landscape-panorama.webp");
const usage = await readFile(join(library, "usage.txt"), "utf8");
const originals = JSON.parse(await readFile(join(library, wallpaperManifest)));
const inputs = [
  sky, panorama, new URL(import.meta.url), new URL("./usage-notice.mjs", import.meta.url),
  new URL("../../site/lib/welcome-wallpapers.ts", import.meta.url),
];
const fingerprint = createHash("sha256").update(usage);
for (const input of inputs) fingerprint.update(await readFile(input));
for (const scene of wallpaperScenes)
  for (const layout of wallpaperLayouts) {
    for (const ext of ["mp4", "png"]) {
      const name = wallpaperFilename(scene.id, layout.sizes[0].id, ext);
      const bytes = await readFile(join(library, name));
      if (bytes.length !== originals[name]) throw Error("Incomplete original wallpaper: " + name);
      fingerprint.update(bytes);
    }
  }
const scratch = resolve("artifacts/wallpaper-variants", fingerprint.digest("hex").slice(0, 20));
await mkdir(scratch, {recursive: true});

// Map the same clean aurora into the sky of each art-directed original.
// Radius is a fraction of frame width. Drift accounts for the floating disc in the loops.
const framing = {
  desktop: {y: .272, radius: .101, drift: .037, center: .72},
  phone: {y: .427, radius: .152, drift: .008, center: .79},
  "tablet-landscape": {y: .332, radius: .119, drift: .011, center: .75},
  "tablet-portrait": {y: .373, radius: .139, drift: .01, center: .77},
  ultrawide: {y: .290, radius: .102, drift: .045, center: .64},
};
const even = v => Math.max(2, 2 * Math.round(v / 2));
function smooth(x) {
  x = Math.max(0, Math.min(1, x));
  return x * x * (3 - 2 * x);
}
async function mask(width, height, alpha) {
  const bytes = Buffer.alloc(width * height);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) bytes[y * width + x] = Math.round(255 * alpha(x, y));
  return sharp(bytes, {raw: {width, height, channels: 1}}).toColourspace("b-w").png().toBuffer();
}
async function plates(layout) {
  const {width: w, height: h} = layout.sizes[0], frame = framing[layout.id];
  const folder = join(scratch, layout.id);
  await mkdir(folder, {recursive: true});
  const cx = w / 2, cy = h * frame.y, rx = w * frame.radius, ry = rx + frame.drift * h;
  const feather = Math.max(12, rx * .34);
  const x = even(cx - rx - feather), y = Math.max(0, even(cy - ry - feather) - 2);
  const pw = even(w - 2 * x), ph = even(cy + ry + feather - y);
  const alpha = await mask(pw, ph, (i, j) => {
    const dy = Math.max(0, Math.abs(y + j - cy) - frame.drift * h);
    return 1 - smooth((Math.hypot(x + i - cx, dy) - rx) / feather);
  });
  const color = await sharp(sky).resize(pw, ph, {fit: "fill"}).removeAlpha().png().toBuffer();
  const patch = join(folder, "sky.png");
  await sharp(color)
      .joinChannel(
          await sharp(alpha).greyscale().raw().toBuffer(), {raw: {width: pw, height: ph, channels: 1}})
      .png()
      .toFile(patch);
  const fw = even(w * frame.center), fh = even(h * frame.center);
  const mx = even((w - fw) / 2), my = even((h - fh) * .50);
  const matte = join(folder, "center.png"), back = join(folder, "panorama.png");
  await writeFile(
      matte,
      await mask(
          fw, fh,
          (i, j) =>
              smooth(Math.min(i, fw - 1 - i) / (.20 * fw)) * smooth(Math.min(j, fh - 1 - j) / (.17 * fh))));
  await sharp(panorama).resize(w, h, {fit: "cover", position: "centre"}).png().toFile(back);
  return {w, h, x, y, pw, ph, patch, fw, fh, mx, my, matte, back};
}
const ffmpeg = args =>
    run("ffmpeg",
        [
          "-nostdin", "-hide_banner", "-loglevel", "error", "-y", "-filter_complex_threads", "3",
          "-filter_threads", "2", ...args
        ],
        {maxBuffer: 1024 * 1024});
async function makeMaster(scene, layout, edition, plate, ext, output) {
  const input = join(library, wallpaperFilename(scene.id, layout.sizes[0].id, ext));
  const args = ["-threads", "3", "-i", input];
  const chain = [];
  let layer = "0:v", next = 1;
  if (!edition.symbol) {
    let patch = `${next++}:v`;
    const flying = scene.id === "flying-gear";
    if (flying && ext === "mp4") args.push("-loop", "1", "-framerate", "24");
    args.push("-i", plate.patch);
    if (flying) {
      // The two original loops share their background frames. Their difference
      // preserves passing headphones, IEMs and carpets in front of the new sky.
      if (ext === "mp4") args.push("-stream_loop", "1");
      args.push(
          "-threads", "2", "-i", join(library, wallpaperFilename("landscape", layout.sizes[0].id, ext)));
      const region = `crop=${plate.pw}:${plate.ph}:${plate.x}:${plate.y},format=gbrp`;
      chain.push(
          `[${layer}]split[scene][compare]`, `[compare]${region}[flying]`, `[${next++}:v]${region}[empty]`);
      chain.push(
          "[flying][empty]blend=all_mode=difference,format=gray,lut=y='255-clip((val-14)*12,0,255)'[background]");
      chain.push(
          `[${patch}]split[sky][rgba]`, "[rgba]alphaextract[alpha]",
          "[alpha][background]blend=all_mode=multiply[opacity]", "[sky][opacity]alphamerge[skyPatch]");
      layer = "scene";
      patch = "skyPatch";
    }
    chain.push(`[${layer}][${patch}]overlay=x=${plate.x}:y=${plate.y}:format=auto[clean]`);
    layer = "clean";
  }
  if (edition.artwork === "panorama") {
    args.push("-i", plate.matte, "-i", plate.back);
    chain.push(`[${layer}]scale=${plate.fw}:${plate.fh}:flags=lanczos,format=rgb24[center]`);
    chain.push(`[center][${next++}:v]alphamerge[feathered]`);
    // Give the still background the loop's clock; otherwise overlay ends after one frame.
    chain.push(`[${next}:v]loop=loop=-1:size=1:start=0,setpts=N/(24*TB)[back]`);
    chain.push(`[back][feathered]overlay=x=${plate.mx}:y=${plate.my}:shortest=1:format=auto[composite]`);
    layer = "composite";
  }
  const still = ext === "png";
  chain.push(`[${layer}]format=${still ? "rgb24" : "yuv420p"}[out]`);
  args.push("-filter_complex", chain.join(";"), "-map", "[out]", "-an");
  if (still)
    args.push("-frames:v", "1", "-threads", "2", "-compression_level", "4", "-update", "1");
  else
    args.push("-frames:v", String(scene.id === "flying-gear" ? 576 : 288), "-r", "24", ...h264(5500));
  await ffmpeg([...args, output]);
}
function h264(kbps) {
  return [
    "-c:v", "libx264", "-threads", "4", "-preset", "veryfast", "-crf", "19", "-maxrate", kbps + "k",
    "-bufsize", kbps + "k", "-pix_fmt", "yuv420p", "-movflags", "+faststart"
  ];
}
const codec = {
  mp4: "h264",
  webm: "vp9",
  png: "png",
  jpg: "mjpeg"
};
async function verify(file, size, ext, seconds) {
  const {stdout} =
      await run("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", file]);
  const {streams, format} = JSON.parse(stdout), v = streams[0];
  if (streams.length !== 1 || v.codec_name !== codec[ext] || v.width !== size.width ||
      v.height !== size.height)
    throw Error("Wrong format or dimensions: " + file);
  if (ext === "webm" || ext === "mp4") {
    if (Math.abs(Number(format.duration) - seconds) > .05 || v.avg_frame_rate !== "24/1")
      throw Error("Incorrect loop timing: " + file);
  }
  const bytes = (await stat(file)).size;
  if (bytes <= 0 || bytes >= 25 * 1024 * 1024)
    throw Error("Wallpaper exceeds the release asset size limit: " + file);
  return bytes;
}
async function render(scene, layout, edition, plate) {
  const id = scene.id + edition.suffix, folder = join(scratch, layout.id, id);
  await mkdir(folder, {recursive: true});
  const done = join(folder, "verified.json");
  try {
    const saved = JSON.parse(await readFile(done, "utf8"));
    if ((await Promise.all(Object.entries(saved).map(
             async ([name, bytes]) => (await stat(join(folder, name))).size === bytes)))
            .every(Boolean))
      return saved;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const output = (size, ext) => join(folder, wallpaperFilename(id, size.id, ext));
  const full = layout.sizes[0], seconds = scene.id === "flying-gear" ? 24 : 12;
  const records = {};
  for (const ext of ["png", "mp4"]) await makeMaster(scene, layout, edition, plate, ext, output(full, ext));
  for (const size of layout.sizes) {
    if (size !== full) {
      await sharp(output(full, "png"))
          .resize(size.width, size.height, {fit: "cover"})
          .png()
          .toFile(output(size, "png"));
      await ffmpeg([
        "-threads", "3", "-i", output(full, "mp4"), "-vf",
        `scale=${size.width}:${size.height}:force_original_aspect_ratio=increase,crop=${size.width}:${
            size.height},setsar=1`,
        "-an", ...h264(size.label === "720p" ? 1400 : 2700), output(size, "mp4")
      ]);
    }
    await sharp(output(size, "png")).jpeg({quality: 92}).toFile(output(size, "jpg"));
    for (const ext of ["png", "jpg"]) {
      const path = output(size, ext);
      await writeFile(path, addStillUsageNotice(await readFile(path), ext, usage));
    }
    await ffmpeg([
      "-threads",
      "3",
      "-i",
      output(size, "mp4"),
      "-an",
      "-c:v",
      "libvpx-vp9",
      "-deadline",
      "realtime",
      "-cpu-used",
      "8",
      "-row-mt",
      "1",
      "-threads",
      "4",
      "-tile-columns",
      "2",
      "-b:v",
      size.label === "4K"       ? "3800k" :
          size.label === "720p" ? "1000k" :
                                  "1600k",
      "-crf",
      "29",
      "-g",
      "120",
      output(size, "webm")
    ]);
    for (const {extension} of wallpaperFormats)
      records[basename(output(size, extension))] =
          await verify(output(size, extension), size, extension, seconds);
  }
  await writeFile(done, JSON.stringify(records));
  console.log("Verified", layout.id, id, Object.keys(records).length, "downloads");
  return records;
}
const jobs = [];
for (const layout of wallpaperLayouts) {
  const plate = await plates(layout);
  for (const scene of wallpaperScenes)
    for (const edition of wallpaperEditions.slice(1)) jobs.push({scene, layout, edition, plate});
}
const records = {};
async function nextJob() {
  let job;
  while ((job = jobs.shift())) {
    const {scene, layout, edition, plate} = job;
    const files = await render(scene, layout, edition, plate);
    for (const [name, bytes] of Object.entries(files))
      records[name] = {bytes, path: join(scratch, layout.id, scene.id + edition.suffix, name)};
  }
}
await Promise.all([nextJob(), nextJob()]);
for (const [name, {path}] of Object.entries(records)) {
  const temporary = join(library, "." + name + ".prepared-" + process.pid);
  await link(path, temporary);
  await rename(temporary, join(library, name));
  // rename can be a no-op when both names already refer to the same inode.
  await unlink(temporary).catch(error => {
    if (error.code !== "ENOENT") throw error;
  });
}
const sizes = {
  ...originals,
  ...Object.fromEntries(Object.entries(records).map(([name, entry]) => [name, entry.bytes]))
};
await packageLayoutLoops(library, sizes);
console.log(
    "Installed", Object.keys(records).length, "verified images and videos with matching offline packages.");
