
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import QRScanner from "./components/QRScanner";
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
const [isAlive, setIsAlive] = useState(true);
const [respawnAt, setRespawnAt] = useState<string | null>(null);
const [extractionStartedAt, setExtractionStartedAt] =
  useState<string | null>(null);
const [extractionCompletedAt, setExtractionCompletedAt] =
  useState<string | null>(null);
const [gameNow, setGameNow] = useState(Date.now());
const [roundWinnerName, setRoundWinnerName] =
  useState<string | null>(null);
const [roundWinnerRole, setRoundWinnerRole] =
  useState<string | null>(null);
const [serverOffset, setServerOffset] = useState(0);
const [spawnName, setSpawnName] = useState<string | null>(null);
const [extractionName, setExtractionName] = useState<string | null>(null);
const [spawnValidated, setSpawnValidated] = useState(false);
const [extractionValidated, setExtractionValidated] = useState(false);
 const [roomCode, setRoomCode] = useState("");
const [scannerOpen, setScannerOpen] = useState(false);
const [scanMessage, setScanMessage] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [connectedPlayers, setConnectedPlayers] = useState<Player[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [joined, setJoined] = useState<JoinedPlayer | null>(null);
  const [busy, setBusy] = useState(false); 
  const [zoneName, setZoneName] = useState("");
const [allowSpawn, setAllowSpawn] = useState(true);
const [allowExtraction, setAllowExtraction] = useState(true);
const [zones, setZones] = useState<{
  zone_id: string;
  zone_name: string;
  qr_token: string;
}[]>([]);

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
setZones([]);
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
  if (mode !== "host" || !roomCode) {
    return;
  }

  let active = true;

  async function refreshZones() {
    try {
      const { data, error } = await supabase.rpc(
        "blackout_get_zones",
        { p_room_code: roomCode }
      );

      if (error) throw error;

      if (active) {
        setZones(data || []);
      }
    } catch (err) {
      console.error("BLACKOUT ZONES ERROR:", err);
    }
  }

  refreshZones();

  return () => {
    active = false;
  };
}, [mode, roomCode]);

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
      "blackout_launch_round",
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

const currentServerTime = gameNow + serverOffset;

const respawnSeconds = respawnAt
  ? Math.max(
      0,
      Math.ceil(
        (new Date(respawnAt).getTime() - currentServerTime) / 1000
      )
    )
  : 0;

const extractionSeconds = extractionStartedAt
  ? Math.max(
      0,
      120 - Math.floor(
        (currentServerTime -
          new Date(extractionStartedAt).getTime()) / 1000
      )
    )
  : 120;

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
    setRoundStatus((previous) =>
  previous === "finished" && round.round_status === "playing"
    ? previous
    : round.round_status
);
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

async function loadZones(code: string) {
  try {
    const { data, error } = await supabase.rpc(
      "blackout_get_zones",
      { p_room_code: code }
    );

    if (error) throw error;

    setZones(data || []);
  } catch (err) {
    console.error("Erreur chargement zones :", err);
  }
}

async function addZone() {
  if (!zoneName.trim()) {
    setError("Entre un nom de zone.");
    return;
  }

  setBusy(true);
  setError("");

  try {
    await getUser();

    const { data, error } = await supabase.rpc(
      "blackout_add_zone",
      {
        p_room_code: roomCode,
        p_zone_name: zoneName.trim(),
        p_allow_spawn: allowSpawn,
        p_allow_extraction: allowExtraction
      }
    );

    if (error) throw error;
    if (!data?.length) {
      throw new Error("Impossible de créer la zone.");
    }

    setZones((previous) => [...previous, data[0]]);
    setZoneName("");
  } catch (err) {
    showError(err);
  } finally {
    setBusy(false);
  }
}



async function handleZoneScan(value: string) {
  if (roundStatus !== "playing") {
  setScannerOpen(false);
  setScanMessage("MANCHE TERMINÉE");
  return;
}
  setScannerOpen(false);
  setScanMessage("Vérification du QR code...");

  try {
    const { data, error } = await supabase.rpc(
      "blackout_scan_action",
      {
        p_room_code: roomCode,
        p_qr_value: value
      }
    );

    if (error) throw error;

    switch (data) {
      case "SPAWN_VALIDE":
        setSpawnValidated(true);
        setIsAlive(true);
        setScanMessage("✓ DÉPART / RESPAWN VALIDÉ");
        break;

      case "PROTOCOLE_LANCE":
        setScanMessage("✓ PROTOCOLE D'EXTRACTION LANCÉ");
        break;

      case "PROTOCOLE_DEJA_LANCE":
        setScanMessage("PROTOCOLE DÉJÀ EN COURS");
        break;

      case "ATTENTE_RESPAWN":
        setScanMessage("✕ ATTENDS LA FIN DU COMPTE À REBOURS");
        break;

      case "MAUVAISE_ZONE":
        setScanMessage("✕ MAUVAISE ZONE");
        break;

      case "JOUEUR_ELIMINE":
        setScanMessage("✕ JOUEUR ÉLIMINÉ");
        break;

      case "AUCUNE_EXTRACTION":
        setScanMessage("GHOST : AUCUNE EXTRACTION");
        break;

      case "EXTRACTION_TERMINEE":
        setScanMessage("✓ EXTRACTION DÉJÀ TERMINÉE");
        break;

      default:
        setScanMessage("✕ QR CODE NON VALIDE");
    }
  } catch (err) {
    console.error("SCAN ERROR:", err);
    setScanMessage("✕ ERREUR DE VALIDATION");
  }
}



useEffect(() => {
  if (mode !== "player" || !roomCode ||
      roundStatus !== "playing") {
    return;
  }

  let active = true;

  async function refreshGameState() {
    const { data, error } = await supabase.rpc(
      "blackout_my_game_state",
      { p_room_code: roomCode }
    );

    if (error) {
      console.error("GAME STATE ERROR:", error);
      return;
    }

    if (!active || !data?.length) return;

    const state = data[0];

    setIsAlive(state.is_alive);
    setSpawnValidated(state.spawn_validated);
    setSpawnName(state.spawn_name);
    setExtractionName(state.extraction_name);
    setRespawnAt(state.respawn_at);
    setExtractionStartedAt(state.extraction_started_at);
    setExtractionCompletedAt(state.extraction_completed_at);
    setExtractionValidated(
      state.extraction_completed_at !== null
    );

    setServerOffset(
      new Date(state.server_now).getTime() - Date.now()
    );
  }

  refreshGameState();

  const interval = setInterval(refreshGameState, 1000);

  return () => {
    active = false;
    clearInterval(interval);
  };
}, [mode, roomCode, roundStatus]);

useEffect(() => {
  const interval = setInterval(() => {
    setGameNow(Date.now());
  }, 1000);

  return () => clearInterval(interval);
}, []);


async function reportHit() {
  if (roundStatus !== "playing") return;
  if (busy) return;

  setBusy(true);
  setError("");

  try {
    const { data, error } = await supabase.rpc(
      "blackout_report_hit",
      { p_room_code: roomCode }
    );

    if (error) throw error;

    if (data === "ELIMINATION_CONFIRMEE") {
      setIsAlive(false);
      setSpawnValidated(false);
      setExtractionStartedAt(null);
      setScanMessage("ÉLIMINÉ — ATTENDS TON RESPAWN");
    } else if (data === "DEJA_ELIMINE") {
      setScanMessage("TU ES DÉJÀ ÉLIMINÉ");
    } else if (data === "DEPART_NON_VALIDE") {
      setScanMessage("VALIDE D'ABORD TON DÉPART");
    } else {
      setScanMessage(data || "ACTION REFUSÉE");
    }
  } catch (err) {
    showError(err);
  } finally {
    setBusy(false);
  }
}

useEffect(() => {
  if (
    !roomCode ||
    (mode !== "host" && mode !== "player") ||
    roundStatus === "waiting"
  ) {
    return;
  }

  let active = true;
  let checking = false;

  async function checkRoundResult() {
    if (checking) return;
    checking = true;

    try {
      const { data, error } = await supabase.rpc(
        "blackout_finish_round",
        { p_room_code: roomCode }
      );

      if (error) throw error;
      if (!active || !data?.length) return;

      const result = data[0];

      if (result.round_status === "finished") {
        setRoundStatus("finished");
        setRoundWinnerName(result.winner_name);
        setRoundWinnerRole(result.winner_role);
      }
    } catch (err) {
      console.error("ROUND RESULT ERROR:", err);
    } finally {
      checking = false;
    }
  }

  checkRoundResult();

  const interval = setInterval(checkRoundResult, 1000);

  return () => {
    active = false;
    clearInterval(interval);
  };
}, [mode, roomCode, roundStatus]);

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
    setZones([]);

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


{roundStatus === "finished" &&
  (mode === "host" || mode === "player") && (
    <div
      style={{
        padding: 25,
        marginTop: 25,
        marginBottom: 25,
        border: "2px solid #d9ff43",
        borderRadius: 12,
        textAlign: "center",
        background: "#151d19"
      }}
    >
      <h2 style={{ color: "#d9ff43" }}>
        MANCHE TERMINÉE
      </h2>

      <p>EXTRACTION RÉUSSIE</p>

      <h1 style={{ fontSize: 38 }}>
        {roundWinnerName ?? "Chargement..."}
      </h1>

      <h2 style={{ color: "#d9ff43" }}>
        {roundWinnerRole?.toUpperCase()}
      </h2>

      <p>Résultat provisoire</p>
    </div>
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

{roundStatus === "waiting" && (
  <div style={{ marginTop: 30 }}>
    <h3>CONFIGURATION DU TERRAIN</h3>

    <input
      style={inputStyle}
      placeholder="Nom de la zone (ex. ALPHA)"
      value={zoneName}
      maxLength={40}
      onChange={(e) => setZoneName(e.target.value)}
    />

    <label style={{ display: "block", marginBottom: 12 }}>
      <input
        type="checkbox"
        checked={allowSpawn}
        onChange={(e) => setAllowSpawn(e.target.checked)}
      />
      {" "}Zone de spawn
    </label>

    <label style={{ display: "block", marginBottom: 20 }}>
      <input
        type="checkbox"
        checked={allowExtraction}
        onChange={(e) => setAllowExtraction(e.target.checked)}
      />
      {" "}Zone d'extraction
    </label>

    <button
      style={buttonStyle}
      disabled={busy || !zoneName.trim()}
      onClick={addZone}
    >
      AJOUTER LA ZONE
    </button>

<button
  style={{
    ...buttonStyle,
    marginTop: 12,
    background: "#26364c",
    color: "white"
  }}
  onClick={() => window.open("/print", "_blank")}
>
  IMPRIMER LES QR CODES
</button>

    <div style={{ marginTop: 25 }}>
      {zones.map((zone) => (
        <div
          key={zone.zone_id}
          style={{
            padding: 15,
            marginBottom: 10,
            border: "1px solid #354139",
            borderRadius: 8
          }}
        >
          <strong>{zone.zone_name}</strong>
          <p style={{ color: "#899b90", fontSize: 12 }}>
            QR enregistré — prêt à générer
          </p>
        </div>
      ))}
    </div>
  </div>
)}

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
              
{roundStatus === "playing" && (
  <div
    style={{
      marginTop: 25,
      padding: 20,
      border: "1px solid #d9ff43",
      borderRadius: 12
    }}
  >
    <h3>TES DESTINATIONS</h3>

    <p style={{ fontSize: 13, opacity: 0.7 }}>
      POINT DE DÉPART
    </p>

    <h2>{spawnName ?? "Attribution en cours..."}</h2>

    <p>
      {spawnValidated
        ? "✓ Départ validé"
        : "Scan du QR code requis"}
    </p>

    {extractionName && (
      <>
        <hr />

        <p style={{ fontSize: 13, opacity: 0.7 }}>
          EXTRACTION SECRÈTE
        </p>

        <h2>{extractionName}</h2>

        <p>
          {extractionValidated
            ? "✓ Extraction validée"
            : "Destination confidentielle"}
        </p>
      </>
    )}
  </div>
)}

{roundStatus === "playing" && (
  <div style={{
    marginTop: 25,
    padding: 20,
    border: "1px solid #354139",
    borderRadius: 12,
    textAlign: "center"
  }}>
    <h3>ÉTAT DE L'AGENT</h3>

    {extractionCompletedAt ? (
      <>
        <h2 style={{ color: "#d9ff43" }}>
          EXTRACTION TERMINÉE
        </h2>
        <p>Résultat provisoire enregistré.</p>
      </>
    ) : !isAlive ? (
      <>
        <h2 style={{ color: "#ff6868" }}>
          AGENT ÉLIMINÉ
        </h2>

        <h1 style={{ fontSize: 60 }}>
          {respawnSeconds}s
        </h1>

        <p>
          NOUVEAU SPAWN : {spawnName ?? "CHARGEMENT..."}
        </p>

        <p>
          {respawnSeconds > 0
            ? "ATTENDS AVANT DE SCANNER"
            : "REJOINS TON SPAWN ET SCANNE LE QR CODE"}
        </p>
      </>
    ) : !spawnValidated ? (
      <>
        <h2>SPAWN NON VALIDÉ</h2>
        <p>
          Rejoins {spawnName ?? "ton point de départ"}
          {" "}et scanne son QR code.
        </p>
      </>
    ) : (
      <>
        <h2 style={{ color: "#d9ff43" }}>
          AGENT ACTIF
        </h2>

        {extractionStartedAt && (
          <>
            <p>PROTOCOLE D'EXTRACTION</p>
            <h1 style={{ fontSize: 60 }}>
              {suddenDeath ? "00:00" :
                `${String(Math.floor(extractionSeconds / 60)).padStart(2, "0")}:${String(extractionSeconds % 60).padStart(2, "0")}`}
            </h1>
            <p>
              {suddenDeath
                ? "FINALISATION EN COURS"
                : "MAINTIENS LA POSITION"}
            </p>
          </>
        )}

        <button
          style={{
            ...buttonStyle,
            background: "#c62828",
            color: "white",
            marginTop: 20
          }}
          disabled={busy}
          onClick={reportHit}
        >
          JE SUIS TOUCHÉ
        </button>
      </>
    )}
  </div>
)}

<div style={{ marginTop: 25 }}>
  {!scannerOpen && (
    <button
      style={buttonStyle}
      onClick={() => {
        setScanMessage("");
        setScannerOpen(true);
      }}
    >
      SCANNER UN QR CODE
    </button>
  )}

  {scannerOpen && (
    <QRScanner
      onScan={handleZoneScan}
      onClose={() => setScannerOpen(false)}
    />
  )}

  {scanMessage && (
    <p
      style={{
        marginTop: 20,
        textAlign: "center",
        color: scanMessage.startsWith("✓")
          ? "#d9ff43"
          : "#ff6868"
      }}
    >
      {scanMessage}
    </p>
  )}
</div>

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
