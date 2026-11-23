import { shareMetadata } from "@/lib/share-metadata";
import { TrailerPlayer } from "../../trailer-player";
import "../../style.css";

export const metadata = shareMetadata("/android/trailer/portrait");

export default function PortraitTrailerPage() {
  return <main className="companion-film-page"><TrailerPlayer standaloneFormat="portrait" /></main>;
}
