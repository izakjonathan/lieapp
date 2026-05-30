"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "lie-ledger-active-game";
const CLIENT_KEY = "lie-ledger-client-id";
const POLL_INTERVAL = 2200;

const STORE_STATUS = {
  supabase: "Saved · shared",
  "server-tmp": "Saved · temporary",
  "server-memory": "Saved · temporary",
  "local-file": "Saved · local server",
  unknown: "Saved"
};

export default function Home() {
  const [gameId, setGameId] = useState("");
  const [game, setGame] = useState(null);
  const [draftNames, setDraftNames] = useState({});
  const [status, setStatus] = useState("Opening ledger…");
  const [storeMode, setStoreMode] = useState("unknown");
  const [busyAction, setBusyAction] = useState("");
  const [bootError, setBootError] = useState("");
  const saveTimers = useRef({});
  const clientIdRef = useRef("");

  useEffect(() => {
    clientIdRef.current = getOrCreateClientId();
    const id = getInitialGameId();
    setGameId(id);
    persistGameId(id);
    replaceUrlGameId(id);
  }, []);

  const loadGame = useCallback(
    async ({ silent = false } = {}) => {
      if (!gameId) return;
      try {
        if (!silent) setStatus("Syncing…");
        const response = await fetch(`/api/games/${encodeURIComponent(gameId)}`, {
          cache: "no-store"
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || "Could not load game.");
        setGame(payload.game);
        setStoreMode(payload.store || "unknown");
        setDraftNames(namesFromGame(payload.game));
        setStatus(getStoreStatus(payload.store));
        setBootError("");
      } catch (error) {
        setBootError(error?.message || "Could not load the game.");
        setStatus("Offline");
      }
    },
    [gameId]
  );

  useEffect(() => {
    loadGame();
  }, [loadGame]);

  useEffect(() => {
    if (!gameId) return undefined;
    const timer = window.setInterval(() => {
      if (!busyAction && document.visibilityState !== "hidden") loadGame({ silent: true });
    }, POLL_INTERVAL);
    return () => window.clearInterval(timer);
  }, [busyAction, gameId, loadGame]);

  useEffect(() => {
    const setViewportHeight = () => {
      const height = window.visualViewport?.height || window.innerHeight;
      document.documentElement.style.setProperty("--app-height", `${height}px`);
    };
    setViewportHeight();
    window.addEventListener("resize", setViewportHeight, { passive: true });
    window.visualViewport?.addEventListener("resize", setViewportHeight, { passive: true });
    return () => {
      window.removeEventListener("resize", setViewportHeight);
      window.visualViewport?.removeEventListener("resize", setViewportHeight);
    };
  }, []);

  const stats = useMemo(() => buildStats(game), [game]);

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
        setGame(payload.game);
        setStoreMode(payload.store || "unknown");
        setDraftNames(namesFromGame(payload.game));
        setStatus(getStoreStatus(payload.store));
      } catch (error) {
        setStatus("Save failed");
        setBootError(error?.message || "Could not save the latest change.");
        await loadGame({ silent: true });
      } finally {
        setBusyAction("");
      }
    },
    [gameId, loadGame]
  );

  const adjustScore = useCallback(
    (playerId, delta) => {
      setGame((current) => optimisticAdjust(current, playerId, delta));
      sendAction({ type: "adjustScore", playerId, delta }, delta > 0 ? "Adding lie…" : "Deducting lie…");
    },
    [sendAction]
  );

  const setDraftName = useCallback((playerId, value) => {
    setDraftNames((current) => ({ ...current, [playerId]: value }));
    window.clearTimeout(saveTimers.current[playerId]);
    saveTimers.current[playerId] = window.setTimeout(() => {
      const clean = value.trim();
      if (clean) {
        sendAction({ type: "renamePlayer", playerId, name: clean }, "Saving name…");
      }
    }, 650);
  }, [sendAction]);

  const commitName = useCallback(
    (playerId) => {
      window.clearTimeout(saveTimers.current[playerId]);
      const clean = String(draftNames[playerId] || "").trim();
      if (clean) sendAction({ type: "renamePlayer", playerId, name: clean }, "Saving name…");
    },
    [draftNames, sendAction]
  );

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setStatus("Link copied");
      pulseHaptic();
    } catch {
      setStatus("Copy failed");
    }
  };

  const startNewGame = () => {
    const nextId = makeGameId();
    setGame(null);
    setGameId(nextId);
    persistGameId(nextId);
    replaceUrlGameId(nextId);
    setStatus("New ledger created");
  };

  const resetScores = () => {
    const confirmed = window.confirm("Reset all scores to zero? Player names stay the same.");
    if (confirmed) sendAction({ type: "resetScores" }, "Resetting scores…");
  };

  const undoLast = () => {
    sendAction({ type: "undoLast" }, "Undoing last lie…");
  };

  return (
    <main className="app-shell">
      <div className="aurora aurora-one" />
      <div className="aurora aurora-two" />
      <div className="noise" />

      <section className="topbar glass-panel">
        <div>
          <p className="eyebrow">Shared scorekeeper</p>
          <h1>Lie Ledger</h1>
        </div>
        <div className="sync-pill" data-mode={storeMode}>
          <span className="sync-dot" />
          {status}
        </div>
      </section>

      <section className="hero-card glass-panel">
        <div className="hero-copy">
          <span className="mini-label">Room</span>
          <strong>{gameId || "creating…"}</strong>
          <p>Track how many lies have been told. Share this room link to keep the same score from multiple devices.</p>
        </div>
        <div className="hero-stats">
          <div>
            <span>Total lies</span>
            <strong>{stats.total}</strong>
          </div>
          <div>
            <span>Most lies</span>
            <strong>{stats.leaderName}</strong>
          </div>
        </div>
      </section>

      {bootError ? <div className="error-card glass-panel">{bootError}</div> : null}

      <section className="player-grid" aria-label="Players">
        {(game?.players || skeletonPlayers()).map((player, index) => (
          <article className="player-card glass-panel" key={player.id} style={{ "--delay": `${index * 60}ms` }}>
            <div className="player-card-top">
              <label>
                <span>Player name</span>
                <input
                  value={draftNames[player.id] ?? player.name}
                  onChange={(event) => setDraftName(player.id, event.target.value)}
                  onBlur={() => commitName(player.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur();
                  }}
                  maxLength={28}
                  disabled={!game}
                  aria-label={`Name for ${player.name}`}
                />
              </label>
              <span className="player-index">0{index + 1}</span>
            </div>

            <div className="score-readout">
              <span>{player.score}</span>
              <small>{player.score === 1 ? "lie" : "lies"}</small>
            </div>

            <div className="score-controls" aria-label={`Score controls for ${player.name}`}>
              <button
                className="control-button minus"
                type="button"
                onClick={() => adjustScore(player.id, -1)}
                disabled={!game || player.score <= 0 || Boolean(busyAction)}
                aria-label={`Deduct one lie from ${player.name}`}
              >
                −
              </button>
              <button
                className="control-button plus"
                type="button"
                onClick={() => adjustScore(player.id, 1)}
                disabled={!game || Boolean(busyAction)}
                aria-label={`Add one lie to ${player.name}`}
              >
                +
              </button>
            </div>
          </article>
        ))}
      </section>

      <section className="activity glass-panel">
        <div className="section-heading">
          <span>Recent</span>
          <strong>{game?.history?.length || 0} events</strong>
        </div>
        <div className="history-list">
          {game?.history?.length ? (
            game.history.slice(-7).reverse().map((item) => <HistoryItem item={item} key={item.id} />)
          ) : (
            <p className="empty-history">No lies logged yet. Suspiciously clean.</p>
          )}
        </div>
      </section>

      <nav className="bottom-controls" aria-label="Game actions">
        <div className="bottom-controls-inner glass-panel">
          <button type="button" onClick={copyShareLink}>Share</button>
          <button type="button" onClick={undoLast} disabled={!game?.history?.some((item) => item.kind === "score") || Boolean(busyAction)}>Undo</button>
          <button type="button" onClick={resetScores} disabled={!game || Boolean(busyAction)}>Reset</button>
          <button type="button" onClick={startNewGame}>New</button>
        </div>
      </nav>
    </main>
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
        <p><strong>{item.playerName}</strong> {item.delta > 0 ? "told a lie" : "had a lie deducted"}</p>
        <time>{formatTime(item.at)}</time>
      </div>
    );
  }

  if (item.kind === "rename") {
    return (
      <div className="history-item muted">
        <span>↻</span>
        <p><strong>{item.previousName}</strong> became <strong>{item.nextName}</strong></p>
        <time>{formatTime(item.at)}</time>
      </div>
    );
  }

  if (item.kind === "reset") {
    return (
      <div className="history-item muted">
        <span>0</span>
        <p>Scores reset to zero</p>
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
  const total = players.reduce((sum, player) => sum + Number(player.score || 0), 0);
  const leader = players.reduce((current, player) => {
    if (!current || player.score > current.score) return player;
    return current;
  }, null);

  return {
    total,
    leaderName: leader && leader.score > 0 ? leader.name : "—"
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
  const fromUrl = cleanGameId(search.get("game"));
  const fromStorage = cleanGameId(window.localStorage.getItem(STORAGE_KEY));
  return fromUrl || fromStorage || makeGameId();
}

function persistGameId(gameId) {
  window.localStorage.setItem(STORAGE_KEY, gameId);
}

function replaceUrlGameId(gameId) {
  const url = new URL(window.location.href);
  url.searchParams.set("game", gameId);
  window.history.replaceState(null, "", url.toString());
}

function cleanGameId(value) {
  const safe = String(value || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 64);
  return safe.length >= 3 ? safe : "";
}

function makeGameId() {
  const left = Math.random().toString(36).slice(2, 6);
  const right = Date.now().toString(36).slice(-5);
  return `lies-${left}-${right}`;
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

function formatTime(value) {
  try {
    return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  } catch {
    return "now";
  }
}
