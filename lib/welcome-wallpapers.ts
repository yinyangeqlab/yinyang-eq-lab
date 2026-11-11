export const wallpaperScenes = [
  { id: "landscape", title: "Landscape only" },
  { id: "flying-gear", title: "Headphones, IEMs & flying carpets" },
] as const;

export const wallpaperSizes = [
  { id: "4k", label: "4K", width: 3840, height: 2160 },
  { id: "1080p", label: "1080p", width: 1920, height: 1080 },
] as const;

export const wallpaperFormats = [
  { extension: "mp4", label: "MP4", kind: "video" },
  { extension: "webm", label: "WebM", kind: "video" },
  { extension: "jpg", label: "JPEG", kind: "still" },
  { extension: "png", label: "PNG", kind: "still" },
] as const;

export const wallpaperDirectory = "/wallpapers";
export const wallpaperManifest = "files.json";
export const wallpaperFilename = (scene: string, size: string, extension: string) =>
  `yinyang-eq-${scene}-${size}.${extension}`;
export const offlineWallpaperFilename = (scene: string) => `yinyang-eq-${scene}-offline.zip`;
