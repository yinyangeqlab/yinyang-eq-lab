import { maintenanceResponse } from "@/lib/maintenance";
import { getDb } from "@/db";
import { targets, votes } from "@/db/schema";
import { curatedTracks } from "@/lib/curated-tracks";

const norm = (value: string | null | undefined) => (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");

export async function GET() {
  const maintenance = maintenanceResponse();
  if (maintenance) return maintenance;
  const db = getDb();
  const [allTargets, allVotes] = await Promise.all([db.select().from(targets), db.select().from(votes)]);
  const approved = new Set(allTargets.filter(t => t.status === "approved").map(t => t.id));
  const qualified = allVotes.filter(v => (v.testMode === "blind" || v.testMode === "bring") && v.eligible === 1 && approved.has(v.winnerId) && approved.has(v.loserId) && (v.heardA ?? 0) >= 5 && (v.heardB ?? 0) >= 5);
  const cohorts = new Map<string, Set<string>>();
  for (const vote of qualified) {
    if (!vote.sha256 || !vote.songTitle || !vote.songArtist || !vote.songAlbum || !vote.recordingId) continue;
    const key = [vote.sha256, vote.songTitle, vote.songArtist, vote.songAlbum, vote.recordingId].map(norm).join("|");
    if (!cohorts.has(key)) cohorts.set(key, new Set());
    cohorts.get(key)!.add(vote.voterId);
  }
  const curatedVotes = qualified.filter(v => curatedTracks.some(track =>
    norm(track.title) === norm(v.songTitle) && norm(track.artist) === norm(v.songArtist) && norm(track.album) === norm(v.songAlbum) &&
    (!track.recordingId || norm(track.recordingId) === norm(v.recordingId))));
  const verifiedVotes = qualified.filter(v => {
    if (!v.sha256 || !v.songTitle || !v.songArtist || !v.songAlbum || !v.recordingId) return false;
    const key = [v.sha256, v.songTitle, v.songArtist, v.songAlbum, v.recordingId].map(norm).join("|");
    return (cohorts.get(key)?.size ?? 0) >= 2;
  });
  const rank = (selected: typeof allVotes) => {
    const rows = new Map(allTargets.filter(t => t.status === "approved").map(t => [t.id, { id: t.id, name: t.name, creator: t.creator, rating: 1500, wins: 0, losses: 0 }]));
    for (const vote of selected.sort((a, b) => a.createdAt - b.createdAt)) {
      const winner = rows.get(vote.winnerId), loser = rows.get(vote.loserId);
      if (!winner || !loser) continue;
      const delta = 24 * (1 - 1 / (1 + Math.pow(10, (loser.rating - winner.rating) / 400)));
      winner.rating += delta; loser.rating -= delta; winner.wins++; loser.losses++;
    }
    return { voteCount: selected.length, rows: [...rows.values()].filter(t => t.wins + t.losses).sort((a, b) => b.rating - a.rating) };
  };
  const byType = (selected: typeof allVotes, type: "ie" | "oe") => {
    return rank(selected.filter(v => v.headphoneType === type)).rows;
  };
  const randomVotes=qualified.filter(v=>v.testMode==="blind"),bringVotes=qualified.filter(v=>v.testMode==="bring");
  const reasonCounts=Object.fromEntries(["Sounds harsh","Too bright","Too dark","Too muddy","Too loud","Too quiet"].map(reason=>[reason,qualified.filter(v=>{try{return JSON.parse(v.reasonTags??"[]").includes(reason);}catch{return false;}}).length]));
  return Response.json({ reasonCounts, all: rank(qualified), random: rank(randomVotes), bring: rank(bringVotes), curated: { ...rank(curatedVotes), trackCount: curatedTracks.length }, verified: rank(verifiedVotes),
    categories: { random: { ie: byType(randomVotes, "ie"), oe: byType(randomVotes, "oe") }, bring: { ie: byType(bringVotes, "ie"), oe: byType(bringVotes, "oe") }, all: { ie: byType(qualified, "ie"), oe: byType(qualified, "oe") }, curated: { ie: byType(curatedVotes, "ie"), oe: byType(curatedVotes, "oe") }, verified: { ie: byType(verifiedVotes, "ie"), oe: byType(verifiedVotes, "oe") } } });
}
