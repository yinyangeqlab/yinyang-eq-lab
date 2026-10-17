import measuredTracks from "@/data/music-candidates.json";
import shantaeTracks from "@/data/shantae-cc-tracks.json";
import shantaeAudio from "@/data/shantae-audio.json";

export type MusicCandidate = {
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

export const musicCandidates: MusicCandidate[] = [
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
