import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Providers from "./providers";
import Navbar from "@/components/Navbar";
import StoneGate from "@/components/StoneGate";

const vt323 = localFont({
  variable: "--font-vt323",
  src: "./fonts/vt323.woff2",
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://chaintales.vercel.app"),
  title: "ChainTales",
  description: "AI-judged DND adventures on Genlayer",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" },
    ],
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    title: "ChainTales",
    description: "AI-judged DND adventures on Genlayer",
    type: "website",
    siteName: "ChainTales",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "ChainTales pixel RPG title card",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ChainTales",
    description: "AI-judged DND adventures on Genlayer",
    images: ["/opengraph-image"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${vt323.variable} h-full`}
    >
      <body className="min-h-full flex flex-col bg-stone text-parchment font-body pixel-frame">
        <Providers>
          <StoneGate />
          <Navbar />
          {/* pt-[57px] offsets the fixed navbar (1px top line + ~44px bar + 1px bottom line + py-3) */}
          <main className="flex-1 pt-[57px]">{children}</main>
          <footer className="border-t border-amber-900/30 py-4 text-center text-xs text-amber-900/60 font-display tracking-widest">
            CHAINTALES · ON-CHAIN AI DUNGEON MASTER · GENLAYER
          </footer>
        </Providers>
      </body>
    </html>
  );
}
