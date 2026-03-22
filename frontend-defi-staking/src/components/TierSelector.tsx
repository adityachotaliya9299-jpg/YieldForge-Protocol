"use client";
import { TIERS } from "@/lib/wagmi";
import type { TierId } from "@/lib/wagmi";

interface Props {
  selected: TierId;
  currentTier?: TierId;
  onChange: (tier: TierId) => void;
  disabled?: boolean;
}

export default function TierSelector({ selected, currentTier, onChange, disabled }: Props) {
  return (
    <div>
      <div className="yf-label" style={{ marginBottom:"0.6rem" }}>
        Select Staking Tier
        <span style={{ marginLeft:"0.5rem", fontSize:"0.65rem", color:"var(--t4)", fontWeight:400 }}>
          (Lock longer = higher multiplier)
        </span>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.6rem" }}>
        {TIERS.map(tier => {
          const isSelected   = selected === tier.id;
          const isCurrent    = currentTier !== undefined && currentTier === tier.id;
          const isDowngrade  = currentTier !== undefined && tier.id < currentTier;
          const isDisabled   = disabled || isDowngrade;

          return (
            <button
              key={tier.id}
              disabled={isDisabled}
              onClick={() => onChange(tier.id as TierId)}
              style={{
                padding:"0.85rem 0.75rem",
                background: isSelected ? `${tier.color}18` : "var(--bg-input)",
                border: isSelected
                  ? `1.5px solid ${tier.color}`
                  : isDowngrade
                  ? "1px solid var(--border)"
                  : "1px solid var(--border)",
                borderRadius:"12px",
                cursor: isDisabled ? "not-allowed" : "pointer",
                opacity: isDowngrade ? 0.35 : 1,
                textAlign:"left",
                transition:"all 0.2s",
                position:"relative",
              }}
            >
              {/* Active badge */}
              {isCurrent && (
                <div style={{ position:"absolute", top:"0.4rem", right:"0.45rem", fontSize:"0.58rem", color:tier.color, background:`${tier.color}20`, border:`1px solid ${tier.color}50`, borderRadius:"4px", padding:"1px 5px", fontWeight:700 }}>
                  ACTIVE
                </div>
              )}

              <div style={{ fontSize:"1.2rem", marginBottom:"0.3rem" }}>{tier.emoji}</div>
              <div style={{ fontFamily:"Syne,Georgia,serif", fontSize:"0.88rem", fontWeight:700, color: isSelected ? tier.color : "var(--t1)", marginBottom:"0.15rem" }}>
                {tier.name}
              </div>
              <div style={{ fontSize:"0.7rem", color:"var(--t3)", marginBottom:"0.35rem" }}>
                {tier.lockDays} days lock
              </div>
              <div style={{ display:"inline-flex", alignItems:"center", gap:"0.3rem", padding:"0.18rem 0.5rem", background: isSelected ? `${tier.color}25` : "var(--bg-card)", border:`1px solid ${isSelected ? tier.color + "60" : "var(--border)"}`, borderRadius:"20px" }}>
                <span style={{ fontSize:"0.72rem", fontWeight:700, color: isSelected ? tier.color : "var(--t2)" }}>
                  {tier.multiplier}x rewards
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected tier info */}
      <div style={{ marginTop:"0.6rem", padding:"0.65rem 0.85rem", background:"var(--bg-input)", border:"1px solid var(--border)", borderRadius:"10px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"0.5rem" }}>
        <span style={{ fontSize:"0.78rem", color:"var(--t3)" }}>
          {TIERS[selected].emoji} {TIERS[selected].name} — {TIERS[selected].desc}
        </span>
        <span style={{ fontSize:"0.78rem", fontWeight:700, color:TIERS[selected].color }}>
          {TIERS[selected].multiplier}× multiplier
        </span>
      </div>

      {currentTier !== undefined && currentTier > 0 && (
        <p style={{ fontSize:"0.72rem", color:"var(--t4)", marginTop:"0.4rem" }}>
          ℹ You are on {TIERS[currentTier].name}. You can upgrade but not downgrade.
        </p>
      )}
    </div>
  );
}