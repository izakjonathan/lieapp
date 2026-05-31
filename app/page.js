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
    return () => window.removeEventListener("load", registerWorker);
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      installPromptRef.current = event;
      setInstallHelp("");
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const applyLoadedGame = useCallback(
    (payload, { silent = false } = {}) => {
      const incomingGame = payload.game;
      const incomingRevision = Number(incomingGame?.revision || 0);
      const currentRevision = Number(lastRevisionRef.current || 0);
      if (silent && incomingRevision && incomingRevision === currentRevision) {
        setStoreMode(payload.store || "unknown");
        setStatus(getStoreStatus(payload.store));
        return;
      }
      lastRevisionRef.current = incomingRevision;
      setGame(incomingGame);
      setStoreMode(payload.store || "unknown");
      syncDraftNames(incomingGame);
      setStatus(getStoreStatus(payload.store));
      setBootError("");
    },
    [syncDraftNames]
  );

  const loadGame = useCallback(
    async ({ silent = false } = {}) => {
      if (!gameId) return;
      try {
        if (!silent) setStatus("Syncing…");
        const response = await fetch(`/api/games/${encodeURIComponent(gameId)}`, {
          cache: "no-store"
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || "Could not load scoreboard.");
        applyLoadedGame(payload, { silent });
      } catch (error) {
        setBootError(error?.message || "Could not load the scoreboard.");
        setStatus("Offline");
      }
    },
    [applyLoadedGame, gameId]
  );

  useEffect(() => {
    loadGame();
  }, [loadGame]);

  useEffect(() => {
    if (!gameId) return undefined;
    const timer = window.setInterval(() => {
      const panelOpen = resetPanelOpen || menuOpen;
      if (!busyAction && !editingNameRef.current && !panelOpen && document.visibilityState !== "hidden") {
        loadGame({ silent: true });
      }
    }, POLL_INTERVAL);
    return () => window.clearInterval(timer);
  }, [busyAction, gameId, loadGame, menuOpen, resetPanelOpen]);

  useEffect(() => {
    // iOS Safari shrinks visualViewport when the keyboard opens.
    // If we bind the app height to that smaller value, the player grid collapses
    // into thin rows while editing names. Keep the largest measured viewport
    // height for layout, and expose keyboard state for small CSS adjustments.
    let stableHeight = Math.max(window.innerHeight || 0, window.visualViewport?.height || 0);

    const setViewportHeight = () => {
      const visualHeight = window.visualViewport?.height || window.innerHeight || stableHeight;
      const innerHeight = window.innerHeight || visualHeight;
      stableHeight = Math.max(stableHeight, visualHeight, innerHeight);
      const keyboardOpen = visualHeight < stableHeight - 120;

      document.documentElement.style.setProperty("--app-height", `${stableHeight}px`);
      document.documentElement.classList.toggle("keyboard-open", keyboardOpen);
    };

    setViewportHeight();
    window.addEventListener("resize", setViewportHeight, { passive: true });
    window.visualViewport?.addEventListener("resize", setViewportHeight, { passive: true });
    return () => {
      window.removeEventListener("resize", setViewportHeight);
      window.visualViewport?.removeEventListener("resize", setViewportHeight);
      document.documentElement.classList.remove("keyboard-open");
    };
  }, []);

  const stats = useMemo(() => buildStats(game), [game]);
  const roomLabel = useMemo(() => cleanRoomLabel(gameId), [gameId]);
  const visibleHistory = useMemo(() => {
    const history = game?.history || [];
    return history.slice(activityExpanded ? -30 : -8).reverse();
  }, [activityExpanded, game?.history]);

  const sendAction = useCallback(
    async (action, label = "Saving…") => {
      if (!gameId) return;
      setBusyAction(action.type || "action");
      setStatus(label);
      pulseHaptic();
      try {
        const response = await fetch(`/api/games/${encodeURIComponent(gameId)}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ ...action, clientId: clientIdRef.current })
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || "Could not save.");
        lastRevisionRef.current = Number(payload.game?.revision || 0);
        setGame(payload.game);
        setStoreMode(payload.store || "unknown");
        syncDraftNames(payload.game);
        setStatus(getStoreStatus(payload.store));
        setBootError("");
      } catch (error) {
        setStatus("Save failed");
        setBootError(error?.message || "Could not save the latest change.");
        await loadGame({ silent: true });
      } finally {
        setBusyAction("");
      }
    },
    [gameId, loadGame, syncDraftNames]
  );

  const adjustScore = useCallback(
    (playerId, delta) => {
      setGame((current) => optimisticAdjust(current, playerId, delta));
      setLastChangedPlayer(playerId);
      setLastChange({ playerId, delta, stamp: Date.now() });
      window.clearTimeout(changePulseTimer.current);
      changePulseTimer.current = window.setTimeout(() => {
        setLastChangedPlayer("");
        setLastChange({ playerId: "", delta: 0, stamp: 0 });
      }, 420);
      scoreHaptic(delta);
      sendAction({ type: "adjustScore", playerId, delta }, delta > 0 ? "Adding…" : "Deducting…");
    },
    [sendAction]
  );

  const beginNameEdit = useCallback((playerId) => {
    editingNameRef.current = playerId;
  }, []);

  const setDraftName = useCallback(
    (playerId, value) => {
      setDraftNames((current) => ({ ...current, [playerId]: value }));
      window.clearTimeout(saveTimers.current[playerId]);
      saveTimers.current[playerId] = window.setTimeout(() => {
        const clean = value.trim();
        if (clean) {
          sendAction({ type: "renamePlayer", playerId, name: clean }, "Saving name…");
        }
      }, 700);
    },
    [sendAction]
  );

  const commitName = useCallback(
    (playerId) => {
      window.clearTimeout(saveTimers.current[playerId]);
      if (editingNameRef.current === playerId) editingNameRef.current = "";
      const clean = String(draftNames[playerId] || "").trim();
      if (clean) sendAction({ type: "renamePlayer", playerId, name: clean }, "Saving name…");
      else syncDraftNames(game, { preserveActive: false });
    },
    [draftNames, game, sendAction, syncDraftNames]
  );

  const chooseTheme = (nextTheme) => {
    setTheme(nextTheme);
    window.localStorage.setItem(THEME_KEY, nextTheme);
    setStatus("Theme saved");
    pulseHaptic();
  };

  const shareScoreboard = async () => {
    const url = scoreboardUrlFor(gameId);
    try {
      if (navigator.share) {
        await navigator.share({ title: `Scoreboard · ${roomLabel}`, text: "Open the shared scoreboard", url });
        setStatus("Shared");
      } else {
        await navigator.clipboard.writeText(url);
        setStatus("Link copied");
      }
      pulseHaptic();
    } catch (error) {
      if (error?.name !== "AbortError") setStatus("Share failed");
    }
  };

  const copyRoomLink = async () => {
    try {
      await navigator.clipboard.writeText(scoreboardUrlFor(gameId));
      setStatus("Link copied");
      setRoomError("");
      pulseHaptic();
    } catch {
      setRoomError("Could not copy the link.");
    }
  };

  const useRoom = () => {
    const nextId = cleanGameId(roomDraft);
    if (!nextId) {
      setRoomError("Use at least 3 letters, numbers or dashes.");
      return;
    }
    if (nextId === gameId) {
      setRoomError("");
      setStatus("Already in this room");
      return;
    }
    setRoomError("");
    setGame(null);
    setDraftNames({});
    editingNameRef.current = "";
    lastRevisionRef.current = 0;
    setGameId(nextId);
    persistGameId(nextId);
    replaceUrlGameId(nextId);
    setStatus("Opening room…");
  };

  const installApp = async () => {
    if (installPromptRef.current) {
      const promptEvent = installPromptRef.current;
      installPromptRef.current = null;
      promptEvent.prompt();
      await promptEvent.userChoice.catch(() => null);
      setInstallHelp("Install prompt closed.");
      return;
    }
    setInstallHelp("On iPhone: tap Share in Safari, then Add to Home Screen.");
  };

  const startNewGame = () => {
    const confirmed = window.confirm("Start a new scoreboard? This creates a separate share link.");
    if (!confirmed) return;
    const nextId = makeGameId();
    setGame(null);
    setDraftNames({});
    editingNameRef.current = "";
    lastRevisionRef.current = 0;
    setGameId(nextId);
    setRoomDraft(nextId);
    persistGameId(nextId);
    replaceUrlGameId(nextId);
    setMenuOpen(false);
    setResetPanelOpen(false);
    setStatus("New scoreboard");
  };

  const resetScores = () => {
    setResetPanelOpen(false);
    sendAction({ type: "resetScores" }, "Resetting scores…");
  };

  const resetBoard = () => {
    const confirmed = window.confirm("Reset names and scores? This keeps the same share link.");
    if (!confirmed) return;
    setResetPanelOpen(false);
    sendAction({ type: "resetBoard" }, "Resetting board…");
  };

  const clearHistory = () => {
    setResetPanelOpen(false);
    sendAction({ type: "clearHistory" }, "Clearing history…");
  };

  const undoLast = () => {
    sendAction({ type: "undoLast" }, "Undoing…");
  };

  return (
    <main className="app-shell v23-shell" data-theme={theme}>
      <div className="aurora aurora-one" />
      <div className="aurora aurora-two" />
      <div className="aurora aurora-three" />
      <div className="noise" />

      <header className="v23-header glass-panel" aria-label="Scoreboard header">
        <h1>Scoreboard</h1>
      </header>

      <section className={`v23-hero glass-panel${stats.leaderId ? " has-leader" : ""}`} aria-label="Scoreboard leader">
        <div className="v23-hero-main">
          <span className="v23-kicker">Scoreboard</span>
          <strong className="v23-leader-name">{stats.leaderName}</strong>
          
        </div>
        <div className="v23-hero-score" aria-label={`${stats.leaderScore} ${stats.leaderScore === 1 ? "lie" : "lies"}`}>
          
          <strong>{stats.leaderScore}</strong>
        </div>
      </section>

      {bootError ? <div className="error-card glass-panel">{bootError}</div> : null}

      <section className="v23-player-list" aria-label="Players">
        {(game?.players || skeletonPlayers()).map((player, index) => {
          const isLeader = stats.leaderId === player.id && stats.leaderScore > 0;
          const isChanging = lastChangedPlayer === player.id;
          const changeDirection = isChanging && lastChange.delta < 0 ? " score-down" : isChanging && lastChange.delta > 0 ? " score-up" : "";
          return (
            <article
              className={`v23-player-card glass-panel${isLeader ? " leader" : ""}${isChanging ? " is-bumping" : ""}${changeDirection}`}
              key={player.id}
              style={{ "--delay": `${index * 48}ms` }}
            >
              <div className="v23-player-name-wrap">
                <input
                  className="v23-player-name"
                  value={draftNames[player.id] ?? player.name}
                  onFocus={(event) => {
                    beginNameEdit(player.id);
                    window.setTimeout(() => {
                      event.currentTarget.scrollIntoView({ block: "center", behavior: "smooth" });
                    }, 80);
                  }}
                  onChange={(event) => setDraftName(player.id, event.target.value)}
                  onBlur={() => commitName(player.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur();
                  }}
                  maxLength={28}
                  disabled={!game}
                  aria-label={`Name for ${player.name}`}
                />
                {isLeader ? <span className="v23-mini-trophy" aria-label="Current leader">🏆</span> : null}
              </div>

              <strong className="v23-player-score" key={`${player.id}-${player.score}-${lastChange.stamp}`}>{player.score}</strong>

              <div className="v23-score-controls" aria-label={`Score controls for ${player.name}`}>
                <HoldButton
                  className="v23-score-button minus"
                  onTrigger={() => adjustScore(player.id, -1)}
                  disabled={!game || Boolean(busyAction) || player.score <= 0}
                  ariaLabel={`Deduct one lie from ${player.name}`}
                >
                  −1
                </HoldButton>
                <HoldButton
                  className="v23-score-button plus"
                  onTrigger={() => adjustScore(player.id, 1)}
                  disabled={!game || Boolean(busyAction)}
                  ariaLabel={`Add one lie to ${player.name}`}
                >
                  +1
                </HoldButton>
              </div>
            </article>
          );
        })}
      </section>

      {menuOpen ? (
        <section className="menu-sheet" aria-label="Scoreboard menu">
          <div className="menu-sheet-inner glass-panel">
            <div className="sheet-title">
              <div>
                <span>Menu</span>
                <strong>Theme, room and app setup</strong>
              </div>
              <button type="button" className="round-close" onClick={() => setMenuOpen(false)} aria-label="Close menu">×</button>
            </div>

            <div className="menu-block">
              <span className="menu-label">Theme / background</span>
              <div className="theme-grid">
                {THEME_PRESETS.map((preset) => (
                  <button type="button" className={theme === preset.id ? "selected" : ""} onClick={() => chooseTheme(preset.id)} key={preset.id}>
                    <strong>{preset.label}</strong>
                    <small>{preset.note}</small>
                  </button>
                ))}
              </div>
              <p className="menu-help">For your own photo background, add an image at <code>public/bg.jpg</code> and choose Photo.</p>
            </div>

            <div className="menu-block">
              <span className="menu-label">Room / shared scoreboard</span>
              <div className="room-row">
                <input
                  value={roomDraft}
                  onChange={(event) => setRoomDraft(event.target.value)}
                  onKeyDown={(event) => { if (event.key === "Enter") useRoom(); }}
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
        <section className="reset-sheet" aria-label="Reset options">
          <div className="reset-sheet-inner glass-panel">
            <div>
              <span>Reset options</span>
              <strong>What should be cleared?</strong>
            </div>
            <button type="button" onClick={resetScores} disabled={!game || Boolean(busyAction)}>Scores only</button>
            <button type="button" onClick={resetBoard} disabled={!game || Boolean(busyAction)}>Names + scores</button>
            <button type="button" onClick={clearHistory} disabled={!game?.history?.length || Boolean(busyAction)}>History only</button>
            <button type="button" className="ghost" onClick={() => setResetPanelOpen(false)}>Cancel</button>
          </div>
        </section>
      ) : null}

      <nav className="bottom-controls v23-bottom-controls" aria-label="Scoreboard actions">
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

function MetricCard({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
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
