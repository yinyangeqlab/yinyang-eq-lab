import { shareMetadata } from "@/lib/share-metadata";
import { TrailerPlayer } from "../trailer-player";
import "../style.css";

export const metadata = shareMetadata("/android/trailer");

export default function TrailerPage() {
  return <main className="companion-film-page"><TrailerPlayer standaloneFormat="landscape" /></main>;
}
