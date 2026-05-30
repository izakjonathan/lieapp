export default function manifest() {
  return {
    name: "Scoreboard",
    short_name: "Scoreboard",
    description: "Shared four-player lie scoreboard.",
    start_url: "/",
    display: "standalone",
    background_color: "#050506",
    theme_color: "#050506",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml"
      }
    ]
  };
}
