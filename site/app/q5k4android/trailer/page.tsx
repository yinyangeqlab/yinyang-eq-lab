import { shareMetadata } from "@/lib/share-metadata";
import { TrailerPlayer } from "../trailer-player";
import "../style.css";

export const metadata = shareMetadata("/q5k4android/trailer");

export default function TrailerPage() {
  return <main className="companion-film-page"><TrailerPlayer standalone /></main>;
}
