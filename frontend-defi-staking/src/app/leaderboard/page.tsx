"use client";
import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useLeaderboard } from "@/hooks/useSubgraph";

const BADGES = ["👑","🥈","🥉","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟"];
const COLORS  = ["var(--yellow)","#aaaaaa","#cd7f32","var(--t2)","var(--t2)","var(--t2)","var(--t2)","var(--t2)","var(--t2)","var(--t2)"];

const FALLBACK = [
  { rank:1, address:"0x72F6...DEF7", staked:"0.010000", rewards:"636.00", share:"100.00", badge:"👑", isYou:true,  color:"var(--yellow)" },
  { rank:2, address:"0xAbC1...2345", staked:"0.000000", rewards:"0.00",   share:"0.00",   badge:"🥈", isYou:false, color:"#aaaaaa" },
  { rank:3, address:"0xDeF2...6789", staked:"0.000000", rewards:"0.00",   share:"0.00",   badge:"🥉", isYou:false, color:"#cd7f32" },
];

export default function LeaderboardPage() {
  const { address }                                   = useAccount();
  const { data: subgraphLeaders, loading: lbLoading } = useLeaderboard(10);
  const [mounted,  setMounted]  = useState(false);
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    setMounted(true);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!mounted) return null;

  if (lbLoading && subgraphLeaders.length === 0) return (
    <div className="yf-page" style={{ display:"flex", justifyContent:"center", alignItems:"center", minHeight:"60vh" }}>
      <div style={{ textAlign:"center", color:"var(--t3)" }}>
        <div style={{ fontSize:"2rem", marginBottom:"0.75rem" }}>⏳</div>
        <div>Loading leaderboard from The Graph…</div>
      </div>
    </div>
  );

  // Build LEADERS inside component so address is in scope
  const LEADERS = subgraphLeaders.length > 0
    ? subgraphLeaders.map((s, i) => ({
        rank:    i + 1,
        address: `${s.address.slice(0,6)}...${s.address.slice(-4)}`,
        staked:  Number(s.stakedAmount).toFixed(6),
        rewards: Number(s.totalRewardsClaimed).toFixed(2),
        share:   "—",
        badge:   BADGES[i] ?? "⭐",
        isYou:   address ? address.toLowerCase() === s.address.toLowerCase() : false,
        color:   COLORS[i] ?? "var(--t2)",
      }))
    : FALLBACK;

  const displayAddr = (l: typeof LEADERS[0]) =>
    l.isYou && address ? `${address.slice(0,6)}…${address.slice(-4)}` : l.address;

   const EMPTY = { rank:0, address:"—", staked:"0.000000", rewards:"0.00", share:"0.00", badge:"⭐", isYou:false, color:"var(--t4)" };
  const L0 = LEADERS[0] ?? EMPTY;
  const L1 = LEADERS[1] ?? EMPTY;
  const L2 = LEADERS[2] ?? EMPTY;

  const podiumOrder = isMobile
    ? [L0, L1, L2]
    : [L1, L0, L2];
  const podiumHeights = isMobile
    ? ["auto","auto","auto"]
    : ["160px","200px","140px"];

  return (
    <div className="yf-page">
      <div className="yf-page-header">
        <h1 className="yf-page-title">🏆 Leaderboard</h1>
        <p className="yf-sub">Top stakers ranked by staked amount. Updated every block.</p>
      </div>

      {/* Podium */}
      <div style={{ display:"grid", gridTemplateColumns: isMobile?"1fr":"1fr 1.2fr 1fr", gap:"1rem", marginBottom:"2rem", alignItems: isMobile?"stretch":"end" }}>
        {podiumOrder.map((l, i) => {
          const cardStyle: React.CSSProperties = {
            padding:"1.5rem",
            minHeight: isMobile ? "auto" : podiumHeights[i],
            borderTop:`3px solid ${l.color}`,
            display:"flex",
            flexDirection: isMobile ? "row" : "column",
            alignItems:"center",
            justifyContent: isMobile ? "flex-start" : "center",
            gap:"0.4rem",
            textAlign: isMobile ? "left" : "center",
          };
          return (
            <div key={`${l.rank}-${i}`} className="yf-card" style={cardStyle}>
              <div style={{ fontSize: isMobile?"1.6rem":"1.8rem", flexShrink:0, marginRight: isMobile?"0.75rem":0 }}>
                {l.badge}
              </div>
              <div style={{ flex: isMobile ? 1 : undefined, minWidth:0 }}>
                <div style={{ fontSize:"0.62rem", fontWeight:700, letterSpacing:"0.1em", color:l.color, marginBottom:"0.2rem" }}>
                  RANK #{l.rank}
                </div>
                <div className="yf-mono" style={{ fontSize:"0.8rem", color: l.isYou?"var(--green)":"var(--t3)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {displayAddr(l)}
                </div>
                <div className="yf-mono" style={{ fontSize: isMobile?"0.95rem":"1rem", fontWeight:700, color:l.color, margin: isMobile?"0.1rem 0":"0.3rem 0" }}>
                  {l.staked} STK
                </div>
                <div style={{ fontSize:"0.72rem", color:"var(--t4)" }}>{l.share}% of pool</div>
                {l.isYou && (
                  <span style={{ fontSize:"0.65rem", color:"var(--green)", background:"rgba(0,200,100,0.1)", border:"1px solid rgba(0,200,100,0.25)", borderRadius:"4px", padding:"1px 7px", display:"inline-block", marginTop:"0.25rem" }}>
                    You
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="yf-card" style={{ overflow:"hidden" }}>
        <div style={{ display:"grid", gridTemplateColumns:"44px 1fr 100px 100px 70px", padding:"0.75rem 1rem", background:"var(--bg-input)", borderBottom:"1px solid var(--border)", fontSize:"0.65rem", textTransform:"uppercase", letterSpacing:"0.08em", color:"var(--t4)", fontWeight:600, gap:"0.5rem" }}>
          <span>#</span>
          <span>Address</span>
          <span style={{ textAlign:"right" }}>Staked</span>
          <span style={{ textAlign:"right" }}>Rewards</span>
          <span style={{ textAlign:"right" }}>Share</span>
        </div>
        {LEADERS.map((l, i) => (
          <div key={l.rank} style={{ display:"grid", gridTemplateColumns:"44px 1fr 100px 100px 70px", padding:"0.9rem 1rem", borderBottom: i<LEADERS.length-1?"1px solid var(--border)":"none", background: l.isYou?"rgba(0,200,100,0.04)":"transparent", alignItems:"center", gap:"0.5rem" }}>
            <span style={{ fontSize:"1rem", lineHeight:1 }}>{l.badge}</span>
            <div style={{ display:"flex", alignItems:"center", gap:"0.4rem", minWidth:0 }}>
              <span className="yf-mono" style={{ fontSize:"0.8rem", color: l.isYou?"var(--green)":"var(--t2)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {displayAddr(l)}
              </span>
              {l.isYou && (
                <span style={{ fontSize:"0.6rem", color:"var(--green)", background:"rgba(0,200,100,0.1)", border:"1px solid rgba(0,200,100,0.25)", borderRadius:"3px", padding:"0 4px", flexShrink:0 }}>
                  You
                </span>
              )}
            </div>
            <span className="yf-mono" style={{ fontSize:"0.8rem", color:"var(--t2)", textAlign:"right", whiteSpace:"nowrap" }}>{l.staked}</span>
            <span className="yf-mono" style={{ fontSize:"0.8rem", color:"var(--green)", textAlign:"right", whiteSpace:"nowrap" }}>{l.rewards} RWD</span>
            <span className="yf-mono" style={{ fontSize:"0.8rem", color:"var(--t3)", textAlign:"right", whiteSpace:"nowrap" }}>{l.share}%</span>
          </div>
        ))}
      </div>

      <p style={{ textAlign:"center", fontSize:"0.78rem", color:"var(--t4)", marginTop:"1.5rem" }}>
        {subgraphLeaders.length > 0
          ? `✅ Live data from The Graph · ${subgraphLeaders.length} stakers indexed`
          : "⏳ Subgraph syncing — showing cached data"}
      </p>
    </div>
  );
}