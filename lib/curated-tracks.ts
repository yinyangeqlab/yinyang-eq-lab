// The original owner-reviewed shortlist classifies historical curated rankings.
// Shootout playback can also rotate measured Music Library challengers.
import music from "@/data/open-music.json";

export const curatedTracks: { title: string; artist: string; album: string; recordingId?: string }[] =
  music.map(({ title, artist, album }) => ({ title, artist, album }));
