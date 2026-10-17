// The same owner-reviewed manifest drives the listening library and curated rankings.
import music from "@/data/open-music.json";

export const curatedTracks: { title: string; artist: string; album: string; recordingId?: string }[] =
  music.map(({ title, artist, album }) => ({ title, artist, album }));
