"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "scoreboard-active-game";
const LEGACY_STORAGE_KEY = "lie-ledger-active-game";
const CLIENT_KEY = "scoreboard-client-id";
const POLL_INTERVAL = 1600;

const STORE_STATUS = {
  supabase: "Saved · shared",
  "server-tmp": "Saved · temporary",
  "server-memory": "Saved · temporary",
  "local-file": "Saved · local",
  unknown: "Saved"
};

export default function Home() {
  const [gameId, setGameId] = useState("");
  const [game, setGame] = useState(null);
  const [draftNames, setDraftNames] = useState({});
  const [status, setStatus] = useState("Opening…");
  const [storeMode, setStoreMode] = useState("unknown");
  const [busyAction, setBusyAction] = useState("");
  const [bootError, setBootError] = useState("");
  const [resetPanelOpen, setResetPanelOpen] = useState(false);
  const [activityExpanded, setActivityExpanded] = useState(false);
  const saveTimers = useRef({});
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
    persistGameId(id);
    replaceUrlGameId(id);
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
      if (!busyAction && !editingNameRef.current && document.visibilityState !== "hidden") loadGame({ silent: true });
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

  const shareScoreboard = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Scoreboard", text: "Open the shared scoreboard", url });
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

  const startNewGame = () => {
    const confirmed = window.confirm("Start a new scoreboard? This creates a separate share link.");
    if (!confirmed) return;
    const nextId = makeGameId();
    setGame(null);
    setDraftNames({});
    editingNameRef.current = "";
    lastRevisionRef.current = 0;
    setGameId(nextId);
    persistGameId(nextId);
    replaceUrlGameId(nextId);
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
    <main className="app-shell">
      <div className="aurora aurora-one" />
      <div className="aurora aurora-two" />
      <div className="aurora aurora-three" />
      <div className="noise" />

      <section className="topbar glass-panel">
        <div className="brand-lockup">
          <span className="brand-orb" />
          <div>
            <p className="eyebrow">Shared</p>
            <h1>Scoreboard</h1>
          </div>
        </div>
        <div className="sync-pill" data-mode={storeMode}>
          <span className="sync-dot" />
          {status}
        </div>
      </section>

      <section className="scoreboard-card glass-panel" aria-label="Scoreboard summary">
        <MetricCard label="Most lies" value={stats.leaderName} />
        <MetricCard label="Amount of lies" value={String(stats.leaderScore)} />
      </section>

      {bootError ? <div className="error-card glass-panel">{bootError}</div> : null}

      <section className="player-grid" aria-label="Players">
        {(game?.players || skeletonPlayers()).map((player, index) => (
          <article className="player-card glass-panel" key={player.id} style={{ "--delay": `${index * 60}ms` }}>
            <div className="player-card-top">
              <label>
                <span>Player</span>
                <input
                  value={draftNames[player.id] ?? player.name}
                  onFocus={() => beginNameEdit(player.id)}
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
          <div>
            <span>Game log</span>
            <strong>{game?.history?.length || 0} saved events</strong>
          </div>
          <button type="button" onClick={() => setActivityExpanded((value) => !value)}>
            {activityExpanded ? "Less" : "More"}
          </button>
        </div>
        <div className="history-list">
          {visibleHistory.length ? (
            visibleHistory.map((item) => <HistoryItem item={item} key={item.id} />)
          ) : (
            <p className="empty-history">No lies logged yet.</p>
          )}
        </div>
      </section>

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

      <nav className="bottom-controls" aria-label="Scoreboard actions">
        <div className="bottom-controls-inner glass-panel">
          <button type="button" onClick={shareScoreboard}>Share</button>
          <button type="button" onClick={undoLast} disabled={!game?.history?.some((item) => item.kind === "score") || Boolean(busyAction)}>Undo</button>
          <button type="button" onClick={() => setResetPanelOpen(true)} disabled={!game || Boolean(busyAction)}>Reset</button>
          <button type="button" onClick={startNewGame}>New</button>
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
        <p><strong>{item.playerName}</strong> {item.delta > 0 ? "+1 lie" : "−1 lie"}</p>
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
  const total = players.reduce((sum, player) => sum + Number(player.score || 0), 0);
  const leader = players.reduce((current, player) => {
    if (!current || player.score > current.score) return player;
    return current;
  }, null);
  const lastScore = [...(game?.history || [])].reverse().find((item) => item.kind === "score");

  return {
    total,
    leaderName: leader && leader.score > 0 ? leader.name : "—",
    leaderScore: leader && leader.score > 0 ? Number(leader.score || 0) : 0,
    lastChange: lastScore ? `${lastScore.playerName} ${lastScore.delta > 0 ? "+1" : "−1"}` : "—"
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
  const fromLegacyStorage = cleanGameId(window.localStorage.getItem(LEGACY_STORAGE_KEY));
  return fromUrl || fromStorage || fromLegacyStorage || makeGameId();
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

function formatTime(value) {
  try {
    return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  } catch {
    return "now";
  }
}
