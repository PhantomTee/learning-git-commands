import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
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

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ChainTales",
  description: "AI-judged DND adventures on Genlayer",
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
      className={`${vt323.variable} ${geistMono.variable} h-full`}
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
