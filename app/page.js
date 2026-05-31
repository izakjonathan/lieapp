"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "scoreboard-active-game";
const LEGACY_STORAGE_KEY = "lie-ledger-active-game";
const CLIENT_KEY = "scoreboard-client-id";
const THEME_KEY = "scoreboard-theme-v9";
const POLL_INTERVAL = 800;
const QUICK_DELTAS = [-1, 1];

const STORE_STATUS = {
  supabase: "Shared",
  "server-tmp": "Temp",
  "server-memory": "Temp",
  "local-file": "Saved · local",
  unknown: "Saved"
};

const THEME_PRESETS = [
  { id: "warm", label: "Warm glass", note: "brown · violet" },
  { id: "midnight", label: "Midnight", note: "blue · black" },
  { id: "dust", label: "Dusty", note: "muted · soft" },
  { id: "photo", label: "Photo", note: "uses /public/bg.jpg" }
];

export default function Home() {
  const [gameId, setGameId] = useState("");
  const [game, setGame] = useState(null);
  const [draftNames, setDraftNames] = useState({});
  const [status, setStatus] = useState("Opening…");
  const [storeMode, setStoreMode] = useState("unknown");
  const [busyAction, setBusyAction] = useState("");
  const [bootError, setBootError] = useState("");
  const [resetPanelOpen, setResetPanelOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activityExpanded, setActivityExpanded] = useState(false);
  const [theme, setTheme] = useState("warm");
  const [roomDraft, setRoomDraft] = useState("");
  const [roomError, setRoomError] = useState("");
  const [installHelp, setInstallHelp] = useState("");
  const [lastChangedPlayer, setLastChangedPlayer] = useState("");
  const [lastChange, setLastChange] = useState({ playerId: "", delta: 0, stamp: 0 });
  const saveTimers = useRef({});
  const changePulseTimer = useRef(null);
  const installPromptRef = useRef(null);
  const clientIdRef = useRef("");
  const editingNameRef = useRef("");
  const lastRevisionRef = useRef(0);

  const syncDraftNames = useCallback((nextGame, { preserveActive = true } = {}) => {
    setDraftNames((current) => {
      const nextNames = namesFromGame(nextGame);
      const activePlayerId = editingNameRef.current;
      if (preserveActive && activePlayerId && Object.prototype.hasOwnProperty.call(current, activePlayerId)) {
        nextNames[activePlayerId] = current[activePlayerId];
      }
      return nextNames;
    });
  }, []);

  useEffect(() => {
    clientIdRef.current = getOrCreateClientId();
    const id = getInitialGameId();
    setGameId(id);
    setRoomDraft(id);
    persistGameId(id);
    replaceUrlGameId(id);

    const savedTheme = window.localStorage.getItem(THEME_KEY);
    if (THEME_PRESETS.some((preset) => preset.id === savedTheme)) setTheme(savedTheme);
  }, []);

  useEffect(() => {
    if (gameId) setRoomDraft(gameId);
  }, [gameId]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return undefined;
    const registerWorker = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    };
    if (document.readyState === "complete") registerWorker();
    else window.addEventListener("load", registerWorker, { once: true });
    return (
    <main className="app-shell" data-theme={theme}>
      <div className="aurora aurora-one" />
      <div className="aurora aurora-two" />
      <div className="aurora aurora-three" />
      <div className="noise" />

      <header className="app-header glass-panel">
        <h1>Scoreboard</h1>
      </header>

      <HeroScoreboard
        leaderName={stats.leaderName}
        leaderScore={stats.leaderScore}
        hasLeader={Boolean(stats.leaderId)}
      />

      {bootError ? <div className="error-card glass-panel">{bootError}</div> : null}

      <section className="player-stack" aria-label="Players">
        {(game?.players || skeletonPlayers()).map((player, index) => (
          <PlayerCard
            key={player.id}
            player={player}
            index={index}
            draftName={draftNames[player.id] ?? player.name}
            isLeader={stats.leaderId === player.id && stats.leaderScore > 0}
            isChanging={lastChangedPlayer === player.id}
            changeDirection={lastChangedPlayer === player.id ? lastChange.delta : 0}
            lastChangeStamp={lastChange.stamp}
            disabled={!game || Boolean(busyAction)}
            onBeginNameEdit={beginNameEdit}
            onDraftName={setDraftName}
            onCommitName={commitName}
            onAdjust={adjustScore}
          />
        ))}
      </section>

      {menuOpen ? (
        <section className="sheet-overlay" aria-label="Scoreboard menu">
          <div className="sheet-panel glass-panel">
            <div className="sheet-title">
              <div>
                <span>Menu</span>
                <strong>Theme, room and app setup</strong>
              </div>
              <button type="button" className="round-close" onClick={() => setMenuOpen(false)} aria-label="Close menu">×</button>
            </div>

            <div className="menu-block">
              <span className="menu-label">Theme</span>
              <div className="theme-grid">
                {THEME_PRESETS.map((preset) => (
                  <button
                    type="button"
                    className={theme === preset.id ? "selected" : ""}
                    onClick={() => chooseTheme(preset.id)}
                    key={preset.id}
                  >
                    <strong>{preset.label}</strong>
                    <small>{preset.note}</small>
                  </button>
                ))}
              </div>
              <p className="menu-help">For your own photo background, add an image at <code>public/bg.jpg</code> and choose Photo.</p>
            </div>

            <div className="menu-block">
              <span className="menu-label">Room</span>
              <div className="room-row">
                <input
                  value={roomDraft}
                  onChange={(event) => setRoomDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") useRoom();
                  }}
                  placeholder="friday-night"
                  aria-label="Room name"
                />
                <button type="button" onClick={useRoom}>Use</button>
                <button type="button" onClick={copyRoomLink}>Copy</button>
              </div>
              {roomError ? <p className="menu-error">{roomError}</p> : null}
            </div>

            <div className="menu-actions">
              <button type="button" onClick={installApp}>Install app</button>
              <button type="button" onClick={startNewGame}>New scoreboard</button>
            </div>
            {installHelp ? <p className="menu-help strong">{installHelp}</p> : null}
          </div>
        </section>
      ) : null}

      {resetPanelOpen ? (
        <section className="sheet-overlay" aria-label="Reset options">
          <div className="sheet-panel reset-panel glass-panel">
            <div className="sheet-title">
              <div>
                <span>Reset</span>
                <strong>Choose what to clear</strong>
              </div>
              <button type="button" className="round-close" onClick={() => setResetPanelOpen(false)} aria-label="Close reset options">×</button>
            </div>
            <div className="reset-actions">
              <button type="button" onClick={resetScores} disabled={!game || Boolean(busyAction)}>Scores only</button>
              <button type="button" onClick={resetBoard} disabled={!game || Boolean(busyAction)}>Names + scores</button>
              <button type="button" onClick={clearHistory} disabled={!game?.history?.length || Boolean(busyAction)}>History only</button>
            </div>
          </div>
        </section>
      ) : null}

      <nav className="bottom-controls" aria-label="Scoreboard actions">
        <div className="bottom-controls-inner glass-panel">
          <button type="button" onClick={shareScoreboard}>Share</button>
          <button type="button" onClick={undoLast} disabled={!game?.history?.some((item) => item.kind === "score") || Boolean(busyAction)}>Undo</button>
          <button type="button" onClick={() => setResetPanelOpen(true)} disabled={!game || Boolean(busyAction)}>Reset</button>
          <button type="button" onClick={() => setMenuOpen(true)}>Menu</button>
        </div>
      </nav>
    </main>
  );
}

function HeroScoreboard({ leaderName, leaderScore, hasLeader }) {
  return (
    <section className={`hero-scoreboard glass-panel${hasLeader ? " has-leader" : ""}`} aria-label="Scoreboard leader">
      <span className="hero-kicker">Scoreboard</span>
      <strong className="hero-leader">{hasLeader ? leaderName : "No leader"}</strong>
      <div className="hero-score-row" aria-label={`${leaderScore} ${leaderScore === 1 ? "lie" : "lies"}`}>
        <span className="hero-trophy" aria-hidden="true">🏆</span>
        <strong>{leaderScore}</strong>
      </div>
    </section>
  );
}

function PlayerCard({
  player,
  index,
  draftName,
  isLeader,
  isChanging,
  changeDirection,
  lastChangeStamp,
  disabled,
  onBeginNameEdit,
  onDraftName,
  onCommitName,
  onAdjust
}) {
  return (
    <article
      className={`player-card glass-panel${isLeader ? " leader" : ""}${isChanging ? " is-bumping" : ""}${changeDirection < 0 ? " score-down" : changeDirection > 0 ? " score-up" : ""}`}
      style={{ "--delay": `${index * 45}ms` }}
    >
      <div className="player-name-row">
        <input
          value={draftName}
          onFocus={() => onBeginNameEdit(player.id)}
          onChange={(event) => onDraftName(player.id, event.target.value)}
          onBlur={() => onCommitName(player.id)}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
          maxLength={28}
          disabled={disabled && !draftName}
          aria-label={`Name for ${player.name}`}
        />
        {isLeader ? <span className="leader-badge" aria-label="Current biggest liar">🏆</span> : null}
      </div>

      <strong className="player-score" key={`${player.id}-${player.score}-${lastChangeStamp}`} aria-label={`${player.name} has ${player.score} ${player.score === 1 ? "lie" : "lies"}`}>
        {player.score}
      </strong>

      <div className="score-controls" aria-label={`Score controls for ${player.name}`}>
        <HoldButton
          className="control-button minus"
          onTrigger={() => onAdjust(player.id, -1)}
          disabled={disabled || player.score <= 0}
          ariaLabel={`Deduct one lie from ${player.name}`}
        >
          −1
        </HoldButton>
        <HoldButton
          className="control-button plus"
          onTrigger={() => onAdjust(player.id, 1)}
          disabled={disabled}
          ariaLabel={`Add one lie to ${player.name}`}
        >
          +1
        </HoldButton>
      </div>
    </article>
  );
}

function getStoreStatus(store) {
  return STORE_STATUS[store] || STORE_STATUS.unknown;
}

function HistoryItem({ item }) {
  if (item.kind === "score") {
    return (
      <div className="history-item">
        <span>{item.delta > 0 ? "+" : "−"}</span>
        <p><strong>{item.playerName}</strong> {formatDeltaText(item.delta)}</p>
        <time>{formatTime(item.at)}</time>
      </div>
    );
  }

  if (item.kind === "rename") {
    return (
      <div className="history-item muted">
        <span>↻</span>
        <p><strong>{item.previousName}</strong> changed to <strong>{item.nextName}</strong></p>
        <time>{formatTime(item.at)}</time>
      </div>
    );
  }

  if (item.kind === "resetScores") {
    return (
      <div className="history-item muted">
        <span>0</span>
        <p>Scores reset</p>
        <time>{formatTime(item.at)}</time>
      </div>
    );
  }

  if (item.kind === "resetBoard") {
    return (
      <div className="history-item muted">
        <span>↺</span>
        <p>Names and scores reset</p>
        <time>{formatTime(item.at)}</time>
      </div>
    );
  }

  if (item.kind === "undo") {
    return (
      <div className="history-item muted">
        <span>↩</span>
        <p>Last score change undone</p>
        <time>{formatTime(item.at)}</time>
      </div>
    );
  }

  return null;
}

function buildStats(game) {
  const players = game?.players || [];
  const leader = players.reduce((current, player) => {
    if (!current || Number(player.score || 0) > Number(current.score || 0)) return player;
    return current;
  }, null);

  return {
    leaderId: leader && leader.score > 0 ? leader.id : "",
    leaderName: leader && leader.score > 0 ? leader.name : "—",
    leaderScore: leader && leader.score > 0 ? Number(leader.score || 0) : 0
  };
}

function optimisticAdjust(game, playerId, delta) {
  if (!game) return game;
  return {
    ...game,
    players: game.players.map((player) => {
      if (player.id !== playerId) return player;
      return { ...player, score: Math.max(0, player.score + delta) };
    })
  };
}

function namesFromGame(game) {
  return Object.fromEntries((game?.players || []).map((player) => [player.id, player.name]));
}

function skeletonPlayers() {
  return [1, 2, 3, 4].map((number) => ({ id: `p${number}`, name: `Player ${number}`, score: 0 }));
}

function getInitialGameId() {
  const search = new URLSearchParams(window.location.search);
  const fromRoomPath = roomIdFromPath(window.location.pathname);
  const fromUrl = cleanGameId(search.get("game"));
  const fromStorage = cleanGameId(window.localStorage.getItem(STORAGE_KEY));
  const fromLegacyStorage = cleanGameId(window.localStorage.getItem(LEGACY_STORAGE_KEY));
  return fromRoomPath || fromUrl || fromStorage || fromLegacyStorage || makeGameId();
}

function persistGameId(gameId) {
  window.localStorage.setItem(STORAGE_KEY, gameId);
}

function replaceUrlGameId(gameId) {
  const url = new URL(window.location.href);
  url.pathname = `/room/${encodeURIComponent(gameId)}`;
  url.search = "";
  window.history.replaceState(null, "", url.toString());
}

function scoreboardUrlFor(gameId) {
  const url = new URL(window.location.href);
  url.pathname = `/room/${encodeURIComponent(gameId)}`;
  url.search = "";
  return url.toString();
}

function roomIdFromPath(pathname) {
  const match = String(pathname || "").match(/^\/room\/([^/?#]+)/);
  return match ? cleanGameId(decodeURIComponent(match[1])) : "";
}

function cleanRoomLabel(gameId) {
  const clean = cleanGameId(gameId) || "Scoreboard";
  return clean
    .replace(/^score-/, "")
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Scoreboard";
}

function cleanGameId(value) {
  const safe = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "")
    .replace(/-+/g, "-")
    .slice(0, 64);
  return safe.length >= 3 ? safe : "";
}

function makeGameId() {
  const left = Math.random().toString(36).slice(2, 6);
  const right = Date.now().toString(36).slice(-5);
  return `score-${left}-${right}`;
}

function getOrCreateClientId() {
  const existing = window.localStorage.getItem(CLIENT_KEY);
  if (existing) return existing;
  const next = `client-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
  window.localStorage.setItem(CLIENT_KEY, next);
  return next;
}

function pulseHaptic() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(12);
}

function scoreHaptic(delta) {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  if (Math.abs(delta) >= 5) navigator.vibrate([10, 20, 10]);
  else navigator.vibrate(delta > 0 ? 12 : 8);
}

function formatDeltaText(delta) {
  const value = Number(delta || 0);
  const amount = Math.abs(value);
  const word = amount === 1 ? "lie" : "lies";
  return value > 0 ? `+${amount} ${word}` : `−${amount} ${word}`;
}

function HoldButton({ children, className, onTrigger, disabled, ariaLabel }) {
  const timerRef = useRef(null);
  const intervalRef = useRef(null);

  const clearTimers = useCallback(() => {
    window.clearTimeout(timerRef.current);
    window.clearInterval(intervalRef.current);
  }, []);

  const startHold = useCallback(() => {
    if (disabled) return;
    clearTimers();
    timerRef.current = window.setTimeout(() => {
      onTrigger();
      intervalRef.current = window.setInterval(onTrigger, 180);
    }, 430);
  }, [clearTimers, disabled, onTrigger]);

  useEffect(() => clearTimers, [clearTimers]);

  return (
    <button
      className={`${className || ""} pressable-button`}
      type="button"
      onClick={onTrigger}
      onPointerDown={startHold}
      onPointerUp={clearTimers}
      onPointerCancel={clearTimers}
      onPointerLeave={clearTimers}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}

function formatTime(value) {
  try {
    return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  } catch {
    return "now";
  }
}
