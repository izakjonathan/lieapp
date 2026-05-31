
function normalizePlayerName(name){
  const trimmed = (name || "").trim();
  return trimmed.toLowerCase() === "tom" ? "Gaylord McFuck" : trimmed;
}

export default function manifest() {
  return {
    id: "/",
    name: "Scoreboard",
    short_name: "Scoreboard",
    description: "Shared four-player lie scoreboard.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "fullscreen", "browser"],
    background_color: "#050506",
    theme_color: "#050506",
    orientation: "portrait",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any"
      },
      {
        src: "/maskable-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable"
      },
      {
        src: "/apple-touch-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any"
      }
    ]
  };
}
