// Each background is rendered once. The symbol and the real flight capture are independent foregrounds.
import {execFile} from "node:child_process";
import {join} from "node:path";
import {rename} from "node:fs/promises";
import {promisify} from "node:util";

const run = promisify(execFile);
export const ffmpeg = args => run("ffmpeg", ["-hide_banner","-loglevel","error","-nostdin","-y",
  "-filter_complex_threads","4","-filter_threads","3", ...args], {maxBuffer: 1024*1024});
const readStill = name => ["-threads","2","-framerate","24","-i", name];

export async function renderBackground(folder, width, height, atlas) {
  const maps = join(folder, "water.mkv");
  await run("python3", ["scripts/wallpapers/water-motion.py", maps, String(width), String(height)]);
  const region = [
    "[0:v]scale=2*iw:2*ih:flags=bicubic,format=gbrp[atlas]",
    "[3:v]format=gray16le[mx]", "[4:v]format=gray16le[my]",
    "[atlas][mx][my]remap[sky]",
    "[sky][1:v]overlay=0:0:format=yuv444[base]",
    "[2:v]format=gbrp,extractplanes=r+g[dx][dy]",
    `[dx]scale=${width}:${height}:flags=bilinear:in_range=full:out_range=full,format=gray[x]`,
    `[dy]scale=${width}:${height}:flags=bilinear:in_range=full:out_range=full,format=gray[y]`,
    // On planar YUV, the neutral chroma in a gray map would displace only luma.
    // Apply matching luma/chroma offsets in RGB so fine wave edges stay registered.
    "[base]format=gbrp[b]",
    "[x]split=3[xr][xg][xb]", "[xr][xg][xb]mergeplanes=mapping=0x001020:format=gbrp[xmap]",
    "[y]split=3[yr][yg][yb]", "[yr][yg][yb]mergeplanes=mapping=0x001020:format=gbrp[ymap]",
    "[b][xmap][ymap]displace=edge=smear,split[scene][sample]",
    "[scene]format=yuv420p[out]", "[sample]select=eq(n\\,36),format=rgb24[poster]"
  ];
  await ffmpeg(["-threads","3","-i",atlas, ...readStill(join(folder,"land.png")), "-i", maps,
    ...readStill(join(folder,"map-x.png")), ...readStill(join(folder,"map-y.png")),
    "-filter_complex",region.join(";"),"-map","[out]","-frames:v","288","-an",
    "-c:v","libx264","-threads","5","-preset","veryfast","-crf","15","-g","48",
    "-movflags","+faststart",join(folder,"background.partial.mp4"),
    "-map","[poster]","-frames:v","1","-threads","2","-update","1",join(folder,"poster.png")]);
  await rename(join(folder,"background.partial.mp4"),join(folder,"background.mp4"));
}

const circle = {
  desktop: [.205,.285], ultrawide: [.155,.28], phone: [.31,.345],
  "tablet-portrait": [.28,.325], "tablet-landscape": [.235,.30],
};
export async function renderForeground({folder, flight, layout, artwork, symbol, flying, width, height, ext, output}) {
  const still = ext === "png";
  const args = [];
  const filters = [];
  let input = 0, layer = "0:v";
  const time = still ? "1.5" : "t";
  if (still) {
    args.push(...readStill(join(folder,"poster.png")));
  } else {
    if (flying) args.push("-stream_loop","1");
    args.push("-threads","3","-i",join(folder,"background.mp4"));
  }
  if (symbol) {
    const [proportion, position] = circle[layout];
    const widthPx = 2*Math.round(width*proportion*(artwork === "panorama" ? .82 : 1)/2);
    args.push(...readStill(join(folder,"orb.png")));
    filters.push(`[${++input}:v]scale=${widthPx}:${widthPx}:flags=lanczos[disc]`);
    filters.push(`[${layer}][disc]overlay=x=(W-w)/2:y='H*(${position}+.007*sin(2*PI*${time}/12))-h/2':format=auto[marked]`);
    layer = "marked";
  }
  if (flying) {
    if (still) args.push("-ss","1.5");
    args.push("-threads","3","-i",flight);
    const narrow = layout === "phone" || layout === "tablet-portrait";
    const flightWidth = width*(narrow ? 1.30 : 1);
    const flightY = height*(narrow ? .19 : .025);
    filters.push(`[${++input}:v]scale=${2*Math.round(flightWidth/2)}:-2:flags=bicubic[rig]`);
    filters.push(`[${layer}][rig]overlay=x=(W-w)/2:y=${Math.round(flightY)}:format=auto[gear]`);
    layer = "gear";
  }
  filters.push(`[${layer}]format=${still ? "rgb24" : "yuv420p"}[out]`);
  args.push("-filter_complex",filters.join(";"),"-map","[out]","-an");
  if (still) args.push("-frames:v","1","-threads","2","-update","1");
  else args.push("-frames:v",String(flying ? 576 : 288),"-c:v","libx264","-threads","4","-preset","veryfast",
    "-crf","18","-maxrate","5600k","-bufsize","6800k","-pix_fmt","yuv420p","-movflags","+faststart");
  return ffmpeg([...args,output]);
}
