"use client";
import { useState, useEffect } from "react";
import { useAccount, useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { useStaking } from "@/hooks/useStaking";
import { useToast } from "@/components/Toast";
import { formatDuration } from "@/lib/utils";
import { TIERS } from "@/lib/wagmi";
import type { TierId } from "@/lib/wagmi";
import TierSelector from "@/components/TierSelector";
import EarningsSimulator from "@/components/EarningsSimulator";
import TransactionHistory from "@/components/TransactionHistory";
import APRDisplay from "@/components/APRDisplay";

const fmt  = (n:string|number,dp=4) => Number(n).toLocaleString("en-US",{maximumFractionDigits:dp});
const fmtK = (n:number) => n>=1_000_000?`${(n/1_000_000).toFixed(2)}M`:n>=1_000?`${(n/1_000).toFixed(1)}K`:n.toFixed(4);
const TOKEN_PRICE = 0.024;
type Tab = "stake"|"withdraw"|"rewards";
function aprFmt(v:number){if(v>=1_000_000)return{t:`${(v/1_000_000).toFixed(1)}M%`,c:"var(--yellow)"};if(v>=1_000)return{t:`${(v/1_000).toFixed(1)}K%`,c:"var(--yellow)"};if(v>0)return{t:`${fmt(v,2)}%`,c:"var(--green)"};return{t:"Loading…",c:"var(--t4)"};}

export default function StakePage() {
  const {isConnected} = useAccount();
  const {connect}     = useConnect();
  const {toast}       = useToast();

  const {
    stkBalance, rwdBalance, stakedAmount, pendingRewards,
    baseRewards, netRewards, rewardFee,
    totalStaked, aprPercent, lockSecondsLeft, isLocked,
    currentTier, referrer: existingReferrer,
    referralEarnings, referralCount,
    performanceFeePct, isPaused, v1StakedAmount,
    needsApproval, approve, stake, withdraw, claimRewards, exit, emergencyWithdraw,
    isTxPending,
  } = useStaking();

  const [tab,        setTab]        = useState<Tab>("stake");
  const [amount,     setAmount]     = useState("");
  const [selTier,    setSelTier]    = useState<TierId>(0);
  const [referral,   setReferral]   = useState("");
  const [countdown,  setCountdown]  = useState(lockSecondsLeft);
  const [mounted,    setMounted]    = useState(false);
  const [showReferral, setShowReferral] = useState(false);
  const [showCountdown, setShowCountdown] = useState(true);

  useEffect(()=>setMounted(true),[]);
  useEffect(()=>{
    setCountdown(lockSecondsLeft);
    if(!lockSecondsLeft)return;
    const id=setInterval(()=>setCountdown(c=>Math.max(0,c-1)),1000);
    return()=>clearInterval(id);
  },[lockSecondsLeft]);

  // Sync tier selector with current staked tier
  useEffect(()=>{ if(currentTier) setSelTier(currentTier); },[currentTier]);

  if(!mounted)return null;

  const apr = aprFmt(aprPercent);
  const tierColor = TIERS[selTier].color;

  const run = async(fn:()=>Promise<void>, msg:string) => {
    try { toast("Transaction submitted…","pending"); await fn(); toast(msg,"success"); setAmount(""); }
    catch(e:any){ toast(e?.shortMessage??e?.message??"Transaction failed","error"); }
  };

  if(isPaused) return (
    <div style={{display:"flex",justifyContent:"center",alignItems:"center",minHeight:"60vh",padding:"2rem"}}>
      <div className="yf-card" style={{textAlign:"center",padding:"2.5rem 2rem",maxWidth:"420px",width:"100%",border:"1px solid rgba(248,113,113,0.3)"}}>
        <div style={{fontSize:"2.5rem",marginBottom:"1rem"}}>⚠️</div>
        <h2 className="yf-h3" style={{color:"var(--red)",marginBottom:"0.6rem"}}>Protocol Paused</h2>
        <p style={{fontSize:"0.85rem",color:"var(--t3)",lineHeight:1.7,marginBottom:"1.5rem"}}>
          The protocol is temporarily paused. You can emergency withdraw your tokens without rewards.
        </p>
        <button onClick={()=>run(()=>emergencyWithdraw(),"Emergency withdrawal successful")}
          style={{padding:"0.75rem 1.5rem",background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.4)",borderRadius:"10px",color:"var(--red)",fontFamily:"inherit",fontWeight:700,fontSize:"0.9rem",cursor:"pointer"}}>
          Emergency Withdraw (forfeits rewards)
        </button>
      </div>
    </div>
  );

  if(!isConnected) return (
    <div style={{display:"flex",justifyContent:"center",alignItems:"center",minHeight:"60vh",padding:"2rem"}}>
      <div className="yf-card" style={{textAlign:"center",padding:"2.5rem 2rem",maxWidth:"400px",width:"100%",border:"1px solid var(--border-green)"}}>
        <div style={{fontSize:"2.5rem",marginBottom:"1rem"}}>⬡</div>
        <h2 className="yf-h3" style={{marginBottom:"0.5rem"}}>Connect Wallet to Stake</h2>
        <p style={{fontSize:"0.83rem",color:"var(--t3)",lineHeight:1.7,marginBottom:"1.5rem"}}>Connect your wallet to stake STK and earn RWD rewards.</p>
        <button onClick={()=>connect({connector:injected()})} className="btn-primary btn-full">Connect Wallet</button>
      </div>
    </div>
  );

  return (
    <div className="yf-page">
      <div className="yf-page-header">
        <h1 className="yf-page-title">Staking</h1>
        <p className="yf-sub">Choose your tier · Earn multiplied rewards · 5% performance fee to treasury</p>
      </div>

    {/* V1 Migration Banner */}
      {Number(v1StakedAmount) > 0 && (
        <div style={{ marginBottom:"1.25rem", padding:"1rem 1.25rem", background:"rgba(251,191,36,0.08)", border:"1px solid rgba(251,191,36,0.25)", borderRadius:"12px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"0.75rem" }}>
          <div>
            <div style={{ fontSize:"0.85rem", color:"var(--yellow)", fontWeight:700, marginBottom:"0.2rem" }}>
              ⚠ You have {Number(v1StakedAmount).toFixed(4)} STK staked in V1
            </div>
            <div style={{ fontSize:"0.78rem", color:"var(--t3)" }}>
              Withdraw from V1 and re-stake here in V2 to earn tier multipliers.
            </div>
          </div>
          <a href={`https://sepolia.etherscan.io/address/0x84b969e7c086Ae80498e46d139F1efF10Ad8e409#writeContract`}
            target="_blank" rel="noopener noreferrer"
            style={{ padding:"0.5rem 1rem", background:"rgba(251,191,36,0.12)", border:"1px solid rgba(251,191,36,0.3)", borderRadius:"8px", color:"var(--yellow)", fontSize:"0.8rem", textDecoration:"none", fontWeight:600, whiteSpace:"nowrap" }}>
            Withdraw from V1 on Etherscan ↗
          </a>
        </div>
      )}

      

      {/* Summary bar */}
      <div className="stat-bar" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",marginBottom:"1.5rem",borderRadius:"14px",overflow:"hidden",border:"1px solid var(--border)"}}>
        {[
          {label:"Wallet Balance",  value:`${fmtK(Number(stkBalance))} STK`,    sub:`$${fmt(Number(stkBalance)*TOKEN_PRICE,2)}`,        color:"var(--blue)"},
          {label:"Staked Amount",   value:`${fmtK(Number(stakedAmount))} STK`,  sub:`Tier: ${TIERS[currentTier].emoji} ${TIERS[currentTier].name}`,color:"var(--green)"},
          {label:"Net Rewards",     value:`${fmtK(Number(netRewards))} RWD`,    sub:`After ${performanceFeePct}% fee`,                  color:"var(--purple)"},
          {label:"Current APR",     value:apr.t,                                sub:`${TIERS[currentTier].multiplier}× multiplier`,     color:apr.c},
        ].map(({label,value,sub,color})=>(
          <div key={label} className="stat-bar-item" style={{padding:"1rem 1.25rem",background:"var(--bg-card)",borderRight:"1px solid var(--border)"}}>
            <div className="yf-label" style={{marginBottom:"0.25rem"}}>{label}</div>
            <div className="yf-mono" style={{fontSize:"0.92rem",fontWeight:700,color}}>{value}</div>
            <div style={{fontSize:"0.67rem",color:"var(--t4)",marginTop:"0.12rem"}}>{sub}</div>
          </div>
        ))}
      </div>

      <div className="grid-stake">
        {/* ── Action Panel ── */}
        <div style={{display:"flex",flexDirection:"column",gap:"1.25rem"}}>
          <div className="yf-card" style={{padding:"1.75rem"}}>

            {/* Tabs */}
            <div className="stake-tabs" style={{display:"flex",gap:"0.4rem",marginBottom:"1.5rem"}}>
              {(["stake","withdraw","rewards"] as Tab[]).map(t=>(
                <button key={t} disabled={t==="withdraw"&&isLocked}
                  onClick={()=>{setTab(t);setAmount("");}}
                  style={{flex:1,padding:"0.6rem 0.4rem",background:tab===t?"rgba(0,200,100,0.1)":"var(--bg-input)",border:tab===t?"1px solid rgba(0,200,100,0.35)":"1px solid var(--border)",borderRadius:"8px",color:tab===t?"var(--green)":"var(--t3)",fontFamily:"inherit",fontSize:"0.82rem",cursor:t==="withdraw"&&isLocked?"not-allowed":"pointer",fontWeight:tab===t?600:400,opacity:t==="withdraw"&&isLocked?0.4:1,textTransform:"capitalize"}}>
                  {t==="withdraw"&&isLocked?"Withdraw 🔒":t.charAt(0).toUpperCase()+t.slice(1)}
                </button>
              ))}
            </div>

            {/* ── STAKE TAB ── */}
            {tab==="stake"&&(
              <div style={{display:"flex",flexDirection:"column",gap:"1.1rem"}}>

                {/* Tier Selector */}
                <TierSelector
                  selected={selTier}
                  currentTier={Number(stakedAmount) > 0 ? currentTier : undefined}
                  onChange={setSelTier}
                  disabled={isTxPending}
                />

                {/* Amount input */}
                <div>
                  <div className="yf-label" style={{marginBottom:"0.4rem"}}>Amount to Stake</div>
                  <div style={{display:"flex",gap:"0.5rem",alignItems:"center"}}>
                    <input type="number" placeholder="0.00" value={amount} onChange={e=>setAmount(e.target.value)}
                      className="yf-input" style={{flex:1}}/>
                    <span className="yf-mono" style={{fontSize:"0.78rem",color:"var(--t3)",fontWeight:700,flexShrink:0}}>STK</span>
                    <button onClick={()=>setAmount(stkBalance)} style={{padding:"0.5rem 0.8rem",background:`${tierColor}18`,border:`1px solid ${tierColor}50`,borderRadius:"6px",color:tierColor,fontFamily:"inherit",fontSize:"0.72rem",fontWeight:700,cursor:"pointer",flexShrink:0}}>MAX</button>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:"0.3rem",flexWrap:"wrap",gap:"0.25rem"}}>
                    <span style={{fontSize:"0.72rem",color:"var(--t3)"}}>Balance: <strong style={{color:"var(--t2)"}}>{fmtK(Number(stkBalance))} STK</strong></span>
                    {amount&&<span style={{fontSize:"0.72rem",color:"var(--t4)"}}>≈ ${fmt(Number(amount)*TOKEN_PRICE,2)}</span>}
                  </div>
                </div>

                {/* Referral */}
                <div>
                  <button onClick={()=>setShowReferral(s=>!s)}
                    style={{fontSize:"0.78rem",color:"var(--t3)",background:"none",border:"none",cursor:"pointer",padding:0,display:"flex",alignItems:"center",gap:"0.35rem"}}>
                    {showReferral ? "▾" : "▸"} Add referral code (optional — referrer earns 3% bonus)
                  </button>
                  {showReferral && (
                    <div style={{marginTop:"0.5rem"}}>
                      <input type="text" placeholder="0x... referrer address"
                        value={referral} onChange={e=>setReferral(e.target.value)}
                        className="yf-input" style={{fontSize:"0.85rem"}}/>
                      {existingReferrer && existingReferrer !== "0x0000000000000000000000000000000000000000" && (
                        <p style={{fontSize:"0.72rem",color:"var(--green)",marginTop:"0.3rem"}}>
                          ✓ Referrer already set: {existingReferrer.slice(0,6)}…{existingReferrer.slice(-4)}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Info box */}
                {needsApproval && (
                  <div style={{background:"rgba(251,191,36,0.07)",border:"1px solid rgba(251,191,36,0.22)",borderRadius:"10px",padding:"0.65rem 0.9rem",fontSize:"0.8rem",color:"var(--yellow)"}}>
                    ℹ First approve STK, then stake — done automatically.
                  </div>
                )}

                <div className="info-box">
                  <div className="info-row"><span>Selected Tier</span><strong style={{color:tierColor}}>{TIERS[selTier].emoji} {TIERS[selTier].name}</strong></div>
                  <div className="info-row"><span>Lock Period</span><strong>{TIERS[selTier].lockDays} days from stake</strong></div>
                  <div className="info-row"><span>Reward Multiplier</span><strong style={{color:tierColor}}>{TIERS[selTier].multiplier}×</strong></div>
                  <div className="info-row"><span>Performance Fee</span><strong style={{color:"var(--red)"}}>5% → Treasury</strong></div>
                  <div className="info-row"><span>Referral Bonus</span><strong style={{color:"var(--green)"}}>3% to referrer</strong></div>
                  <div className="info-row"><span>Deposit Fee</span><strong style={{color:"var(--green)"}}>0%</strong></div>
                </div>

                <button className="btn-primary btn-full"
                  style={{background:`linear-gradient(135deg,${tierColor},var(--blue))`}}
                  disabled={isTxPending||!amount||Number(amount)<=0}
                  onClick={()=>run(async()=>{if(needsApproval)await approve();await stake(amount,selTier,referral);},`Staked ${amount} STK as ${TIERS[selTier].name} ✅`)}>
                  {isTxPending?"⏳ Staking…":needsApproval?"Approve & Stake STK":`Stake STK — ${TIERS[selTier].emoji} ${TIERS[selTier].name}`}
                </button>
              </div>
            )}

            {/* ── WITHDRAW TAB ── */}
            {tab==="withdraw"&&(
              <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
                <div>
                  <div className="yf-label" style={{marginBottom:"0.4rem"}}>Amount to Withdraw</div>
                  <div style={{display:"flex",gap:"0.5rem",alignItems:"center"}}>
                    <input type="number" placeholder="0.00" value={amount} onChange={e=>setAmount(e.target.value)}
                      className="yf-input" style={{flex:1}}/>
                    <span className="yf-mono" style={{fontSize:"0.78rem",color:"var(--t3)",fontWeight:700,flexShrink:0}}>STK</span>
                    <button onClick={()=>setAmount(stakedAmount)} style={{padding:"0.5rem 0.8rem",background:"rgba(0,200,100,0.1)",border:"1px solid rgba(0,200,100,0.25)",borderRadius:"6px",color:"var(--green)",fontFamily:"inherit",fontSize:"0.72rem",fontWeight:700,cursor:"pointer",flexShrink:0}}>MAX</button>
                  </div>
                  <span style={{fontSize:"0.72rem",color:"var(--t3)",marginTop:"0.3rem",display:"block"}}>Staked: <strong style={{color:"var(--t2)"}}>{fmtK(Number(stakedAmount))} STK</strong></span>
                </div>
                <div className="info-box">
                  <div className="info-row"><span>Status</span><strong style={{color:"var(--green)"}}>✓ Unlocked</strong></div>
                  <div className="info-row"><span>Your Tier</span><strong style={{color:TIERS[currentTier].color}}>{TIERS[currentTier].emoji} {TIERS[currentTier].name}</strong></div>
                  <div className="info-row"><span>Withdrawal Fee</span><strong style={{color:"var(--green)"}}>0%</strong></div>
                </div>
                <button className="btn-primary btn-full" disabled={isTxPending||!amount||Number(amount)<=0}
                  onClick={()=>run(()=>withdraw(amount),`Withdrew ${amount} STK ✅`)}>
                  {isTxPending?"⏳ Withdrawing…":"Withdraw STK"}
                </button>
                <button className="btn-outline btn-full" disabled={isTxPending}
                  onClick={()=>run(()=>exit(),"Exited — tokens + rewards claimed ✅")}>
                  Exit: Withdraw All + Claim Rewards
                </button>
              </div>
            )}

            {/* ── REWARDS TAB ── */}
            {tab==="rewards"&&(
              <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
                {/* Reward breakdown */}
                <div style={{background:`${TIERS[currentTier].color}0d`,border:`1px solid ${TIERS[currentTier].color}30`,borderRadius:"14px",padding:"1.25rem",textAlign:"center"}}>
                  <p className="yf-label" style={{marginBottom:"0.35rem"}}>Net Rewards (After Fee)</p>
                  <p className="yf-mono" style={{fontSize:"2.4rem",fontWeight:800,color:TIERS[currentTier].color,lineHeight:1}}>
                    {fmtK(Number(netRewards))}
                  </p>
                  <p style={{fontSize:"0.88rem",color:"var(--t3)",marginTop:"0.2rem"}}>RWD ≈ ${fmt(Number(netRewards)*TOKEN_PRICE,2)}</p>
                </div>

                {/* Breakdown */}
                <div className="info-box">
                  <div className="info-row">
                    <span>Base rewards</span>
                    <strong className="yf-mono">{fmtK(Number(baseRewards))} RWD</strong>
                  </div>
                  <div className="info-row">
                    <span>Tier multiplier ({TIERS[currentTier].emoji} {TIERS[currentTier].name})</span>
                    <strong style={{color:TIERS[currentTier].color}}>{TIERS[currentTier].multiplier}×</strong>
                  </div>
                  <div className="info-row">
                    <span>Performance fee (5%)</span>
                    <strong style={{color:"var(--red)"}}>−{fmtK(Number(rewardFee))} RWD</strong>
                  </div>
                  <div style={{height:"1px",background:"var(--border)",margin:"0.35rem 0"}}/>
                  <div className="info-row">
                    <span><strong>You receive</strong></span>
                    <strong style={{color:TIERS[currentTier].color}}>{fmtK(Number(netRewards))} RWD ✅</strong>
                  </div>
                </div>

                {/* Referral stats */}
                {referralCount > 0 && (
                  <div style={{background:"rgba(0,200,100,0.05)",border:"1px solid rgba(0,200,100,0.15)",borderRadius:"10px",padding:"0.85rem 1rem"}}>
                    <div style={{fontSize:"0.78rem",color:"var(--green)",fontWeight:600,marginBottom:"0.35rem"}}>
                      🔗 Your Referral Stats
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:"0.78rem",color:"var(--t3)"}}>
                      <span>Referrals</span><strong style={{color:"var(--t2)"}}>{referralCount} users</strong>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:"0.78rem",color:"var(--t3)",marginTop:"0.25rem"}}>
                      <span>Total Earned</span><strong style={{color:"var(--green)"}}>{fmtK(Number(referralEarnings))} RWD</strong>
                    </div>
                  </div>
                )}

                <div className="info-box">
                  <div className="info-row"><span>RWD in Wallet</span><strong>{fmtK(Number(rwdBalance))} RWD</strong></div>
                  <div className="info-row"><span>Pool Share</span><strong>{Number(totalStaked)===0?"0.00":fmt((Number(stakedAmount)/Number(totalStaked))*100,2)}%</strong></div>
                </div>

                <button className="btn-primary btn-full"
                  style={{background:`linear-gradient(135deg,${TIERS[currentTier].color},var(--blue))`}}
                  disabled={isTxPending||Number(netRewards)<=0}
                  onClick={()=>run(()=>claimRewards(),`Claimed ${fmtK(Number(netRewards))} RWD ✅`)}>
                  {isTxPending?"⏳ Claiming…":"Claim Rewards"}
                </button>
                <button className="btn-outline btn-full"
                  onClick={()=>toast("Auto-compound vault coming soon! ⚡","info")}>
                  ⚡ Auto-Compound via Vault (xSTK)
                </button>
              </div>
            )}
          </div>

          <TransactionHistory />
        </div>

        {/* ── Right Panel ── */}
        <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>

          {/* Lock countdown */}
          {isLocked&&(
            <div className="yf-card" style={{overflow:"hidden",borderTop:`2px solid ${TIERS[currentTier].color}`}}>
              {/* Collapsed header — always visible */}
              <button onClick={()=>setShowCountdown(o=>!o)}
                style={{width:"100%",padding:"1rem 1.25rem",background:"none",border:"none",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:"inherit"}}>
                <div style={{display:"flex",alignItems:"center",gap:"0.65rem"}}>
                  <span style={{fontSize:"1.1rem"}}>🔒</span>
                  <div style={{textAlign:"left"}}>
                    <div style={{fontSize:"0.62rem",fontWeight:700,letterSpacing:"0.1em",color:"var(--t4)",textTransform:"uppercase",marginBottom:"0.15rem"}}>Unlock Countdown</div>
                    <div className="yf-mono" style={{fontSize:"1rem",fontWeight:800,color:TIERS[currentTier].color}}>
                      {formatDuration(countdown)}
                    </div>
                  </div>
                </div>
                <span style={{color:"var(--t4)",fontSize:"0.85rem"}}>{showCountdown?"▲":"▼"}</span>
              </button>

              {/* Expanded details */}
              {showCountdown&&(
                <div style={{padding:"0 1.25rem 1.25rem",borderTop:"1px solid var(--border)"}}>
                  <div style={{marginTop:"0.85rem",display:"flex",flexDirection:"column",gap:"0"}}>
                    {[
                      {label:"Tier",        value:`${TIERS[currentTier].emoji} ${TIERS[currentTier].name} · ${TIERS[currentTier].multiplier}× multiplier`, color:TIERS[currentTier].color},
                      {label:"Staked",      value:`${Number(stakedAmount).toFixed(4)} STK`,  color:"var(--blue)"},
                      {label:"Unlocks in",  value:formatDuration(countdown),                  color:"var(--yellow)"},
                      {label:"Unlock date", value:countdown > 0 ? new Date(Date.now() + countdown*1000).toLocaleDateString("en-US",{day:"numeric",month:"long",year:"numeric"}) : "Unlocked", color:"var(--t2)"},
                    ].map(({label,value,color})=>(
                      <div key={label} style={{display:"flex",justifyContent:"space-between",fontSize:"0.8rem",padding:"0.45rem 0",borderBottom:"1px solid var(--border)"}}>
                        <span style={{color:"var(--t3)"}}>{label}</span>
                        <span className="yf-mono" style={{color,fontWeight:600}}>{value}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{marginTop:"0.85rem",padding:"0.6rem 0.85rem",background:"rgba(251,191,36,0.05)",border:"1px solid rgba(251,191,36,0.15)",borderRadius:"8px",fontSize:"0.72rem",color:"var(--t4)",lineHeight:1.6}}>
                    ℹ StakingV2 stores <strong style={{color:"var(--t2)"}}>one position per wallet</strong>. Re-staking extends your existing lock at the same or higher tier. Early withdrawal is not permitted.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* APR card */}
          <div className="yf-card" style={{padding:"1.4rem"}}>
            <div className="yf-label" style={{marginBottom:"0.45rem"}}>Current APR</div>
            <APRDisplay aprPercent={aprPercent} totalStaked={Number(totalStaked)} />
            <div style={{height:"6px",background:"var(--bg-input)",borderRadius:"99px",overflow:"hidden",marginBottom:"0.35rem"}}>
              <div style={{height:"100%",width:`${Math.min((Math.min(aprPercent,500)/500)*100,100)}%`,background:`linear-gradient(90deg,${TIERS[selTier].color},var(--blue))`,borderRadius:"99px"}}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:"0.68rem",color:"var(--t4)",marginBottom:"0.5rem"}}><span>0%</span><span>500%+</span></div>

            {/* APR per tier */}
            <div style={{display:"flex",flexDirection:"column",gap:"0.3rem"}}>
              {TIERS.map(t=>(
                <div key={t.id} style={{display:"flex",justifyContent:"space-between",fontSize:"0.75rem",padding:"0.28rem 0",borderBottom:"1px solid var(--border)"}}>
                  <span style={{color:"var(--t3)"}}>{t.emoji} {t.name}</span>
                  <span className="yf-mono" style={{color:t.color,fontWeight:600}}>
                    {aprPercent>999999?`${((aprPercent*t.multiplier)/1_000_000).toFixed(1)}M%`:`${fmt(aprPercent*t.multiplier,2)}%`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Pool stats */}
          <div className="yf-card" style={{padding:"1.4rem"}}>
            <div className="yf-label" style={{marginBottom:"0.65rem"}}>Pool Statistics</div>
            {[
              {k:"Total Staked",   v:`${fmtK(Number(totalStaked))} STK`,  c:"var(--t2)"},
              {k:"Your Staked",    v:`${fmtK(Number(stakedAmount))} STK`, c:"var(--t2)"},
              {k:"Your Share",     v:`${Number(totalStaked)===0?"0.00":fmt((Number(stakedAmount)/Number(totalStaked))*100,2)}%`, c:"var(--t2)"},
              {k:"Net Rewards",    v:`${fmtK(Number(netRewards))} RWD`,   c:"var(--green)"},
              {k:"Fee to Treasury",v:`${fmtK(Number(rewardFee))} RWD`,    c:"var(--red)"},
            ].map(({k,v,c},i,arr)=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:"0.8rem",color:"var(--t3)",padding:"0.5rem 0",borderBottom:i<arr.length-1?"1px solid var(--border)":"none"}}>
                <span>{k}</span><strong className="yf-mono" style={{color:c,fontWeight:600}}>{v}</strong>
              </div>
            ))}
          </div>

          <EarningsSimulator aprPercent={Math.min(aprPercent,999999)} tokenPrice={TOKEN_PRICE} selectedTier={selTier}/>
        </div>
      </div>
    </div>
  );
}