
"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { supabase } from "../../lib/supabase";

type Zone = {
  zone_id: string;
  zone_name: string;
  qr_token: string;
  allow_spawn: boolean;
  allow_extraction: boolean;
};

type PrintableZone = Zone & {
  qrImage: string;
};

export default function PrintPage() {
  const [zones, setZones] = useState<PrintableZone[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const code = localStorage.getItem("blackout_room");

        if (!code) {
          throw new Error("Aucun salon sélectionné.");
        }

        const { data, error: dbError } = await supabase.rpc(
          "blackout_get_zones",
          { p_room_code: code }
        );

        if (dbError) throw dbError;

        const results = await Promise.all(
          ((data || []) as Zone[]).map(async (zone) => ({
            ...zone,
            qrImage: await QRCode.toDataURL(
              `BLACKOUT:ZONE:${zone.qr_token}`,
              {
                width: 300,
                margin: 2,
                errorCorrectionLevel: "H"
              }
            )
          }))
        );

        setZones(results);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Impossible de charger les zones."
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <main
      style={{
        background: "white",
        color: "black",
        minHeight: "100vh",
        padding: 30,
        fontFamily: "Arial, sans-serif"
      }}
    >
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }

          .zone-card {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          body {
            margin: 0;
          }
        }
      `}</style>

      <div className="no-print" style={{ marginBottom: 25 }}>
        <button onClick={() => window.print()}>
          IMPRIMER LES QR CODES
        </button>
      </div>

      <h1>BLACKOUT V6</h1>
      <p>POINTS DE CONTRÔLE — TERRAIN</p>

      {loading && <p>Chargement des QR codes...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 20
        }}
      >
        {zones.map((zone) => (
          <div
            className="zone-card"
            key={zone.zone_id}
            style={{
              border: "2px solid black",
              padding: 20,
              textAlign: "center",
              borderRadius: 12
            }}
          >
            <h2>{zone.zone_name}</h2>

            <img
              src={zone.qrImage}
              alt={`QR code de ${zone.zone_name}`}
              style={{
                width: "100%",
                maxWidth: 250
              }}
            />

            <p>
              {zone.allow_spawn ? "SPAWN " : ""}
              {zone.allow_extraction ? "EXTRACTION" : ""}
            </p>

            <strong>BLACKOUT V6</strong>
          </div>
        ))}
      </div>
    </main>
  );
}
