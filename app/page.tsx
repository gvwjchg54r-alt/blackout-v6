
"use client";

import { useState } from "react";

export default function Home() {
  const [names, setNames] = useState(["", "", ""]);
  const [roomCode, setRoomCode] = useState("");

  function updateName(index: number, value: string) {
    setNames((previous) =>
      previous.map((name, i) => (i === index ? value : name))
    );
  }

  function createGame() {
    if (names.some((name) => !name.trim())) {
      alert("Entre les noms des trois joueurs.");
      return;
    }

    const code = Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase();

    setRoomCode(code);
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
              onChange={(e) =>
                updateName(index, e.target.value)
              }
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
            style={{
              width: "100%",
              padding: 16,
              background: "#d93939",
              color: "white",
              border: 0,
              borderRadius: 8,
              fontWeight: "bold",
              cursor: "pointer"
            }}
          >
            CRÉER LA PARTIE
          </button>

          {roomCode && (
            <div style={{
              marginTop: 24,
              textAlign: "center"
            }}>
              <p>CODE DE SALON — DÉMONSTRATION</p>
              <h2 style={{
                color: "#f05252",
                letterSpacing: 5
              }}>
                {roomCode}
              </h2>
              <p style={{ color: "#9ca3af" }}>
                Le salon n'est pas encore enregistré
                sur le serveur.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
