
"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function Home() {
  const [names, setNames] = useState(["", "", ""]);
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function updateName(index: number, value: string) {
    setNames(previous =>
      previous.map((name, i) =>
        i === index ? value : name
      )
    );
  }

  function generateCode() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);

    return Array.from(bytes, byte =>
      alphabet[byte % alphabet.length]
    ).join("");
  }

  async function createGame() {
    setError("");

    const cleanedNames = names.map(name => name.trim());

    if (cleanedNames.some(name => !name)) {
      setError("Entre les noms des trois joueurs.");
      return;
    }

    if (new Set(cleanedNames.map(n => n.toLowerCase())).size !== 3) {
      setError("Les trois noms doivent être différents.");
      return;
    }

    setLoading(true);

    try {
      let { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      let user = sessionData.session?.user;

      if (!user) {
        const result = await supabase.auth.signInAnonymously();

        if (result.error) throw result.error;
        user = result.data.user ?? undefined;
      }

      if (!user) {
        throw new Error("Connexion impossible.");
      }

      let createdCode = "";
      let gameId = "";

      for (let attempt = 0; attempt < 5; attempt++) {
        const code = generateCode();

        const { data, error: gameError } =
          await supabase
            .from("blackout_games")
            .insert({
              room_code: code,
              host_user_id: user.id,
              status: "waiting",
              current_round: 1
            })
            .select("id, room_code")
            .single();

        if (!gameError && data) {
          createdCode = data.room_code;
          gameId = data.id;
          break;
        }

        if (gameError?.code !== "23505") {
          throw gameError ?? new Error("Création impossible.");
        }
      }

      if (!gameId) {
        throw new Error("Impossible de générer un code unique.");
      }

      // Enregistrement des trois participants.
      // L'écriture est réservée au serveur pour le moment.
      // Nous l'activerons dans l'étape suivante.

      setRoomCode(createdCode);
      localStorage.setItem("blackout_room", createdCode);
      localStorage.setItem("blackout_names", JSON.stringify(cleanedNames));

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{
      minHeight: "100vh",
      background: "#090d14",
      color: "#f5f7fa",
      padding: "50px 20px",
      fontFamily: "Arial, sans-serif",
      display: "flex",
      justifyContent: "center",
      alignItems: "center"
    }}>
      <div style={{ width: "100%", maxWidth: 480 }}>
        <p style={{ color: "#f05252", letterSpacing: 4 }}>
          TACTICAL OPERATIONS SYSTEM
        </p>

        <h1 style={{ fontSize: 52, marginBottom: 4 }}>
          BLACKOUT
        </h1>

        <p style={{ color: "#9ca3af", marginBottom: 35 }}>
          V6 — MULTIPLAYER CONTROL CENTER
        </p>

        <div style={{
          background: "#151c29",
          border: "1px solid #303b4d",
          borderRadius: 14,
          padding: 25
        }}>
          <h2>Créer une opération</h2>

          <p style={{ color: "#9ca3af" }}>
            Enregistre les trois participants.
          </p>

          {names.map((name, index) => (
            <input
              key={index}
              value={name}
              onChange={e => updateName(index, e.target.value)}
              placeholder={`Agent ${index + 1}`}
              maxLength={24}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: 14,
                marginBottom: 12,
                background: "#0b111b",
                color: "white",
                border: "1px solid #354154",
                borderRadius: 8
              }}
            />
          ))}

          <button
            onClick={createGame}
            disabled={loading}
            style={{
              width: "100%",
              padding: 16,
              background: "#d93939",
              color: "white",
              border: 0,
              borderRadius: 8,
              fontWeight: "bold",
              cursor: "pointer",
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? "CONNEXION..." : "CRÉER LA PARTIE"}
          </button>

          {error && (
            <p style={{ color: "#ff7777" }}>
              {error}
            </p>
          )}

          {roomCode && (
            <div style={{
              marginTop: 24,
              textAlign: "center"
            }}>
              <p>CODE DE SALON</p>

              <h2 style={{
                color: "#f05252",
                fontSize: 38,
                letterSpacing: 5
              }}>
                {roomCode}
              </h2>

              <p style={{ color: "#9ca3af" }}>
                Salon enregistré sur le serveur.
                Connexion des joueurs à venir.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
