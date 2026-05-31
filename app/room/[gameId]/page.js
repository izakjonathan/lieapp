
function normalizePlayerName(name){
  const trimmed = (name || "").trim();
  return trimmed.toLowerCase() === "tom" ? "Gaylord McFuck" : trimmed;
}

import Home from "../../page";

export default function RoomPage() {
  return <Home />;
}
