import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.aiworksforher.com"),
  title: "RISE Station",
  description: "Your AI content OS",
  // Balloon everywhere on aiworksforher.com (?v= busts browsers' sticky favicon cache).
  // bethereforher.com keeps its "Hers" icon via app/bethereforher/layout.tsx.
  icons: { icon: "/favicon.ico?v=2", apple: "/apple-icon.png?v=2" },
  openGraph: {
    title: "AI Mom",
    description: "Podcast · Host · Speaker",
    url: "https://www.aiworksforher.com",
    siteName: "AI Mom",
    images: [{ url: "/og-aimom.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Mom",
    description: "Podcast · Host · Speaker",
    images: ["/og-aimom.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body>{children}</body>
    </html>
  );
}
