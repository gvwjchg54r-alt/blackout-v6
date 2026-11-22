
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Player = {
  player_slot: number;
  player_name: string;
  is_taken: boolean;
};

type JoinedPlayer = {
  game_id: string;
  player_name: string;
  player_slot: number;
};

export default function Home() {
  const [mode, setMode] = useState<"home" | "create" | "join" | "host" | "player">("home");
  const [names, setNames] = useState(["", "", ""]);
  const [roomCode, setRoomCode] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [connectedPlayers, setConnectedPlayers] = useState<Player[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [joined, setJoined] = useState<JoinedPlayer | null>(null);
  const [busy, setBusy] = useState(false);  
const [roundNumber, setRoundNumber] = useState(0);
const [roundStartedAt, setRoundStartedAt] = useState<string | null>(null);
const [roundStatus, setRoundStatus] = useState("waiting");
const [myRole, setMyRole] = useState<string | null>(null);
const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState("");

  async function getUser() {
    const { data: sessionData } = await supabase.auth.getSession();

    if (sessionData.session?.user) {
      return sessionData.session.user;
    }

    const { data, error } = await supabase.auth.signInAnonymously();

    if (error || !data.user) {
      throw error || new Error("Connexion impossible");
    }

    return data.user;
  }

  function showError(err: unknown) {
    console.error("BLACKOUT ERROR:", err);
    setError(
      err instanceof Error
        ? err.message
        : err && typeof err === "object" && "message" in err
          ? String(err.message)
          : "Une erreur est survenue"
    );
  }

  useEffect(() => {
    async function restore() {
      const savedCode = localStorage.getItem("blackout_room");
      const savedMode = localStorage.getItem("blackout_mode");

      if (!savedCode || !savedMode) return;

      try {
        await getUser();

        if (savedMode === "host") {
          setRoomCode(savedCode);
          setMode("host");
        }

        if (savedMode === "player") {
          const { data, error } = await supabase.rpc(
            "blackout_resume_game",
            { p_room_code: savedCode }
          );

          if (error) throw error;

          if (data?.length) {
            setRoomCode(savedCode);
            setJoined({
              game_id: data[0].game_id,
              player_name: data[0].player_name,
              player_slot: data[0].player_slot
            });
            setMode("player");
          }
        }
      } catch (err) {
        console.error("Restore error:", err);
      }
    }

    restore();
  }, []);

  async function createGame() {
    setError("");

    const cleanedNames = names.map((n) => n.trim());

    if (cleanedNames.some((n) => !n || n.length > 24)) {
      setError("Entre trois noms de 1 à 24 caractères.");
      return;
    }

    if (new Set(cleanedNames.map((n) => n.toLowerCase())).size !== 3) {
      setError("Les trois noms doivent être différents.");
      return;
    }

    setBusy(true);

    try {
      await getUser();

      const { data, error } = await supabase.rpc(
        "blackout_create_game",
        { p_names: cleanedNames }
      );

      if (error) throw error;
      if (!data?.length) throw new Error("Salon non créé");

      const code = data[0].room_code;

      localStorage.setItem("blackout_room", code);
      localStorage.setItem("blackout_mode", "host");
      localStorage.setItem("blackout_names", JSON.stringify(cleanedNames));


setRoundNumber(0);
setRoundStartedAt(null);
setRoundStatus("waiting");
setElapsedSeconds(0);
setMyRole(null);
setConnectedPlayers([]);

setRoomCode(code);
setMode("host");

    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  }

  async function findGame() {
    setError("");
    setBusy(true);

    try {
      await getUser();

      const code = roomCode.trim().toUpperCase();

      const { data, error } = await supabase.rpc(
        "blackout_find_game",
        { p_room_code: code }
      );

      if (error) throw error;

      setRoomCode(code);
      setPlayers(data || []);
      setSelectedSlot(null);
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  }

  async function joinGame() {
    if (selectedSlot === null) return;

    setError("");
    setBusy(true);

    try {
      await getUser();

      const { data, error } = await supabase.rpc(
        "blackout_join_game",
        {
          p_room_code: roomCode,
          p_player_slot: selectedSlot
        }
      );

      if (error) throw error;
      if (!data?.length) throw new Error("Connexion impossible");

      const player = data[0];

      localStorage.setItem("blackout_room", roomCode);
      localStorage.setItem("blackout_mode", "player");

      setJoined(player);
      setMode("player");
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  }

useEffect(() => {
  if (mode !== "host" || !roomCode) return;

  let active = true;
  let gameId = "";

  async function loadPlayers() {
    const { data: game, error: gameError } =
      await supabase
        .from("blackout_games")
        .select("id")
        .eq("room_code", roomCode)
        .single();

    if (gameError || !game || !active) return;

    gameId = game.id;

    const { data: rows, error } = await supabase
      .from("blackout_players")
      .select("player_slot, player_name, user_id")
      .eq("game_id", gameId)
      .order("player_slot");

    if (!error && rows && active) {
      setConnectedPlayers(
        rows.map((p) => ({
          player_slot: p.player_slot,
          player_name: p.player_name,
          is_taken: p.user_id !== null
        }))
      );
    }
  }

  loadPlayers();

  
const channel = supabase
  .channel(`blackout-host-${roomCode}`)
  .on(
    "postgres_changes",
    {
      event: "UPDATE",
      schema: "public",
      table: "blackout_players"
    },
    (payload) => {
      console.log("BLACKOUT REALTIME:", payload);
      loadPlayers();
    }
  )
  .subscribe((status) => {
    console.log("BLACKOUT CHANNEL:", status);

    if (status === "SUBSCRIBED") {
      loadPlayers();
    }
  });


  return () => {
    active = false;
    supabase.removeChannel(channel);
  };
}, [mode, roomCode]);

async function startRound() {
  setError("");
  setBusy(true);

  try {
    await getUser();


const { data, error } = await supabase.rpc(
  "blackout_start_round",
  { p_room_code: roomCode }
);

    if (error) throw error;

    if (!data || data.length === 0) {
      throw new Error("Impossible de lancer la manche.");
    }

    setRoundNumber(data[0].round_number);
    setRoundStartedAt(data[0].started_at);
    setRoundStatus("playing");
  } catch (err) {
    showError(err);
  } finally {
    setBusy(false);
  }
}

useEffect(() => {
  if (!roundStartedAt || roundStatus !== "playing") {
    return;
  }

  function updateClock() {
    const start = new Date(roundStartedAt!).getTime();
    const elapsed = Math.max(
      0,
      Math.floor((Date.now() - start) / 1000)
    );

    setElapsedSeconds(elapsed);
  }

  updateClock();

  const interval = setInterval(updateClock, 1000);

  return () => clearInterval(interval);
}, [roundStartedAt, roundStatus]);

const minutes = Math.floor(elapsedSeconds / 60);
const seconds = elapsedSeconds % 60;

const formattedTime =
  String(minutes).padStart(2, "0") +
  ":" +
  String(seconds).padStart(2, "0");

const suddenDeath = elapsedSeconds >= 1200;

useEffect(() => {
  if (mode !== "player" || !roomCode) return;

  let active = true;

  async function refreshRound() {
    const { data, error } = await supabase.rpc(
      "blackout_my_round",
      { p_room_code: roomCode }
    );

    if (error) {
      console.error("ROUND SYNC ERROR:", error);
      return;
    }

    if (!active || !data?.length) return;

    const round = data[0];

    setRoundNumber(round.round_number);
    setRoundStatus(round.round_status);
    setRoundStartedAt(round.started_at);
    setMyRole(round.my_role);
  }

  refreshRound();

  // Vérification toutes les 3 secondes.
  const interval = setInterval(refreshRound, 3000);

  return () => {
    active = false;
    clearInterval(interval);
  };
}, [mode, roomCode]);

  function resetScreen() {
    localStorage.removeItem("blackout_room");
    localStorage.removeItem("blackout_mode");
    setMode("home");
    setPlayers([]);
    setJoined(null);
    setSelectedSlot(null);
    setError("");    
setRoundNumber(0);
setRoundStartedAt(null);
setRoundStatus("waiting");
setElapsedSeconds(0);
setMyRole(null);
setConnectedPlayers([]);

  }

  const buttonStyle: React.CSSProperties = {
    background: "#d9ff43",
    color: "#101410",
    border: "none",
    borderRadius: 8,
    padding: "16px 20px",
    fontSize: 15,
    fontWeight: 900,
    cursor: "pointer",
    width: "100%"
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: 14,
    marginBottom: 12,
    background: "#151d19",
    color: "white",
    border: "1px solid #354139",
    borderRadius: 8,
    fontSize: 16,
    boxSizing: "border-box"
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#090e0c",
        color: "#f1f5f0",
        fontFamily: "Arial, sans-serif",
        display: "flex",
        justifyContent: "center",
        padding: "60px 18px"
      }}
    >
      <div style={{ width: "100%", maxWidth: 460 }}>
        <p style={{ color: "#d9ff43", letterSpacing: 5, fontSize: 12 }}>
          TACTICAL OPERATIONS SYSTEM
        </p>

        <h1 style={{ fontSize: 44, margin: "8px 0" }}>
          BLACKOUT <span style={{ color: "#d9ff43" }}>V6</span>
        </h1>

        <p style={{ color: "#899b90", marginBottom: 35 }}>
          THREE AGENTS. ONE BRIEFCASE. NO SECOND CHANCE.
        </p>

        {mode === "home" && (
          <div style={{ display: "grid", gap: 14 }}>
            <button style={buttonStyle} onClick={() => setMode("create")}>
              CRÉER UNE PARTIE — PC
            </button>
            <button style={buttonStyle} onClick={() => setMode("join")}>
              REJOINDRE UNE PARTIE — TÉLÉPHONE
            </button>
          </div>
        )}

        {mode === "create" && (
          <>
            <h2>Nouvelle opération</h2>
            {names.map((name, index) => (
              <input
                key={index}
                style={inputStyle}
                placeholder={`Nom du joueur ${index + 1}`}
                maxLength={24}
                value={name}
                onChange={(e) => {
                  const updated = [...names];
                  updated[index] = e.target.value;
                  setNames(updated);
                }}
              />
            ))}
            <button style={buttonStyle} disabled={busy} onClick={createGame}>
              {busy ? "CRÉATION..." : "CRÉER LE SALON"}
            </button>
          </>
        )}

        {mode === "join" && (
          <>
            <h2>Rejoindre une opération</h2>

            <input
              style={inputStyle}
              placeholder="CODE DU SALON"
              maxLength={6}
              value={roomCode}
              onChange={(e) => {
                setRoomCode(e.target.value.toUpperCase());
                setPlayers([]);
              }}
            />

            <button style={buttonStyle} disabled={busy} onClick={findGame}>
              {busy ? "RECHERCHE..." : "RECHERCHER LE SALON"}
            </button>

            {players.length > 0 && (
              <div style={{ marginTop: 25 }}>
                <h3>Choisis ton identité</h3>

                {players.map((player) => (
                  <button
                    key={player.player_slot}
                    disabled={player.is_taken}
                    onClick={() => setSelectedSlot(player.player_slot)}
                    style={{
                      ...inputStyle,
                      textAlign: "left",
                      cursor: player.is_taken ? "not-allowed" : "pointer",
                      borderColor:
                        selectedSlot === player.player_slot
                          ? "#d9ff43"
                          : "#354139",
                      opacity: player.is_taken ? 0.4 : 1
                    }}
                  >
                    {player.player_name}
                    {player.is_taken ? " — OCCUPÉ" : ""}
                  </button>
                ))}

                <button
                  style={buttonStyle}
                  disabled={busy || selectedSlot === null}
                  onClick={joinGame}
                >
                  REJOINDRE L'OPÉRATION
                </button>
              </div>
            )}
          </>
        )}


{mode === "host" && (
  <>
    <h2>Salon créé</h2>
    <p>Communique ce code aux trois joueurs :</p>

    <div
      style={{
        padding: 25,
        border: "1px solid #d9ff43",
        borderRadius: 12,
        fontSize: 38,
        textAlign: "center",
        letterSpacing: 8,
        color: "#d9ff43",
        fontWeight: 900
      }}
    >
      {roomCode}
    </div>

    <h3 style={{ marginTop: 30 }}>
      AGENTS CONNECTÉS —{" "}
      {connectedPlayers.filter((p) => p.is_taken).length}/3
    </h3>

    {connectedPlayers.map((player) => (
      <div
        key={player.player_slot}
        style={{
          padding: 15,
          marginBottom: 10,
          border: "1px solid #354139",
          borderRadius: 8,
          display: "flex",
          justifyContent: "space-between"
        }}
      >
        <strong>{player.player_name}</strong>

        <span
          style={{
            color: player.is_taken ? "#d9ff43" : "#899b90"
          }}
        >
          {player.is_taken ? "CONNECTÉ" : "EN ATTENTE"}
        </span>
      </div>
    ))}

    <div style={{ marginTop: 30 }}>
      {roundStatus === "waiting" ? (
        <button
          style={buttonStyle}
          disabled={
            busy ||
            connectedPlayers.filter((p) => p.is_taken).length !== 3
          }
          onClick={startRound}
        >
          {busy ? "LANCEMENT..." : "LANCER LA MANCHE"}
        </button>
      ) : (
        <div
          style={{
            padding: 25,
            border: "1px solid #d9ff43",
            borderRadius: 12,
            textAlign: "center"
          }}
        >
          <p>MANCHE {roundNumber}</p>

          <h2
            style={{
              fontSize: 54,
              color: suddenDeath ? "#ff6868" : "#d9ff43",
              margin: "15px 0"
            }}
          >
            {formattedTime}
          </h2>

          <strong>
            {suddenDeath
              ? "⚠ MORT SUBITE — EXTRACTION INSTANTANÉE"
              : "OPÉRATION EN COURS"}
          </strong>
        </div>
      )}
    </div>
  </>
)}

{mode === "player" && joined && (

          <>
            <h2>Agent connecté</h2>
            <div
              style={{
                border: "1px solid #354139",
                padding: 24,
                borderRadius: 12
              }}
            >
              <p style={{ color: "#899b90" }}>IDENTITÉ CONFIRMÉE</p>
              <h2 style={{ color: "#d9ff43" }}>{joined.player_name}</h2>
              <p>Salon : {roomCode}</p>
              
{roundStatus === "playing" && myRole ? (
  <div style={{ marginTop: 25 }}>
    <p style={{ color: "#899b90" }}>
      MANCHE {roundNumber} — IDENTITÉ SECRÈTE
    </p>

    <h1
      style={{
        fontSize: 44,
        color: "#d9ff43",
        textTransform: "uppercase"
      }}
    >
      {myRole}
    </h1>

    <p>
      ARME :{" "}
      {myRole === "ghost"
        ? "PISTOLET"
        : myRole === "raven"
          ? "SNIPER"
          : "MP5"}
    </p>

    <h2>{formattedTime}</h2>

    <strong style={{ color: suddenDeath ? "#ff6868" : "#d9ff43" }}>
      {suddenDeath
        ? "MORT SUBITE"
        : "OPÉRATION EN COURS"}
    </strong>
  </div>
) : (
  <p>En attente du lancement de la manche...</p>
)}

            </div>
          </>
        )}

        {error && (
          <p style={{ color: "#ff6868", marginTop: 20 }}>
            ERREUR : {error}
          </p>
        )}

        {mode !== "home" && (
          <button
            onClick={resetScreen}
            style={{
              background: "none",
              color: "#899b90",
              border: "none",
              marginTop: 30,
              cursor: "pointer"
            }}
          >
            ← Retour à l'accueil
          </button>
        )}
      </div>
    </main>
  );
}
