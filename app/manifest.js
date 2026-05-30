export default function manifest() {
  return {
    name: "Lie Ledger",
    short_name: "Lies",
    description: "Shared four-player lie scorekeeper.",
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
