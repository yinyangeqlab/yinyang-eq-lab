export type SongSuggestion = { title: string; artist: string; album?: string; recordingId?: string };

const normalize = (value: string) => value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");

export function matchSongSuggestion(filename: string, suggestions: SongSuggestion[]): SongSuggestion | null {
  const stem = filename.replace(/\.[^.]+$/, "");
  const parts = stem.split(/\s+[-–—]\s+/).map(normalize).filter(Boolean);
  const whole = normalize(stem);
  const matches = suggestions.filter(song => {
    const title = normalize(song.title), artist = normalize(song.artist);
    return !!title && (parts.includes(title) || whole === title || whole === `${artist} ${title}` || whole === `${title} ${artist}`);
  });
  return matches.length === 1 ? matches[0] : null;
}

export function guessSongDetails(filename: string): SongSuggestion {
  const stem = filename.replace(/\.[^.]+$/, "");
  const parts = stem.split(/\s+[-–—]\s+/);
  if (parts.length === 2 || (parts.length === 3 && parts[2].length <= 4)) return { title: parts[1], artist: parts[0] };
  return { title: stem.replace(/[_-]+/g, " "), artist: "" };
}
