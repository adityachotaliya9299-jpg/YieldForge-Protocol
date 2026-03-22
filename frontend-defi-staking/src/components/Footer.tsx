"use client";
import { useState, useEffect } from "react";
import Image from "next/image";

const CONTRACTS = {
  stakingToken:    "0xe2E63678a54AA74f79b0AE68455db2E3c34d4e34",
  rewardToken:     "0xE6f0adEE844A89Cd554e188609B0A44895f5Bf8D",
  stakingContract: "0x84b969e7c086Ae80498e46d139F1efF10Ad8e409",
};
const es = (a: string) => `https://sepolia.etherscan.io/address/${a}`;

const NAV = [["/","Dashboard"],["/stake","Stake"],["/pools","Pools"],["/analytics","Analytics"],["/governance","Governance"],["/leaderboard","Leaderboard"]];

export default function Footer() {
  const [cols, setCols] = useState(4);
  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      setCols(w < 560 ? 1 : w < 900 ? 2 : 4);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const gridCols = cols === 1 ? "1fr" : cols === 2 ? "1fr 1fr" : "1.8fr 1fr 1.5fr 1fr";

  return (
    <footer style={{ marginTop:"4rem", borderTop:"1px solid var(--border-green)", background:"var(--footer-bg)" }}>

      {/* Main grid */}
      <div style={{ maxWidth:"1100px", margin:"0 auto", padding:"2.5rem 1.5rem 2rem", display:"grid", gridTemplateColumns:gridCols, gap:"2rem" }}>

        {/* Brand */}
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:"0.6rem", marginBottom:"0.85rem" }}>
            <div style={{ width:"36px", height:"36px", flexShrink:0, borderRadius:"9px", overflow:"hidden", background:"rgba(0,200,100,0.1)", border:"1px solid rgba(0,200,100,0.2)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Image src="/logo.png" alt="YieldForge" width={30} height={30} style={{ objectFit:"contain" }} />
            </div>
            <div>
              <div style={{ fontFamily:"Syne,Georgia,serif", fontSize:"0.95rem", fontWeight:800, color:"var(--t1)" }}>YieldForge Protocol</div>
              <div style={{ fontSize:"0.55rem", color:"var(--green)", letterSpacing:"0.14em", fontWeight:700 }}>FORGE YOUR YIELD</div>
            </div>
          </div>
          <p style={{ fontSize:"0.8rem", color:"var(--t3)", lineHeight:1.7, marginBottom:"1rem" }}>
            Non-custodial DeFi staking protocol.<br/>Stake STK. Earn RWD. Stay in control.
          </p>
          <div style={{ display:"inline-flex", alignItems:"center", gap:"0.4rem", fontSize:"0.7rem", color:"var(--green)", background:"rgba(0,200,100,0.07)", border:"1px solid rgba(0,200,100,0.15)", borderRadius:"20px", padding:"0.22rem 0.65rem" }}>
            <div className="pulse" style={{ width:"5px", height:"5px", borderRadius:"50%", background:"var(--green)", flexShrink:0 }} />
            Live on Sepolia Testnet
          </div>
        </div>

        {/* Navigation */}
        <div>
          <div style={{ fontSize:"0.68rem", textTransform:"uppercase", letterSpacing:"0.12em", color:"var(--t4)", marginBottom:"0.85rem", fontWeight:700 }}>
            Navigation
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:"0.1rem" }}>
            {NAV.map(([href, label]) => (
              <a key={href} href={href}
                style={{ fontSize:"0.82rem", color:"var(--t3)", textDecoration:"none", padding:"0.22rem 0", display:"block", transition:"color 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--green)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--t3)")}>
                {label}
              </a>
            ))}
          </div>
        </div>

        {/* Contracts */}
        <div>
          <div style={{ fontSize:"0.68rem", textTransform:"uppercase", letterSpacing:"0.12em", color:"var(--t4)", marginBottom:"0.85rem", fontWeight:700 }}>
            Contracts (Sepolia)
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:"0.1rem", marginBottom:"1rem" }}>
            <a href={es(CONTRACTS.stakingContract)} target="_blank" rel="noopener noreferrer" style={{ fontSize:"0.82rem", color:"var(--t3)", textDecoration:"none", padding:"0.22rem 0", display:"block" }}>StakingContract ↗</a>
            <a href={es(CONTRACTS.stakingToken)}    target="_blank" rel="noopener noreferrer" style={{ fontSize:"0.82rem", color:"var(--t3)", textDecoration:"none", padding:"0.22rem 0", display:"block" }}>StakingToken (STK) ↗</a>
            <a href={es(CONTRACTS.rewardToken)}     target="_blank" rel="noopener noreferrer" style={{ fontSize:"0.82rem", color:"var(--t3)", textDecoration:"none", padding:"0.22rem 0", display:"block" }}>RewardToken (RWD) ↗</a>
          </div>
          <div style={{ fontSize:"0.68rem", textTransform:"uppercase", letterSpacing:"0.12em", color:"var(--t4)", marginBottom:"0.65rem", fontWeight:700 }}>
            Coming Soon
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:"0.1rem" }}>
            {["Auto-Compounder","veSTK Escrow","Cross-Chain Bridge","Launchpad"].map(f => (
              <span key={f} style={{ fontSize:"0.78rem", color:"var(--t4)", padding:"0.18rem 0", display:"block" }}>{f}</span>
            ))}
          </div>
        </div>

        {/* Protocol Info */}
        <div>
          <div style={{ fontSize:"0.68rem", textTransform:"uppercase", letterSpacing:"0.12em", color:"var(--t4)", marginBottom:"0.85rem", fontWeight:700 }}>
            Protocol Info
          </div>
          <div>
            {[["Lock Period","7 Days"],["Reward Token","RWD"],["Stake Token","STK"],["Network","Sepolia"],["Deposit Fee","0%"],["Version","v1.0.0"]].map(([k,v]) => (
              <div key={k} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:"0.78rem", padding:"0.32rem 0", borderBottom:"1px solid var(--border)" }}>
                <span style={{ color:"var(--t3)" }}>{k}</span>
                <strong style={{ color:"var(--t2)", fontWeight:600 }}>{v}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ maxWidth:"1100px", margin:"0 auto", padding:"0.9rem 1.5rem", borderTop:"1px solid var(--border)", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"0.5rem" }}>
        <div style={{ fontSize:"0.72rem", color:"var(--t3)", display:"flex", alignItems:"center", gap:"0.35rem", flexWrap:"wrap" }}>
          <span>© {new Date().getFullYear()} YieldForge Protocol</span>
          <span style={{ color:"var(--t4)" }}>·</span>
          <span>Built by</span>
          <a href="https://github.com/adityachotaliya9299-jpg" target="_blank" rel="noopener noreferrer"
            style={{ fontFamily:"Syne,Georgia,serif", fontWeight:800, fontSize:"0.82rem", textDecoration:"none",
              background:"linear-gradient(135deg,#00ffa3,#00c9ff)",
              WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>
            Aditya Chotaliya ↗
          </a>
          <span style={{ color:"var(--t4)" }}>· All rights reserved.</span>
        </div>
        <span style={{ fontSize:"0.7rem", color:"var(--t4)" }}>⚠ Testnet · Not financial advice</span>
      </div>
    </footer>
  );
}