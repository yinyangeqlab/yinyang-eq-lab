const title = "YinYang EQ Companion for Qudelix 5K and 5K Plus | Android trailer";
const ogTitle = "YinYang EQ Companion · Android trailer";
const description = "See how to build an EQ offline from your measurements, import and edit presets, and save Main EQ with Channel Match on Android.";

export const companionTrailers = {
  landscape: {
    path: "/q5k4android/trailer", slug: "companion-btfo-landscape", title, ogTitle, description,
    poster: "/android/companion-btfo-landscape.webp",
    video: { path: "/android/companion-btfo-landscape.mp4", width: 1920, height: 1080 },
    image: {
      path: "/share/companion-btfo-landscape.jpg", width: 1920, height: 1080,
      alt: "YinYang EQ Companion for Android beside a Qudelix 5K over red and blue waves",
    },
  },
  portrait: {
    path: "/q5k4android/trailer/portrait", slug: "companion-btfo", title, ogTitle, description,
    poster: "/android/companion-btfo-portrait.webp",
    video: { path: "/android/companion-btfo.mp4?v=yyeq5k", width: 720, height: 1280 },
    image: {
      path: "/share/companion-btfo-portrait.jpg", width: 720, height: 1280,
      alt: "The Qudelix 5K above a red and blue river beneath a yin-yang moon",
    },
  },
};
