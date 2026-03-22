"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { TIERS } from "@/lib/wagmi";
import { useStaking } from "@/hooks/useStaking";

export default function PoolsPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { aprPercent, totalStaked } = useStaking();
  if (!mounted) return null;

  const fmtAPR = (v: number) =>
    v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}M%` :
    v >= 1_000     ? `${(v/1_000).toFixed(1)}K%`     :
    `${v.toFixed(2)}%`;

  // V2 tier pools — ALL LIVE
  const TIER_POOLS = TIERS.map(t => ({
    id:          t.id,
    name:        `STK → RWD`,
    tier:        t,
    apr:         aprPercent * t.multiplier,
    tvl:         Number(totalStaked).toFixed(4),
    lockDays:    t.lockDays,
    mult:        `${t.multiplier}x`,
    status:      "live" as const,
    href:        "/stake",
    color:       t.color,
    desc:        t.desc,
    risk:        "Low",
  }));

  // External pools — coming soon
  const EXTERNAL_POOLS = [
    { id:10, name:"ETH → RWD",      stakeToken:"ETH", color:"#627eea", apr:45,  tvl:"—", lockDays:30,  mult:"1.5x", status:"soon" as const, href:"#", desc:"Stake ETH earn RWD. 30-day lock.", risk:"Medium" },
    { id:11, name:"USDC → RWD",     stakeToken:"USD", color:"#2775ca", apr:18,  tvl:"—", lockDays:90,  mult:"2x",   status:"soon" as const, href:"#", desc:"Stable pool. USDC staking.",       risk:"Low"    },
    { id:12, name:"xSTK Vault",     stakeToken:"STK", color:"#a78bfa", apr:0,   tvl:"—", lockDays:0,   mult:"Auto", status:"live" as const, href:"/vestk", desc:"Auto-compound. No manual claims.", risk:"Low"    },
    { id:13, name:"STK-ETH LP → RWD",stakeToken:"UNI",color:"#ff007a", apr:120, tvl:"—", lockDays:14,  mult:"3x",   status:"soon" as const, href:"#", desc:"Liquidity mining. Max rewards.",   risk:"High"   },
  ];

  const riskColor: Record<string,string> = { Low:"var(--green)", Medium:"var(--yellow)", High:"var(--red)" };

  return (
    <div className="yf-page">
      <div className="yf-page-header">
        <h1 className="yf-page-title">🏊 Staking Pools</h1>
        <p className="yf-sub">Choose your tier — longer lock = higher multiplier = more rewards.</p>
      </div>

      {/* V2 Live tier section */}
      <div style={{ marginBottom:"2rem" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"0.65rem", marginBottom:"1.1rem" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"0.4rem", padding:"0.22rem 0.7rem", background:"rgba(0,200,100,0.08)", border:"1px solid rgba(0,200,100,0.2)", borderRadius:"20px" }}>
            <div className="pulse section-live-dot" />
            <span style={{ fontSize:"0.7rem", color:"var(--green)", fontWeight:700, letterSpacing:"0.1em" }}>LIVE NOW</span>
          </div>
          <h2 className="yf-h2" style={{ marginBottom:0 }}>V2 Staking Tiers — STK → RWD</h2>
        </div>

        <div className="pool-grid-2">
          {TIER_POOLS.map(pool => (
            <div key={pool.id} className="yf-card" style={{ padding:"1.6rem", border:`1px solid ${pool.color}40`, borderTop:`3px solid ${pool.color}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"0.85rem" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"0.65rem" }}>
                  <div style={{ width:"42px", height:"42px", flexShrink:0, borderRadius:"11px", background:`${pool.color}18`, border:`1px solid ${pool.color}40`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.3rem" }}>
                    {pool.tier.emoji}
                  </div>
                  <div>
                    <div style={{ fontFamily:"Syne,Georgia,serif", fontSize:"1rem", fontWeight:700, color:"var(--t1)" }}>
                      {pool.tier.name} Tier
                    </div>
                    <div style={{ fontSize:"0.74rem", color:"var(--t3)" }}>{pool.name} · {pool.desc}</div>
                  </div>
                </div>
                <span className="badge-live">● LIVE</span>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:"0.5rem", marginBottom:"0.9rem" }}>
                {[
                  { label:"APR",   value:fmtAPR(pool.apr), color:pool.color },
                  { label:"TVL",   value:`${pool.tvl} STK`, color:"var(--t1)" },
                  { label:"Lock",  value:`${pool.lockDays}d`, color:"var(--t1)" },
                  { label:"Boost", value:pool.mult, color:"var(--yellow)" },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ padding:"0.55rem 0.65rem", background:"var(--bg-input)", border:"1px solid var(--border)", borderRadius:"9px" }}>
                    <div className="yf-label" style={{ marginBottom:"0.18rem", fontSize:"0.6rem" }}>{label}</div>
                    <div className="yf-mono" style={{ fontSize:"0.85rem", fontWeight:700, color }}>{value}</div>
                  </div>
                ))}
              </div>

              <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.76rem", color:"var(--t3)", marginBottom:"0.9rem" }}>
                <span>Risk: <span style={{ color:riskColor[pool.risk], fontWeight:600 }}>{pool.risk}</span></span>
                <span>Reward: <span style={{ color:"var(--t2)" }}>RWD</span></span>
              </div>

              <Link href={pool.href}
                style={{ display:"block", textAlign:"center", padding:"0.72rem", background:`linear-gradient(135deg,${pool.color},#00c9ff)`, borderRadius:"10px", color:"#040b14", fontWeight:800, fontSize:"0.88rem", textDecoration:"none" }}>
                Stake Now — {pool.tier.emoji} {pool.tier.name} →
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Coming Soon */}
      <div>
        <h2 className="yf-h2" style={{ marginBottom:"1.1rem" }}>
          <span style={{ opacity:0.5 }}>⏳</span> Coming Soon
        </h2>
        <div className="pool-grid-2">
          {EXTERNAL_POOLS.map(pool => (
            <div key={pool.id} className="yf-card" style={{ padding:"1.6rem", opacity:0.65, borderTop:`3px solid ${pool.color}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"0.85rem" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"0.65rem" }}>
                  <div style={{ width:"42px", height:"42px", flexShrink:0, borderRadius:"11px", background:`${pool.color}18`, border:`1px solid ${pool.color}40`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.75rem", fontWeight:800, color:pool.color, fontFamily:"IBM Plex Mono,monospace" }}>
                    {pool.stakeToken.slice(0,3)}
                  </div>
                  <div>
                    <div style={{ fontFamily:"Syne,Georgia,serif", fontSize:"1rem", fontWeight:700, color:"var(--t1)" }}>{pool.name}</div>
                    <div style={{ fontSize:"0.74rem", color:"var(--t3)" }}>{pool.desc}</div>
                  </div>
                </div>
                <span className="badge-soon">SOON</span>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:"0.5rem", marginBottom:"0.9rem" }}>
                {[
                  { label:"APR",   value: pool.apr===0?"Auto":`~${pool.apr}%`, color:pool.color },
                  { label:"TVL",   value:"—", color:"var(--t4)" },
                  { label:"Lock",  value:`${pool.lockDays}d`, color:"var(--t4)" },
                  { label:"Boost", value:pool.mult, color:"var(--t4)" },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ padding:"0.55rem 0.65rem", background:"var(--bg-input)", border:"1px solid var(--border)", borderRadius:"9px" }}>
                    <div className="yf-label" style={{ marginBottom:"0.18rem", fontSize:"0.6rem" }}>{label}</div>
                    <div className="yf-mono" style={{ fontSize:"0.85rem", fontWeight:700, color }}>{value}</div>
                  </div>
                ))}
              </div>

              <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.76rem", color:"var(--t3)", marginBottom:"0.9rem" }}>
                <span>Risk: <span style={{ color:riskColor[pool.risk], fontWeight:600 }}>{pool.risk}</span></span>
              </div>

              <button disabled style={{ width:"100%", padding:"0.72rem", background:"var(--bg-input)", border:"1px solid var(--border)", borderRadius:"10px", color:"var(--t4)", fontFamily:"inherit", fontSize:"0.88rem", cursor:"not-allowed" }}>
                Coming Soon
              </button>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop:"2rem", padding:"1rem 1.5rem", background:"rgba(248,113,113,0.05)", border:"1px solid rgba(248,113,113,0.15)", borderRadius:"12px", fontSize:"0.8rem", color:"var(--t2)", lineHeight:1.6 }}>
        ⚠ <strong style={{color:"var(--red)"}}>Risk Notice:</strong> DeFi protocols carry smart contract risk. Only stake what you can afford to lose. Not financial advice.
      </div>
    </div>
  );
}