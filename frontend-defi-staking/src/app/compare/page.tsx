"use client";
import { useState } from "react";
import Link from "next/link";

const PROTOCOLS = [
  {
    name: "Lido",
    logo: "🔵",
    desc: "Liquid ETH staking",
    color: "#00a3ff",
  },
  {
    name: "Convex",
    logo: "🔴",
    desc: "Curve boost aggregator",
    color: "#ff5a5a",
  },
  {
    name: "Yearn",
    logo: "🔵",
    desc: "Yield strategy vaults",
    color: "#0657f9",
  },
  {
    name: "YieldForge",
    logo: "🟢",
    desc: "Tiered staking + governance",
    color: "#00ffa3",
    isUs: true,
  },
];

const FEATURES = [
  {
    category: "Staking",
    rows: [
      { label: "Lock tiers (higher lock = more reward)", lido: false, convex: false, yearn: false, us: true  },
      { label: "Any ERC20 token",                        lido: false, convex: false, yearn: true,  us: true  },
      { label: "No minimum stake",                       lido: false, convex: true,  yearn: true,  us: true  },
      { label: "Auto-compound vault",                    lido: true,  convex: true,  yearn: true,  us: true  },
      { label: "0% deposit/withdrawal fee",              lido: false, convex: false, yearn: false, us: true  },
    ],
  },
  {
    category: "Rewards",
    rows: [
      { label: "NFT boost system",                       lido: false, convex: false, yearn: false, us: true  },
      { label: "Referral bonus (3%)",                    lido: false, convex: false, yearn: false, us: true  },
      { label: "Real-time per-second accrual",           lido: true,  convex: false, yearn: false, us: true  },
      { label: "Multiplier up to 3×",                   lido: false, convex: false, yearn: false, us: true  },
      { label: "Performance fee < 10%",                  lido: false, convex: false, yearn: false, us: true  },
    ],
  },
  {
    category: "Governance",
    rows: [
      { label: "Vote-escrowed governance",               lido: false, convex: true,  yearn: false, us: true  },
      { label: "Accessible (no $1000+ token)",           lido: true,  convex: true,  yearn: false, us: true  },
      { label: "On-chain timelock execution",            lido: true,  convex: true,  yearn: true,  us: true  },
      { label: "DAO proposal creation",                  lido: true,  convex: true,  yearn: true,  us: true  },
    ],
  },
  {
    category: "Transparency",
    rows: [
      { label: "All contracts verified on Etherscan",    lido: true,  convex: true,  yearn: true,  us: true  },
      { label: "No hidden strategies",                   lido: true,  convex: false, yearn: false, us: true  },
      { label: "Honest APR display with tooltip",        lido: false, convex: false, yearn: false, us: true  },
      { label: "Open source",                            lido: true,  convex: true,  yearn: true,  us: true  },
    ],
  },
];

const ADVANTAGES = [
  {
    icon: "🎯",
    title: "Tiered Commitment Rewards",
    desc: "Unlike Lido which gives the same APR to everyone, YieldForge rewards longer commitment with 1× to 3× multipliers. Patient holders earn significantly more.",
    color: "var(--green)",
  },
  {
    icon: "🎨",
    title: "NFT Boost System (Capped)",
    desc: "Soulbound NFTs grant +10% to +50% boost. Capped at +50% max so it's never pay-to-win. No protocol offers this combination of NFT utility + fairness.",
    color: "var(--purple)",
  },
  {
    icon: "🏛",
    title: "Accessible Governance",
    desc: "veSTK governance starts from your first STK. Yearn's YFI costs thousands. YieldForge lowers the barrier so every staker has a voice.",
    color: "var(--blue)",
  },
  {
    icon: "📊",
    title: "Honest APR Display",
    desc: "We show realistic APR with tooltips explaining TVL dependency. No misleading \"estimated\" labels hiding inflated numbers.",
    color: "var(--yellow)",
  },
  {
    icon: "🔗",
    title: "Referral Economy",
    desc: "3% referral bonuses create organic community growth. Users are incentivized to bring others — a mechanism Lido, Convex, and Yearn don't have.",
    color: "var(--green)",
  },
  {
    icon: "💎",
    title: "Zero Hidden Fees",
    desc: "0% deposit fee, 0% withdrawal fee. Only a transparent 5% performance fee on claimed rewards — clearly shown before every claim.",
    color: "var(--blue)",
  },
];

export default function ComparePage() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="yf-page">
      <div className="yf-page-header">
        <h1 className="yf-page-title">⚔️ Why YieldForge Wins</h1>
        <p className="yf-sub">See how YieldForge compares to the biggest DeFi staking protocols.</p>
      </div>

      {/* Hero win cards */}
      <div className="grid-3" style={{ marginBottom:"2.5rem" }}>
        {[
          { icon:"🥇", title:"Best Multipliers", stat:"Up to 3×", desc:"vs 1× on Lido", color:"var(--yellow)" },
          { icon:"💰", title:"Lowest Fees",       stat:"0% deposit", desc:"vs 0.1–2% elsewhere", color:"var(--green)" },
          { icon:"🎨", title:"Most Features",     stat:"NFT + Referrals", desc:"Unique to YieldForge", color:"var(--purple)" },
        ].map(({ icon, title, stat, desc, color }) => (
          <div key={title} className="yf-card" style={{ padding:"1.5rem", textAlign:"center", borderTop:`3px solid ${color}` }}>
            <div style={{ fontSize:"2rem", marginBottom:"0.5rem" }}>{icon}</div>
            <div style={{ fontFamily:"Syne,Georgia,serif", fontSize:"0.9rem", fontWeight:700, color:"var(--t1)", marginBottom:"0.25rem" }}>{title}</div>
            <div className="yf-mono" style={{ fontSize:"1.3rem", fontWeight:800, color, marginBottom:"0.15rem" }}>{stat}</div>
            <div style={{ fontSize:"0.75rem", color:"var(--t4)" }}>{desc}</div>
          </div>
        ))}
      </div>

      {/* Comparison table */}
      <div className="yf-card" style={{ padding:"1.75rem", marginBottom:"2rem", overflow:"auto" }}>
        <h2 className="yf-h2" style={{ marginBottom:"1.5rem" }}>Feature Comparison</h2>

        {/* Category tabs */}
        <div style={{ display:"flex", gap:"0.4rem", marginBottom:"1.25rem", flexWrap:"wrap" }}>
          {FEATURES.map((f, i) => (
            <button key={i} onClick={() => setActiveTab(i)}
              style={{ padding:"0.45rem 1rem", background: activeTab===i ? "rgba(0,200,100,0.1)" : "var(--bg-input)", border: activeTab===i ? "1px solid rgba(0,200,100,0.35)" : "1px solid var(--border)", borderRadius:"8px", color: activeTab===i ? "var(--green)" : "var(--t3)", fontFamily:"inherit", fontSize:"0.82rem", cursor:"pointer", fontWeight: activeTab===i ? 600 : 400 }}>
              {f.category}
            </button>
          ))}
        </div>

        {/* Table */}
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", minWidth:"500px" }}>
            <thead>
              <tr>
                <th style={{ textAlign:"left", padding:"0.75rem 1rem", fontSize:"0.72rem", color:"var(--t4)", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em", borderBottom:"1px solid var(--border)", width:"40%" }}>
                  Feature
                </th>
                {PROTOCOLS.map(p => (
                  <th key={p.name} style={{ textAlign:"center", padding:"0.75rem 0.5rem", fontSize:"0.82rem", fontWeight:700, color: p.isUs ? "var(--green)" : "var(--t2)", borderBottom:`2px solid ${p.isUs ? "var(--green)" : "var(--border)"}`, background: p.isUs ? "rgba(0,200,100,0.04)" : "transparent" }}>
                    {p.logo} {p.name}
                    {p.isUs && <div style={{ fontSize:"0.58rem", color:"var(--green)", letterSpacing:"0.1em" }}>← YOU ARE HERE</div>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURES[activeTab].rows.map((row, i) => (
                <tr key={i} style={{ background: i%2===0 ? "transparent" : "rgba(128,128,128,0.03)" }}>
                  <td style={{ padding:"0.75rem 1rem", fontSize:"0.82rem", color:"var(--t2)", borderBottom:"1px solid var(--border)" }}>
                    {row.label}
                  </td>
                  {[row.lido, row.convex, row.yearn, row.us].map((val, j) => (
                    <td key={j} style={{ textAlign:"center", padding:"0.75rem 0.5rem", borderBottom:"1px solid var(--border)", background: j===3 && val ? "rgba(0,200,100,0.04)" : "transparent" }}>
                      {val
                        ? <span style={{ color:"var(--green)", fontSize:"1rem" }}>✅</span>
                        : <span style={{ color:"var(--t4)", fontSize:"0.9rem" }}>—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6 Advantages */}
      <h2 className="yf-h2" style={{ marginBottom:"1.25rem" }}>6 Unique Advantages</h2>
      <div className="grid-3" style={{ marginBottom:"2.5rem" }}>
        {ADVANTAGES.map(({ icon, title, desc, color }) => (
          <div key={title} className="yf-card yf-card-hover" style={{ padding:"1.5rem" }}>
            <div style={{ width:"44px", height:"44px", borderRadius:"12px", background:`${color}15`, border:`1px solid ${color}30`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.3rem", marginBottom:"0.85rem" }}>
              {icon}
            </div>
            <div style={{ fontFamily:"Syne,Georgia,serif", fontSize:"0.95rem", fontWeight:700, color:"var(--t1)", marginBottom:"0.4rem" }}>{title}</div>
            <div style={{ fontSize:"0.78rem", color:"var(--t3)", lineHeight:1.7 }}>{desc}</div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="yf-card" style={{ padding:"2.5rem", textAlign:"center", border:"1px solid var(--border-green)" }}>
        <h2 className="yf-h2" style={{ marginBottom:"0.6rem" }}>Ready to Forge Your Yield?</h2>
        <p style={{ fontSize:"0.88rem", color:"var(--t3)", marginBottom:"1.75rem", maxWidth:"420px", margin:"0 auto 1.75rem" }}>
          Start earning multiplied rewards today. Lock longer, earn more, vote on the protocol's future.
        </p>
        <div style={{ display:"flex", gap:"1rem", justifyContent:"center", flexWrap:"wrap" }}>
          <Link href="/stake"  className="btn-primary">Start Staking →</Link>
          <Link href="/faucet" className="btn-outline">Get Free STK Tokens</Link>
        </div>
      </div>
    </div>
  );
}