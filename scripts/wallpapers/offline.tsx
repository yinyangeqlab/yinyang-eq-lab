import { createRoot } from "react-dom/client";
import WelcomeLandscape from "../../components/welcome-landscape";

declare const OFFLINE_ARTWORK: {
  texture: string;
  still: string;
  flights: { headphones: string; iems: string };
};
declare const OFFLINE_FLIGHTS: boolean;

createRoot(document.getElementById("wallpaper")!).render(
  <WelcomeLandscape running showFlights={OFFLINE_FLIGHTS} artwork={OFFLINE_ARTWORK}/>,
);
