import type { Metadata } from "next";
import { Syne, IBM_Plex_Mono } from "next/font/google";
import { Providers } from "./providers";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import "./globals.css";

const syne = Syne({ subsets:["latin"], weight:["400","600","700","800"], variable:"--font-syne" });
const mono = IBM_Plex_Mono({ subsets:["latin"], weight:["400","500","700"], variable:"--font-mono" });

export const metadata: Metadata = {
  title: "YieldForge Protocol | Forge Your Yield",
  description: "Non-custodial DeFi staking. Stake STK tokens and earn RWD rewards.",
  icons: { icon: "/logo.png" },
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${syne.variable} ${mono.variable}`} data-theme="dark">
      <body style={{ overflowX:"hidden", maxWidth:"100vw" }}>
        <Providers>
          <div style={{ display:"flex", flexDirection:"column", minHeight:"100vh", overflowX:"hidden", width:"100%" }}>
            <NavBar />
            <main style={{ flex:1, position:"relative", zIndex:1, overflowX:"hidden", width:"100%" }}>
              {/* Background orbs */}
              <div style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none", overflow:"hidden" }}>
                <div style={{ position:"absolute", width:"600px", height:"600px", top:"-200px", left:"-150px", background:"#00ffa3", borderRadius:"50%", filter:"blur(140px)", opacity:"var(--orb-opacity, 0.06)" }} />
                <div style={{ position:"absolute", width:"400px", height:"400px", bottom:"-150px", right:"-100px", background:"#00c9ff", borderRadius:"50%", filter:"blur(140px)", opacity:"var(--orb-opacity, 0.06)" }} />
                <div style={{ position:"absolute", width:"350px", height:"350px", top:"50%", left:"55%", background:"#a78bfa", borderRadius:"50%", filter:"blur(140px)", opacity:"var(--orb-opacity, 0.04)" }} />
              </div>
              {children}
            </main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}