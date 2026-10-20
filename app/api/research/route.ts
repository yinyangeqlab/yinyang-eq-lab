import { rankingEvidence, type EvidenceVote } from "@/lib/ranking-evidence";
import { LISTENING_PROTOCOL } from "@/lib/listening-protocol";
import { maintenanceResponse } from "@/lib/maintenance";
import { rankPreferences } from "@/lib/preference-ranking";
import { curatedTracks } from "@/lib/curated-tracks";
import { fileFingerprint } from "@/lib/file-fingerprint";

const norm = (value: string | null | undefined) => (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");

export async function GET() {
  const maintenance = maintenanceResponse();
  if (maintenance) return maintenance;
  const evidence=await rankingEvidence();
  const allTargets=evidence.targets;
  const qualified: EvidenceVote[]=evidence.votes;
  function build(qualified: EvidenceVote[]) {
  const cohorts = new Map<string, Set<string>>();
  for (const vote of qualified) {
    const key = fileFingerprint(vote.sha256);
    if (!key) continue;
    if (!cohorts.has(key)) cohorts.set(key, new Set());
    cohorts.get(key)!.add(vote.voterId);
  }
  const curatedVotes = qualified.filter(v => curatedTracks.some(track =>
    norm(track.title) === norm(v.songTitle) && norm(track.artist) === norm(v.songArtist) && norm(track.album) === norm(v.songAlbum) &&
    (!track.recordingId || norm(track.recordingId) === norm(v.recordingId))));
  const verifiedVotes = qualified.filter(v => {
    const key = fileFingerprint(v.sha256);
    if (!key) return false;
    return (cohorts.get(key)?.size ?? 0) >= 2;
  });
  const approvedTargets = allTargets.filter(target => target.status === "approved");
  const rank = (selected: EvidenceVote[]) => rankPreferences(approvedTargets, selected);
  const byType = (selected: EvidenceVote[], type: "ie" | "oe") => {
    return rank(selected.filter(v => v.headphoneType === type)).rows;
  };
  const randomVotes=qualified.filter(v=>v.testMode==="blind"),bringVotes=qualified.filter(v=>v.testMode==="bring");
  const reasonCounts=Object.fromEntries(["Sounds harsh","Too bright","Too dark","Too muddy","Too loud","Too quiet"].map(reason=>[reason,qualified.filter(v=>{try{return JSON.parse(v.reasonTags??"[]").includes(reason);}catch{return false;}}).length]));
  return { methodology: "participant-balanced-fractional-bt-v2", fileMatching: "sha256-two-participant-groups-v2", reasonCounts, all: rank(qualified), random: rank(randomVotes), bring: rank(bringVotes), curated: { ...rank(curatedVotes), trackCount: curatedTracks.length }, verified: rank(verifiedVotes),
    categories: { random: { ie: byType(randomVotes, "ie"), oe: byType(randomVotes, "oe") }, bring: { ie: byType(bringVotes, "ie"), oe: byType(bringVotes, "oe") }, all: { ie: byType(qualified, "ie"), oe: byType(qualified, "oe") }, curated: { ie: byType(curatedVotes, "ie"), oe: byType(curatedVotes, "oe") }, verified: { ie: byType(verifiedVotes, "ie"), oe: byType(verifiedVotes, "oe") } } };
  }
  return Response.json({...build(qualified), protocols:{current:build(qualified.filter(v=>v.protocolVersion===LISTENING_PROTOCOL)),legacy:build(qualified.filter(v=>v.protocolVersion!==LISTENING_PROTOCOL))}});
}
