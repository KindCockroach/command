import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Command Center – AI Mom Education",
  description: "Content Command Center for AI Mom Education",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
