import originalLocalAudio from "@/data/listening-pool-original-audio.json";
import localTracks from "@/data/listening-pool-local.json";
import measurements from "@/data/listening-pool-measurements.json";
import measuredTracks from "@/data/music-candidates.json";
import shantaeTracks from "@/data/shantae-cc-tracks.json";
import shantaeAudio from "@/data/shantae-audio.json";

export type MusicCandidate = {
  songFamily?: string;
  sourceUrl?: string;
  versionLabel?: string;
  dynamicsCategory?: string | null;
  integrated_lufs?: number;
  true_peak_dbtp?: number;
  localOnly?: boolean;
  title: string;
  artist: string;
  album: string;
  url: string;
  license: string;
  duration: number;
  genre: string;
  focus: string;
  group: "dynamic" | "compact" | "unmeasured";
  fileUrl?: string;
  playerId?: number;
  lra?: number;
  crest_db?: number;
  bitrate_kbps?: number;
  filename?: string;
  previewNote?: string;
  credits?: string;
};

const originalCandidates: MusicCandidate[] = [
  ...(measuredTracks as MusicCandidate[]),
  ...shantaeTracks.map(track => ({
    title: track.title,
    artist: "Jake Kaufman",
    album: "Shantae: Half-Genie Hero OST",
    url: `https://virt.bandcamp.com/track/${track.slug}`,
    license: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
    duration: track.duration,
    genre: "Game soundtrack / chiptune",
    focus: track.focus,
    group: "unmeasured" as const,
    playerId: track.id,
    fileUrl: (shantaeAudio as Record<string, string>)[String(track.id)] || undefined,
    credits: "credits" in track ? track.credits : undefined,
    previewNote: (shantaeAudio as Record<string, string>)[String(track.id)]?.endsWith(".m4a") ? "AAC copy from the album download; loudness range has not been measured." : (shantaeAudio as Record<string, string>)[String(track.id)]?.endsWith(".mp3") ? "320 kbps MP3 encoded from the official album FLAC for site delivery; loudness range has not been measured." : (shantaeAudio as Record<string, string>)[String(track.id)] ? "Official album FLAC copy; loudness range has not been measured." : "Bandcamp-hosted player; audio has not been imported or analyzed for loudness range.",
  })),
];

// Development uses the local source server; production streams protected assets.
function playbackUrl(url: string | undefined) {
  const local = (originalLocalAudio as Record<string,string>)[url ?? ""] || url;
  return process.env.NODE_ENV === "production" ? local?.replace("/__local-listening-pool/", "/api/listening-audio/") : local;
}
export const musicCandidates: MusicCandidate[] = [
  ...originalCandidates.map(track => ({ ...track, ...(measurements as Record<string, object>)[track.fileUrl ?? ""], fileUrl: playbackUrl(track.fileUrl), previewNote: track.playerId ? "Official album audio; measured loudness and peaks. Peak-contrast classification pending." : track.previewNote })),
  ...(localTracks as MusicCandidate[]).map(track => ({ ...track, fileUrl: playbackUrl(track.fileUrl), localOnly: false, previewNote: "Original source audio, unchanged. Dynamics classification is provisional." })),
];
export const listeningPool = musicCandidates.filter((track): track is MusicCandidate & { fileUrl: string; filename: string; integrated_lufs: number } => Boolean(track.fileUrl) && Number.isFinite(track.integrated_lufs)).map(track => ({ ...track, filename: track.filename || track.fileUrl.split("/").pop() || "recording" }));
