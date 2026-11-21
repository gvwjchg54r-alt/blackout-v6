
import type { ReactNode } from "react";

export const metadata = {
  title: "BLACKOUT V6",
  description: "Multiplayer Tactical Operations"
};

export default function RootLayout({
  children
}: {
  children: ReactNode;
}) {
  return (
    <html lang="fr">
      <body style={{ margin: 0 }}>
        {children}
      </body>
    </html>
  );
}
