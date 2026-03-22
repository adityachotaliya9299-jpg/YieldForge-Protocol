"use client";
import { useState, useEffect } from "react";
import { useAccount, useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { useStaking } from "@/hooks/useStaking";
import Link from "next/link";
import Image from "next/image";

const fmt  = (n: string|number, dp=4) => Number(n).toLocaleString("en-US",{maximumFractionDigits:dp});
const fmtK = (n: number) => n>=1_000_000?`${(n/1_000_000).toFixed(2)}M`:n>=1_000?`${(n/1_000).toFixed(1)}K`:n.toFixed(4);
const TOKEN_PRICE = 0.024;

function aprFmt(v: number){ if(v>=1_000_000_000)return{t:`${(v/1_000_000_000).toFixed(1)}B%`,c:"var(--yellow)"}; if(v>=1_000_000)return{t:`${(v/1_000_000).toFixed(1)}M%`,c:"var(--yellow)"}; if(v>=1_000)return{t:`${(v/1_000).toFixed(1)}K%`,c:"var(--yellow)"}; if(v>0)return{t:`${fmt(v,2)}%`,c:"var(--green)"}; return{t:"Loading…",c:"var(--t4)"}; }

export default function DashboardPage() {
  const { isConnected } = useAccount();
  const { connect }     = useConnect();
  const [mounted, setMounted] = useState(false);
  useEffect(()=>setMounted(true),[]);
  const { stkBalance,rwdBalance,stakedAmount,pendingRewards,totalStaked,aprPercent,isLocked } = useStaking();
  const apr = aprFmt(aprPercent);

  return (
    <div className="yf-page">
      {/* ── Hero ── */}
      <section className="grid-hero" style={{ padding:"3rem 0 2.5rem" }}>
        {/* Left */}
        <div>
          <div style={{ display:"inline-flex", alignItems:"center", gap:"0.4rem", padding:"0.3rem 0.8rem", background:"rgba(0,200,100,0.08)", border:"1px solid rgba(0,200,100,0.2)", borderRadius:"20px", marginBottom:"1.25rem" }}>
            <div className="pulse section-live-dot" />
            <span style={{ fontSize:"0.68rem", color:"var(--green)", letterSpacing:"0.12em", fontWeight:600 }}>LIVE ON SEPOLIA TESTNET</span>
          </div>
          <h1 className="yf-h1" style={{ marginBottom:"1rem" }}>
            Stake <span className="gradient-text">STK</span>.<br/>
            Earn <span className="gradient-text">RWD</span>.
          </h1>
          <p style={{ fontSize:"0.92rem", color:"var(--t3)", lineHeight:1.8, marginBottom:"1.75rem", maxWidth:"420px" }}>
            Non-custodial yield farming. Stake tokens, earn rewards every second, withdraw after the 7-day lock.
          </p>
          <div className="hero-actions">
            <Link href="/stake" className="btn-primary">Start Staking →</Link>
            <Link href="/pools" className="btn-outline">View Pools</Link>
            <a href="https://sepolia.etherscan.io/address/0x84b969e7c086Ae80498e46d139F1efF10Ad8e409"
              target="_blank" rel="noopener noreferrer" className="btn-ghost">Contract ↗</a>
          </div>
        </div>

        {/* Right — Stats card */}
        <div className="yf-card hero-stats-card" style={{ padding:"1.75rem" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"0.65rem", marginBottom:"1.25rem", paddingBottom:"1rem", borderBottom:"1px solid var(--border)" }}>
            <div style={{ width:"40px", height:"40px", flexShrink:0, borderRadius:"10px", overflow:"hidden", background:"rgba(0,200,100,0.1)", border:"1px solid rgba(0,200,100,0.2)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Image src="/logo.png" alt="YieldForge" width={34} height={34} style={{ objectFit:"contain" }} />
            </div>
            <div style={{ minWidth:0 }}>
              <div style={{ fontFamily:"Syne,Georgia,serif", fontSize:"0.9rem", fontWeight:800, color:"var(--t1)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>YieldForge Protocol</div>
              <div style={{ fontSize:"0.55rem", color:"var(--green)", letterSpacing:"0.12em" }}>FORGE YOUR YIELD</div>
            </div>
          </div>
          {[
            { label:"Total Value Locked", value:`${fmtK(Number(totalStaked))} STK`, sub:`≈ $${fmt(Number(totalStaked)*TOKEN_PRICE,2)}`, color:"var(--green)" },
            { label:"Current APR",        value:apr.t, sub: aprPercent>999999?"*Low TVL":"Annual yield",                                 color:apr.c },
            { label:"Lock Period",        value:"7 Days",  sub:"From last stake",   color:"var(--t1)" },
            { label:"Reward Token",       value:"RWD",     sub:"Per second",         color:"var(--purple)" },
          ].map(({ label, value, sub, color }) => (
            <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"0.65rem 0", borderBottom:"1px solid var(--border)", gap:"0.5rem" }}>
              <span className="yf-label" style={{ marginBottom:0, flexShrink:0 }}>{label}</span>
              <div style={{ textAlign:"right", minWidth:0 }}>
                <div className="yf-mono" style={{ fontSize:"0.9rem", fontWeight:700, color, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{value}</div>
                <div style={{ fontSize:"0.65rem", color:"var(--t4)" }}>{sub}</div>
              </div>
            </div>
          ))}
          <Link href="/stake" className="btn-primary btn-full" style={{ marginTop:"1.1rem", display:"block" }}>Stake Now →</Link>
        </div>
      </section>

      {/* ── Portfolio ── */}
      {mounted && isConnected && (
        <section style={{ marginBottom:"2.5rem" }}>
          <h2 className="yf-h2" style={{ marginBottom:"1.1rem" }}>Your Portfolio</h2>
          <div className="grid-4">
            {[
              { label:"Wallet Balance",  value:`${fmtK(Number(stkBalance))} STK`,    sub:`$${fmt(Number(stkBalance)*TOKEN_PRICE,2)}`,   color:"var(--blue)" },
              { label:"Staked Amount",   value:`${fmtK(Number(stakedAmount))} STK`,  sub:isLocked?"🔒 Locked":"✓ Unlocked",             color:"var(--green)" },
              { label:"Pending Rewards", value:`${fmtK(Number(pendingRewards))} RWD`,sub:`$${fmt(Number(pendingRewards)*TOKEN_PRICE,2)}`,color:"var(--purple)" },
              { label:"RWD Balance",     value:`${fmtK(Number(rwdBalance))} RWD`,    sub:`$${fmt(Number(rwdBalance)*TOKEN_PRICE,2)}`,    color:"var(--yellow)" },
            ].map(({ label, value, sub, color }) => (
              <div key={label} className="yf-card" style={{ padding:"1.1rem", borderTop:`2px solid ${color}` }}>
                <div className="yf-label" style={{ marginBottom:"0.35rem" }}>{label}</div>
                <div className="yf-mono" style={{ fontSize:"0.95rem", fontWeight:700, color, marginBottom:"0.2rem" }}>{value}</div>
                <div style={{ fontSize:"0.7rem", color:"var(--t4)" }}>{sub}</div>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:"0.85rem", marginTop:"1.1rem", flexWrap:"wrap" }}>
            <Link href="/stake"    className="btn-primary">Manage Staking →</Link>
            <Link href="/analytics" className="btn-ghost">Analytics →</Link>
          </div>
        </section>
      )}

      {/* ── Features ── */}
      <section style={{ marginBottom:"2.5rem" }}>
        <h2 className="yf-h2" style={{ marginBottom:"1.1rem" }}>Protocol Features</h2>
        <div className="grid-3">
          {[
            { icon:"🔒", title:"Secure Staking",    desc:"Non-custodial. OpenZeppelin audited contracts.", color:"var(--green)",  href:"/stake" },
            { icon:"📈", title:"Real-time Rewards", desc:"Earn RWD every second proportional to your stake.", color:"var(--blue)",  href:"/stake" },
            { icon:"🏊", title:"Multiple Pools",    desc:"STK, ETH, USDC pools with different multipliers.", color:"var(--purple)",href:"/pools" },
            { icon:"📊", title:"Analytics",         desc:"Track TVL, APR trends and earnings with charts.", color:"var(--yellow)",href:"/analytics" },
            { icon:"🏛", title:"Governance DAO",    desc:"Vote on protocol changes with staked STK.", color:"var(--red)",   href:"/governance" },
            { icon:"🏆", title:"Leaderboard",       desc:"Compete with other stakers for top positions.", color:"var(--green)", href:"/leaderboard" },
          ].map(({ icon, title, desc, color, href }) => (
            <Link key={title} href={href} className="yf-card yf-card-hover" style={{ textDecoration:"none", display:"block", padding:"1.25rem" }}>
              <div style={{ fontSize:"1.3rem", marginBottom:"0.55rem" }}>{icon}</div>
              <div style={{ fontFamily:"Syne,Georgia,serif", fontSize:"0.9rem", fontWeight:700, color:"var(--t1)", marginBottom:"0.35rem" }}>{title}</div>
              <div style={{ fontSize:"0.76rem", color:"var(--t3)", lineHeight:1.6, marginBottom:"0.55rem" }}>{desc}</div>
              <span style={{ fontSize:"0.7rem", color, fontWeight:600 }}>Explore →</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section style={{ marginBottom:"2.5rem" }}>
        <h2 className="yf-h2" style={{ marginBottom:"1.1rem" }}>How It Works</h2>
        <div className="grid-steps">
          {[
            { step:"01", title:"Approve STK",      desc:"One-time token approval for the staking contract." },
            { step:"02", title:"Stake Tokens",     desc:"Deposit STK. 7-day lock window starts." },
            { step:"03", title:"Earn Rewards",     desc:"RWD accrues every second, proportionally." },
            { step:"04", title:"Withdraw & Claim", desc:"After 7 days, exit with tokens + rewards." },
          ].map(({ step, title, desc }, i) => (
            <div key={step} style={{ display:"contents" }}>
              <div className="yf-card" style={{ padding:"1.1rem" }}>
                <div style={{ fontSize:"0.65rem", fontWeight:800, letterSpacing:"0.15em", color:"var(--green)", marginBottom:"0.4rem" }}>{step}</div>
                <div style={{ fontFamily:"Syne,Georgia,serif", fontSize:"0.88rem", fontWeight:700, color:"var(--t1)", marginBottom:"0.3rem" }}>{title}</div>
                <div style={{ fontSize:"0.74rem", color:"var(--t3)", lineHeight:1.6 }}>{desc}</div>
              </div>
              {i<3 && <div className="step-arrow">→</div>}
            </div>
          ))}
        </div>
      </section>

      {/* ── Connect CTA ── */}
      {mounted && !isConnected && (
        <section style={{ display:"flex", justifyContent:"center" }}>
          <div className="yf-card" style={{ textAlign:"center", padding:"2.5rem 2rem", maxWidth:"420px", width:"100%", border:"1px solid var(--border-green)" }}>
            <div style={{ width:"52px", height:"52px", flexShrink:0, borderRadius:"13px", overflow:"hidden", margin:"0 auto 1.1rem", background:"rgba(0,200,100,0.1)", border:"1px solid rgba(0,200,100,0.2)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Image src="/logo.png" alt="YieldForge" width={44} height={44} style={{ objectFit:"contain" }} />
            </div>
            <h3 className="yf-h3" style={{ marginBottom:"0.55rem" }}>Start Forging Your Yield</h3>
            <p style={{ fontSize:"0.83rem", color:"var(--t3)", lineHeight:1.7, marginBottom:"1.5rem" }}>
              Connect your wallet to access staking, analytics, governance, and more.
            </p>
            <button onClick={() => connect({ connector: injected() })} className="btn-primary btn-full">
              Connect Wallet
            </button>
          </div>
        </section>
      )}
    </div>
  );
}