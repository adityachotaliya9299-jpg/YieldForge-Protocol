"use client";
import { useState } from "react";
import { TIERS } from "@/lib/wagmi";
import type { TierId } from "@/lib/wagmi";

interface Props { aprPercent: number; tokenPrice?: number; selectedTier?: TierId; }

export default function EarningsSimulator({ aprPercent, tokenPrice = 1, selectedTier = 0 }: Props) {
  const [amount, setAmount] = useState("1000");
  const [tier,   setTier]   = useState<TierId>(selectedTier);

  const apr        = Math.min(aprPercent, 999999);
  const multiplier = TIERS[tier].multiplier;
  const feePct     = 0.05; // 5% performance fee
  const periods    = [
    { label:"7 Days",  days:7   },
    { label:"30 Days", days:30  },
    { label:"90 Days", days:90  },
    { label:"1 Year",  days:365 },
  ];

  return (
    <div className="yf-card" style={{ padding:"1.75rem" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"1.1rem" }}>
        <h3 className="yf-h3">💰 Earnings Simulator</h3>
        <span style={{ fontSize:"0.7rem", color:"var(--t4)" }}>Estimated only</span>
      </div>

      {/* Amount input */}
      <div style={{ marginBottom:"0.85rem" }}>
        <div className="yf-label" style={{ marginBottom:"0.4rem" }}>If you stake</div>
        <div style={{ display:"flex", gap:"0.5rem", alignItems:"center" }}>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
            className="yf-input" style={{ flex:1 }} placeholder="1000" />
          <span className="yf-mono" style={{ fontSize:"0.8rem", color:"var(--t3)", fontWeight:700 }}>STK</span>
        </div>
        {tokenPrice > 0 && (
          <p style={{ fontSize:"0.72rem", color:"var(--t4)", marginTop:"0.25rem" }}>
            ≈ ${(Number(amount) * tokenPrice).toLocaleString("en-US", { maximumFractionDigits:2 })} USD
          </p>
        )}
      </div>

      {/* Tier picker */}
      <div style={{ marginBottom:"1rem" }}>
        <div className="yf-label" style={{ marginBottom:"0.4rem" }}>With tier</div>
        <div style={{ display:"flex", gap:"0.4rem" }}>
          {TIERS.map(t => (
            <button key={t.id} onClick={() => setTier(t.id as TierId)}
              style={{ flex:1, padding:"0.4rem 0.25rem", background: tier===t.id ? `${t.color}18` : "var(--bg-input)", border: tier===t.id ? `1.5px solid ${t.color}` : "1px solid var(--border)", borderRadius:"8px", cursor:"pointer", fontSize:"0.72rem", color: tier===t.id ? t.color : "var(--t3)", fontWeight: tier===t.id ? 700 : 400 }}>
              {t.emoji} {t.name}
            </button>
          ))}
        </div>
        <div style={{ marginTop:"0.35rem", fontSize:"0.72rem", color:TIERS[tier].color, fontWeight:600 }}>
          {TIERS[tier].multiplier}× multiplier · {TIERS[tier].lockDays} day lock
        </div>
      </div>

      {/* Results grid */}
      <div className="earnings-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.6rem" }}>
        {periods.map(({ label, days }) => {
          const base     = Number(amount) * (apr / 100) * (days / 365);
          const boosted  = base * multiplier;
          const afterFee = boosted * (1 - feePct);
          const usd      = afterFee * tokenPrice;
          return (
            <div key={label} style={{ padding:"0.85rem", background:`${TIERS[tier].color}0d`, border:`1px solid ${TIERS[tier].color}30`, borderRadius:"12px" }}>
              <div className="yf-label" style={{ marginBottom:"0.25rem", fontSize:"0.6rem" }}>{label}</div>
              <div className="yf-mono" style={{ fontSize:"0.9rem", fontWeight:700, color:TIERS[tier].color }}>
                +{afterFee.toLocaleString("en-US", { maximumFractionDigits:2 })} RWD
              </div>
              {tokenPrice > 0 && (
                <div style={{ fontSize:"0.68rem", color:"var(--t4)", marginTop:"0.1rem" }}>
                  ≈ ${usd.toLocaleString("en-US", { maximumFractionDigits:2 })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Fee breakdown */}
      <div style={{ marginTop:"0.75rem", padding:"0.6rem 0.85rem", background:"var(--bg-input)", border:"1px solid var(--border)", borderRadius:"8px", fontSize:"0.73rem", color:"var(--t3)", display:"flex", flexDirection:"column", gap:"0.2rem" }}>
        <div style={{ display:"flex", justifyContent:"space-between" }}>
          <span>Base APR</span><span className="yf-mono">{apr > 999999 ? `${(apr/1_000_000).toFixed(1)}M%` : `${apr.toFixed(2)}%`}</span>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between" }}>
          <span>Tier multiplier</span><span className="yf-mono" style={{ color:TIERS[tier].color }}>{multiplier}×</span>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between" }}>
          <span>Performance fee</span><span className="yf-mono" style={{ color:"var(--red)" }}>−5%</span>
        </div>
      </div>

      <p style={{ fontSize:"0.68rem", color:"var(--t4)", marginTop:"0.65rem", lineHeight:1.5 }}>
        ⚠ Estimates only. APR changes as total staked changes.
      </p>
    </div>
  );
}