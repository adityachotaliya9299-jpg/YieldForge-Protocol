"use client";
import { useState } from "react";

interface APRDisplayProps {
  aprPercent:   number;
  totalStaked:  number;
  compact?:     boolean;
}

export default function APRDisplay({ aprPercent, totalStaked, compact = false }: APRDisplayProps) {
  const [showTip, setShowTip] = useState(false);

  // Realistic APR at different TVL milestones
  const at10K   = (86400 * 0.001 * 365 * 100) / 10_000;
  const at100K  = (86400 * 0.001 * 365 * 100) / 100_000;
  const at1M    = (86400 * 0.001 * 365 * 100) / 1_000_000;

  const isInflated = aprPercent > 500;
  const isLowTVL   = totalStaked < 1000;

  // What to show on UI — capped at 500% with "+" suffix
  const displayAPR = isInflated
    ? `${Math.min(at10K, 500).toFixed(0)}–${Math.min(aprPercent, 9999).toFixed(0)}%`
    : `${aprPercent.toFixed(2)}%`;

  const color = isInflated ? "var(--yellow)" : aprPercent > 100 ? "var(--green)" : "var(--blue)";

  if (compact) {
    return (
      <span style={{ color, fontWeight:700, fontFamily:"IBM Plex Mono,monospace", cursor:isInflated?"help":"default" }}
        title={isInflated ? `APR decreases as TVL grows. At $1M TVL: ~${at1M.toFixed(1)}%` : undefined}>
        {displayAPR}
        {isInflated && " ↑"}
      </span>
    );
  }

  return (
    <div style={{ position:"relative" }}>
      {/* Main display */}
      <div style={{ display:"flex", alignItems:"flex-start", gap:"0.5rem" }}>
        <div>
          <div className="yf-mono" style={{ fontSize:"1.8rem", fontWeight:800, color, lineHeight:1 }}>
            {isInflated ? `${Math.min(aprPercent, 9999).toFixed(0)}%` : displayAPR}
          </div>
          {isInflated && (
            <div style={{ fontSize:"0.68rem", color:"var(--yellow)", marginTop:"0.2rem", fontWeight:600 }}>
              ⚠ High due to low liquidity
            </div>
          )}
        </div>

        {/* Info icon */}
        <button
          onClick={() => setShowTip(s => !s)}
          style={{ marginTop:"0.3rem", width:"18px", height:"18px", borderRadius:"50%", background:"var(--bg-input)", border:"1px solid var(--border)", color:"var(--t3)", fontSize:"0.65rem", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          ?
        </button>
      </div>

      {/* Tooltip */}
      {showTip && (
        <div style={{ position:"absolute", top:"100%", left:0, marginTop:"0.5rem", width:"260px", background:"var(--bg-card)", border:"1px solid var(--border-green)", borderRadius:"12px", padding:"1rem", zIndex:50, boxShadow:"0 8px 32px rgba(0,0,0,0.2)" }}>
          <div style={{ fontSize:"0.8rem", fontWeight:700, color:"var(--t1)", marginBottom:"0.6rem" }}>
            📊 APR decreases as TVL grows
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:"0.35rem", marginBottom:"0.6rem" }}>
            {[
              { tvl:"10K STK",  apr: at10K  },
              { tvl:"100K STK", apr: at100K },
              { tvl:"1M STK",   apr: at1M   },
            ].map(({ tvl, apr }) => (
              <div key={tvl} style={{ display:"flex", justifyContent:"space-between", fontSize:"0.75rem" }}>
                <span style={{ color:"var(--t3)" }}>At {tvl} TVL:</span>
                <span className="yf-mono" style={{ color:"var(--green)", fontWeight:600 }}>~{apr.toFixed(0)}% APR</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize:"0.72rem", color:"var(--t4)", lineHeight:1.5, borderTop:"1px solid var(--border)", paddingTop:"0.5rem" }}>
            Current TVL: <strong style={{ color:"var(--t2)" }}>{totalStaked.toFixed(2)} STK</strong><br/>
            APR normalises as more users stake. Early stakers benefit most.
          </div>
          <button onClick={() => setShowTip(false)}
            style={{ position:"absolute", top:"0.5rem", right:"0.5rem", background:"none", border:"none", color:"var(--t4)", cursor:"pointer", fontSize:"0.85rem" }}>
            ✕
          </button>
        </div>
      )}

      {/* APR bar */}
      <div style={{ marginTop:"0.55rem", height:"6px", background:"var(--bg-input)", borderRadius:"99px", overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${Math.min((Math.min(aprPercent,500)/500)*100, 100)}%`, background:`linear-gradient(90deg,${color},var(--blue))`, borderRadius:"99px" }}/>
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.67rem", color:"var(--t4)", marginTop:"0.25rem" }}>
        <span>0%</span><span>500%+</span>
      </div>
    </div>
  );
}