import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.aiworksforher.com"),
  title: "RISE Station",
  description: "Your AI content OS",
  icons: { icon: "/favicon.ico", apple: "/apple-icon.png" },
  openGraph: {
    title: "AI Works For Her",
    description: "From invisible to impactful.",
    url: "https://www.aiworksforher.com",
    siteName: "AI Works For Her",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Works For Her",
    description: "From invisible to impactful.",
    images: ["/og.png"],
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
