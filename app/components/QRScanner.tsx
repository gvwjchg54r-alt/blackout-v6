
"use client";

import { useEffect, useId, useState } from "react";

type Props = {
  onScan: (value: string) => void;
  onClose: () => void;
};

export default function QRScanner({
  onScan,
  onClose
}: Props) {
  const reactId = useId();
  const scannerId = "scanner-" + reactId.replace(/:/g, "");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let scanner: import("html5-qrcode").Html5Qrcode | null = null;

    async function start() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");

        if (cancelled) return;

        scanner = new Html5Qrcode(scannerId);

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText) => {
            if (!cancelled) {
              cancelled = true;
              onScan(decodedText);
            }
          },
          () => {}
        );

        if (cancelled && scanner?.isScanning) {
          await scanner.stop();
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            "Impossible d'ouvrir la caméra. Vérifie les autorisations."
          );
        }
      }
    }

    start();

    return () => {
      cancelled = true;
      if (scanner?.isScanning) {
        scanner.stop().catch(console.error);
      }
    };
  }, [scannerId, onScan]);

  return (
    <div style={{ marginTop: 20 }}>
      <h3>SCANNER UNE ZONE</h3>

      <div
        id={scannerId}
        style={{
          width: "100%",
          maxWidth: 400,
          margin: "auto"
        }}
      />

      {error && (
        <p style={{ color: "#ff6868" }}>{error}</p>
      )}

      <button
        onClick={onClose}
        style={{
          marginTop: 15,
          padding: 15,
          width: "100%"
        }}
      >
        FERMER LA CAMÉRA
      </button>
    </div>
  );
}
