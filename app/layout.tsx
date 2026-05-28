import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Curtain Call — AI casting for playwrights",
  description:
    "An AI agent that matches playwrights with visual conceptualizers, powered by Zero.xyz.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-serif">{children}</body>
    </html>
  );
}
