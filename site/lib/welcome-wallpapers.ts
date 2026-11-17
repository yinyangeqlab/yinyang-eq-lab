export const wallpaperScenes = [
  { id: "landscape", title: "Landscape only" },
  { id: "flying-gear", title: "Headphones, IEMs & flying carpets" },
] as const;

export const wallpaperSizes = [
  { id: "4k", label: "4K", width: 3840, height: 2160 },
  { id: "1080p", label: "1080p", width: 1920, height: 1080 },
] as const;

export const wallpaperLayouts = [
  { id: "desktop", label: "Desktop (16:9)", sizes: wallpaperSizes },
  { id: "phone", label: "Phone (portrait)", sizes: [
    { id: "phone-4k", label: "4K", width: 2160, height: 3840 },
    { id: "phone-1080p", label: "1080p", width: 1080, height: 1920 },
    { id: "phone-720p", label: "720p", width: 720, height: 1280 },
  ] },
  { id: "tablet-landscape", label: "Tablet (landscape)", sizes: [
    { id: "tablet-landscape-4k", label: "4K", width: 2880, height: 2160 },
    { id: "tablet-landscape-1080p", label: "1080p", width: 1440, height: 1080 },
    { id: "tablet-landscape-720p", label: "720p", width: 960, height: 720 },
  ] },
  { id: "tablet-portrait", label: "Tablet (portrait)", sizes: [
    { id: "tablet-portrait-4k", label: "4K", width: 2160, height: 2880 },
    { id: "tablet-portrait-1080p", label: "1080p", width: 1080, height: 1440 },
    { id: "tablet-portrait-720p", label: "720p", width: 720, height: 960 },
  ] },
  { id: "ultrawide", label: "Ultrawide (21:9)", sizes: [
    { id: "ultrawide-4k", label: "4K", width: 3840, height: 1600 },
    { id: "ultrawide-1080p", label: "1080p", width: 2560, height: 1080 },
    { id: "ultrawide-720p", label: "720p", width: 1680, height: 720 },
  ] },
] as const;

export const wallpaperFormats = [
  { extension: "mp4", label: "MP4", kind: "video" },
  { extension: "webm", label: "WebM", kind: "video" },
  { extension: "jpg", label: "JPEG", kind: "still" },
  { extension: "png", label: "PNG", kind: "still" },
] as const;

export const wallpaperDirectory = "/wallpapers";
export const wallpaperManifest = "files.json";
export const wallpaperUsagePath = `${wallpaperDirectory}/usage.txt`;
export const wallpaperFilename = (scene: string, size: string, extension: string) =>
  `yinyang-eq-${scene}-${size}.${extension}`;
export const offlineWallpaperFilename = (scene: string) => `yinyang-eq-${scene}-offline.zip`;
