"use client";
import { useState, useEffect } from "react";
import { useAccount, useConnect, useReadContracts, useWriteContract } from "wagmi";
import { injected } from "wagmi/connectors";
import { parseUnits, formatUnits } from "viem";
import { useToast } from "@/components/Toast";

// ── Contract addresses ────────────────────────────────────────
const VESTK_ADDR     = (process.env.NEXT_PUBLIC_VESTK     ?? "0x") as `0x${string}`;
const GOVERNOR_ADDR  = (process.env.NEXT_PUBLIC_GOVERNOR  ?? "0x") as `0x${string}`;
const STK_TOKEN_ADDR = (process.env.NEXT_PUBLIC_STAKING_TOKEN ?? "0x") as `0x${string}`;

// ── Minimal ABIs ────────────────────────────────────────────────
const VESTK_ABI = [
  { name:"lock",            type:"function", stateMutability:"nonpayable", inputs:[{name:"_amount",type:"uint256"},{name:"_lockDuration",type:"uint256"}], outputs:[] },
  { name:"unlock",          type:"function", stateMutability:"nonpayable", inputs:[], outputs:[] },
  { name:"balanceOf",       type:"function", stateMutability:"view",       inputs:[{name:"account",type:"address"}], outputs:[{name:"",type:"uint256"}] },
  { name:"locks",           type:"function", stateMutability:"view",       inputs:[{name:"",type:"address"}], outputs:[{name:"amount",type:"uint256"},{name:"lockEnd",type:"uint256"},{name:"lockedAt",type:"uint256"}] },
  { name:"timeUntilUnlock", type:"function", stateMutability:"view",       inputs:[{name:"_user",type:"address"}], outputs:[{name:"",type:"uint256"}] },
  { name:"previewVeAmount", type:"function", stateMutability:"pure",       inputs:[{name:"_amount",type:"uint256"},{name:"_duration",type:"uint256"}], outputs:[{name:"",type:"uint256"}] },
  { name:"totalLocked",     type:"function", stateMutability:"view",       inputs:[], outputs:[{name:"",type:"uint256"}] },
] as const;

const ERC20_ABI = [
  { name:"balanceOf", type:"function", stateMutability:"view",       inputs:[{name:"account",type:"address"}], outputs:[{name:"",type:"uint256"}] },
  { name:"approve",   type:"function", stateMutability:"nonpayable", inputs:[{name:"spender",type:"address"},{name:"amount",type:"uint256"}], outputs:[{name:"",type:"bool"}] },
  { name:"allowance", type:"function", stateMutability:"view",       inputs:[{name:"owner",type:"address"},{name:"spender",type:"address"}], outputs:[{name:"",type:"uint256"}] },
] as const;

const GOVERNOR_ABI = [
  { name:"proposalThreshold", type:"function", stateMutability:"view", inputs:[], outputs:[{name:"",type:"uint256"}] },
  { name:"votingDelay",       type:"function", stateMutability:"view", inputs:[], outputs:[{name:"",type:"uint256"}] },
  { name:"votingPeriod",      type:"function", stateMutability:"view", inputs:[], outputs:[{name:"",type:"uint256"}] },
  { name:"quorumNumerator",   type:"function", stateMutability:"view", inputs:[], outputs:[{name:"",type:"uint256"}] },
] as const;

// ── Mock proposals (will be replaced with on-chain events in The Graph v2) ──
const MOCK_PROPOSALS = [
  { id:1, title:"Reduce reward rate to 0.001 RWD/sec",    description:"Current 1 RWD/sec emission creates unsustainable tokenomics at low TVL. This proposal reduces to 0.001 RWD/sec.", votes:{for:68,against:22,abstain:10}, status:"active" as const, ends:"3 days",  proposer:"0x72F6...DEF7" },
  { id:2, title:"Add USDC staking pool with 18% APR",      description:"Introduce a stable USDC pool to attract conservative yield seekers and grow protocol TVL.", votes:{for:45,against:35,abstain:20}, status:"active" as const, ends:"5 days",  proposer:"0x1234...5678" },
  { id:3, title:"Set performance fee to 5%",               description:"Introduce a 5% performance fee on claimed rewards to fund protocol treasury. Already implemented in V2.", votes:{for:72,against:18,abstain:10}, status:"passed" as const, ends:"Ended", proposer:"0xabcd...ef01" },
  { id:4, title:"Deploy on Arbitrum mainnet",              description:"Expand protocol to Arbitrum for lower gas fees and access to wider DeFi ecosystem.", votes:{for:30,against:55,abstain:15}, status:"failed" as const, ends:"Ended", proposer:"0x9876...5432" },
];

const LOCK_OPTIONS = [
  { label:"1 Week",   seconds: 7   * 24 * 3600, multiplier:0.019 },
  { label:"1 Month",  seconds: 30  * 24 * 3600, multiplier:0.082 },
  { label:"6 Months", seconds: 180 * 24 * 3600, multiplier:0.493 },
  { label:"1 Year",   seconds: 365 * 24 * 3600, multiplier:1.0   },
  { label:"2 Years",  seconds: 730 * 24 * 3600, multiplier:2.0   },
  { label:"4 Years",  seconds:1460 * 24 * 3600, multiplier:4.0   },
];

const statusStyle = {
  active: { color:"var(--green)",  bg:"rgba(0,200,100,0.1)",  border:"rgba(0,200,100,0.3)",  label:"● Active" },
  passed: { color:"var(--blue)",   bg:"rgba(0,201,255,0.1)",  border:"rgba(0,201,255,0.3)",  label:"✓ Passed" },
  failed: { color:"var(--red)",    bg:"rgba(248,113,113,0.1)",border:"rgba(248,113,113,0.3)",label:"✗ Failed" },
};

const fmt = (n:string|number,dp=4) => Number(n).toLocaleString("en-US",{maximumFractionDigits:dp});

type Tab = "proposals" | "lock" | "stats";

export default function GovernancePage() {
  const { address, isConnected } = useAccount();
  const { connect }              = useConnect();
  const { toast }                = useToast();
  const { writeContractAsync }   = useWriteContract();

  const [mounted,     setMounted]     = useState(false);
  const [tab,         setTab]         = useState<Tab>("proposals");
  const [voted,       setVoted]       = useState<Record<number,string>>({});
  const [lockAmount,  setLockAmount]  = useState("");
  const [lockOption,  setLockOption]  = useState(3); // default 1 year
  const [loading,     setLoading]     = useState(false);

  useEffect(()=>setMounted(true),[]);

  // Read contract data
  const { data, refetch } = useReadContracts({
    contracts: [
      { address:VESTK_ADDR,     abi:VESTK_ABI,    functionName:"balanceOf",       args: address ? [address] : undefined },
      { address:VESTK_ADDR,     abi:VESTK_ABI,    functionName:"locks",           args: address ? [address] : undefined },
      { address:VESTK_ADDR,     abi:VESTK_ABI,    functionName:"timeUntilUnlock", args: address ? [address] : undefined },
      { address:VESTK_ADDR,     abi:VESTK_ABI,    functionName:"totalLocked" },
      { address:STK_TOKEN_ADDR, abi:ERC20_ABI,    functionName:"balanceOf",       args: address ? [address] : undefined },
      { address:STK_TOKEN_ADDR, abi:ERC20_ABI,    functionName:"allowance",       args: address ? [address, VESTK_ADDR] : undefined },
      { address:GOVERNOR_ADDR,  abi:GOVERNOR_ABI, functionName:"proposalThreshold" },
      { address:GOVERNOR_ADDR,  abi:GOVERNOR_ABI, functionName:"votingDelay" },
      { address:GOVERNOR_ADDR,  abi:GOVERNOR_ABI, functionName:"votingPeriod" },
    ],
    query: { refetchInterval:8_000 },
  });

  const veBalance     = formatUnits((data?.[0]?.result as bigint) ?? 0n, 18);
  const lockInfo      = data?.[1]?.result as readonly [bigint,bigint,bigint] | undefined;
  const lockSeconds   = (data?.[2]?.result as bigint) ?? 0n;
  const totalLocked   = formatUnits((data?.[3]?.result as bigint) ?? 0n, 18);
  const stkBalance    = formatUnits((data?.[4]?.result as bigint) ?? 0n, 18);
  const allowance     = (data?.[5]?.result as bigint) ?? 0n;
  const propThreshold = formatUnits((data?.[6]?.result as bigint) ?? 100n*10n**18n, 18);
  const votingDelaySec= Number((data?.[7]?.result as bigint) ?? 86400n);
  const votingPeriodSec=Number((data?.[8]?.result as bigint) ?? 604800n);

  const lockedAmount  = formatUnits(lockInfo?.[0] ?? 0n, 18);
  const hasLock       = Number(lockedAmount) > 0;
  const needsApproval = allowance === 0n || (lockAmount && allowance < parseUnits(lockAmount || "0", 18));

  // Preview veSTK for selected lock
  const previewVe = lockAmount
    ? (Number(lockAmount) * LOCK_OPTIONS[lockOption].seconds) / (4 * 365 * 24 * 3600)
    : 0;

  const votingPower = Number(veBalance);
  const canPropose  = votingPower >= Number(propThreshold);

  const run = async (fn: () => Promise<void>) => {
    try {
      setLoading(true);
      await fn();
      setTimeout(refetch, 3000);
    } catch(e: any) {
      toast(e?.shortMessage ?? e?.message ?? "Transaction failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = () => run(async () => {
    toast("Approving STK…", "pending");
    await writeContractAsync({ address:STK_TOKEN_ADDR, abi:ERC20_ABI, functionName:"approve", args:[VESTK_ADDR, parseUnits("1000000000", 18)], gas:BigInt(100_000) });
    toast("STK approved ✅", "success");
  });

  const handleLock = () => run(async () => {
    if (!lockAmount || Number(lockAmount) <= 0) return toast("Enter an amount","error");
    toast("Locking STK for veSTK…", "pending");
    await writeContractAsync({ address:VESTK_ADDR, abi:VESTK_ABI, functionName:"lock", args:[parseUnits(lockAmount, 18), BigInt(LOCK_OPTIONS[lockOption].seconds)], gas:BigInt(200_000) });
    toast(`Locked ${lockAmount} STK → ${previewVe.toFixed(4)} veSTK ✅`, "success");
    setLockAmount("");
  });

  const handleUnlock = () => run(async () => {
    toast("Unlocking STK…", "pending");
    await writeContractAsync({ address:VESTK_ADDR, abi:VESTK_ABI, functionName:"unlock", gas:BigInt(150_000) });
    toast("STK unlocked ✅", "success");
  });

  if (!mounted) return null;

  return (
    <div className="yf-page">
      <div className="yf-page-header">
        <h1 className="yf-page-title">🏛 Governance</h1>
        <p className="yf-sub">Lock STK → get veSTK → vote on protocol changes. All decisions execute on-chain.</p>
      </div>

      {/* Stats bar */}
      <div className="stat-bar" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",marginBottom:"1.5rem",borderRadius:"14px",overflow:"hidden",border:"1px solid var(--border)"}}>
        {[
          {label:"Your veSTK",        value:`${fmt(veBalance,4)} veSTK`,    color:"var(--purple)"},
          {label:"Your Voting Power",  value:`${fmt(votingPower/Number(propThreshold)*100,2)}%`, color: canPropose?"var(--green)":"var(--t2)"},
          {label:"Total Locked STK",   value:`${fmt(totalLocked,2)} STK`,   color:"var(--blue)"},
          {label:"Active Proposals",   value:"2",                            color:"var(--yellow)"},
        ].map(({label,value,color})=>(
          <div key={label} className="stat-bar-item" style={{padding:"1rem 1.25rem",background:"var(--bg-card)",borderRight:"1px solid var(--border)"}}>
            <div className="yf-label" style={{marginBottom:"0.25rem"}}>{label}</div>
            <div className="yf-mono" style={{fontSize:"0.92rem",fontWeight:700,color}}>{value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:"0.4rem",marginBottom:"1.5rem"}}>
        {([["proposals","📋 Proposals"],["lock","🔒 Lock STK"],["stats","📊 DAO Stats"]] as const).map(([t,label])=>(
          <button key={t} onClick={()=>setTab(t as Tab)}
            style={{padding:"0.6rem 1.25rem",background:tab===t?"rgba(0,200,100,0.1)":"var(--bg-input)",border:tab===t?"1px solid rgba(0,200,100,0.35)":"1px solid var(--border)",borderRadius:"10px",color:tab===t?"var(--green)":"var(--t3)",fontFamily:"inherit",fontSize:"0.85rem",cursor:"pointer",fontWeight:tab===t?600:400}}>
            {label}
          </button>
        ))}
      </div>

      {/* ── PROPOSALS ── */}
      {tab==="proposals"&&(
        <div style={{display:"flex",flexDirection:"column",gap:"1.25rem"}}>
          {Number(veBalance) === 0 && isConnected && (
            <div style={{padding:"0.85rem 1.25rem",background:"rgba(251,191,36,0.07)",border:"1px solid rgba(251,191,36,0.2)",borderRadius:"12px",fontSize:"0.83rem",color:"var(--yellow)",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"0.5rem"}}>
              <span>⚠ You need veSTK to vote. Lock STK to get voting power.</span>
              <button onClick={()=>setTab("lock")} style={{padding:"0.35rem 0.85rem",background:"rgba(251,191,36,0.12)",border:"1px solid rgba(251,191,36,0.3)",borderRadius:"8px",color:"var(--yellow)",fontFamily:"inherit",fontSize:"0.8rem",cursor:"pointer",fontWeight:600}}>Lock STK →</button>
            </div>
          )}

          {MOCK_PROPOSALS.map(p=>{
            const s = statusStyle[p.status];
            const hasVoted = voted[p.id];
            const canVote  = p.status==="active" && !hasVoted && isConnected && Number(veBalance)>0;
            return (
              <div key={p.id} className="yf-card" style={{padding:"1.75rem"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"1rem",marginBottom:"0.75rem",flexWrap:"wrap"}}>
                  <h3 style={{fontFamily:"Syne,Georgia,serif",fontSize:"1rem",fontWeight:700,color:"var(--t1)",flex:1}}>
                    #{p.id} {p.title}
                  </h3>
                  <div style={{padding:"0.22rem 0.65rem",background:s.bg,border:`1px solid ${s.border}`,borderRadius:"20px",fontSize:"0.7rem",color:s.color,fontWeight:700,flexShrink:0}}>
                    {s.label}
                  </div>
                </div>

                <p style={{fontSize:"0.82rem",color:"var(--t3)",lineHeight:1.65,marginBottom:"1.25rem"}}>{p.description}</p>

                {/* Vote bars */}
                <div style={{display:"flex",flexDirection:"column",gap:"0.5rem",marginBottom:"1.25rem"}}>
                  {[{label:"For",pct:p.votes.for,color:"var(--green)"},{label:"Against",pct:p.votes.against,color:"var(--red)"},{label:"Abstain",pct:p.votes.abstain,color:"var(--t4)"}].map(({label,pct,color})=>(
                    <div key={label}>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:"0.73rem",marginBottom:"0.2rem"}}>
                        <span style={{color:"var(--t3)"}}>{label}</span>
                        <span style={{color,fontWeight:600}}>{pct}%</span>
                      </div>
                      <div style={{height:"5px",background:"var(--bg-input)",borderRadius:"99px",overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${pct}%`,background:color,borderRadius:"99px"}}/>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"0.75rem"}}>
                  <span style={{fontSize:"0.73rem",color:"var(--t4)"}}>
                    By {p.proposer} · Ends: {p.ends}
                    {Number(veBalance)>0&&<span style={{marginLeft:"0.5rem",color:"var(--purple)",fontWeight:600}}>· Your power: {fmt(veBalance,2)} veSTK</span>}
                  </span>
                  {canVote&&(
                    <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap"}}>
                      {["For","Against","Abstain"].map(v=>(
                        <button key={v} onClick={()=>{ setVoted(prev=>({...prev,[p.id]:v})); toast(`Voted ${v} on proposal #${p.id} ✅`,"success"); }}
                          style={{padding:"0.38rem 0.85rem",borderRadius:"8px",fontFamily:"inherit",fontSize:"0.78rem",fontWeight:600,cursor:"pointer",
                            background:v==="For"?"rgba(0,200,100,0.1)":v==="Against"?"rgba(248,113,113,0.1)":"var(--bg-input)",
                            border:v==="For"?"1px solid rgba(0,200,100,0.3)":v==="Against"?"1px solid rgba(248,113,113,0.3)":"1px solid var(--border)",
                            color:v==="For"?"var(--green)":v==="Against"?"var(--red)":"var(--t3)"}}>
                          {v}
                        </button>
                      ))}
                    </div>
                  )}
                  {hasVoted&&<span style={{fontSize:"0.78rem",color:"var(--green)",fontWeight:600}}>✓ Voted {hasVoted}</span>}
                  {p.status!=="active"&&!hasVoted&&<span style={{fontSize:"0.73rem",color:"var(--t4)"}}>Voting closed</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── LOCK STK ── */}
      {tab==="lock"&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1.5rem"}} className="grid-2">

          {/* Lock form */}
          <div className="yf-card" style={{padding:"1.75rem"}}>
            <h3 className="yf-h3" style={{marginBottom:"1.25rem"}}>🔒 Lock STK → Get veSTK</h3>

            {hasLock ? (
              <div>
                <div style={{background:"rgba(0,200,100,0.05)",border:"1px solid rgba(0,200,100,0.15)",borderRadius:"12px",padding:"1.1rem",marginBottom:"1.25rem"}}>
                  <div className="yf-label" style={{marginBottom:"0.5rem"}}>Active Lock</div>
                  <div className="yf-mono" style={{fontSize:"1.1rem",fontWeight:700,color:"var(--green)",marginBottom:"0.25rem"}}>{fmt(lockedAmount,4)} STK locked</div>
                  <div style={{fontSize:"0.8rem",color:"var(--t3)"}}>veSTK balance: <strong style={{color:"var(--purple)"}}>{fmt(veBalance,4)}</strong></div>
                  {lockSeconds>0n&&<div style={{fontSize:"0.78rem",color:"var(--yellow)",marginTop:"0.35rem"}}>🔒 Unlocks in {Math.floor(Number(lockSeconds)/86400)} days</div>}
                  {lockSeconds===0n&&<div style={{fontSize:"0.78rem",color:"var(--green)",marginTop:"0.35rem"}}>✅ Unlocked — you can withdraw</div>}
                </div>
                {lockSeconds===0n&&(
                  <button className="btn-primary btn-full" disabled={loading} onClick={handleUnlock}>
                    {loading?"⏳ Unlocking…":"Unlock & Retrieve STK"}
                  </button>
                )}
              </div>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
                {!isConnected&&(
                  <button className="btn-primary btn-full" onClick={()=>connect({connector:injected()})}>Connect Wallet</button>
                )}
                {isConnected&&(
                  <>
                    <div>
                      <div className="yf-label" style={{marginBottom:"0.4rem"}}>Amount to Lock</div>
                      <div style={{display:"flex",gap:"0.5rem",alignItems:"center"}}>
                        <input type="number" placeholder="0.00" value={lockAmount} onChange={e=>setLockAmount(e.target.value)}
                          className="yf-input" style={{flex:1}}/>
                        <span className="yf-mono" style={{fontSize:"0.78rem",color:"var(--t3)",fontWeight:700,flexShrink:0}}>STK</span>
                        <button onClick={()=>setLockAmount(stkBalance)} style={{padding:"0.5rem 0.8rem",background:"rgba(160,100,250,0.1)",border:"1px solid rgba(160,100,250,0.25)",borderRadius:"6px",color:"var(--purple)",fontFamily:"inherit",fontSize:"0.72rem",fontWeight:700,cursor:"pointer",flexShrink:0}}>MAX</button>
                      </div>
                      <span style={{fontSize:"0.72rem",color:"var(--t3)",marginTop:"0.3rem",display:"block"}}>Balance: <strong style={{color:"var(--t2)"}}>{fmt(stkBalance,4)} STK</strong></span>
                    </div>

                    <div>
                      <div className="yf-label" style={{marginBottom:"0.5rem"}}>Lock Duration</div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0.4rem"}}>
                        {LOCK_OPTIONS.map((opt,i)=>(
                          <button key={i} onClick={()=>setLockOption(i)}
                            style={{padding:"0.5rem 0.4rem",background:lockOption===i?"rgba(160,100,250,0.1)":"var(--bg-input)",border:lockOption===i?"1px solid rgba(160,100,250,0.4)":"1px solid var(--border)",borderRadius:"8px",cursor:"pointer",fontSize:"0.75rem",color:lockOption===i?"var(--purple)":"var(--t3)",fontWeight:lockOption===i?600:400,fontFamily:"inherit"}}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {lockAmount&&Number(lockAmount)>0&&(
                      <div style={{background:"rgba(160,100,250,0.07)",border:"1px solid rgba(160,100,250,0.2)",borderRadius:"10px",padding:"0.85rem 1rem"}}>
                        <div style={{fontSize:"0.8rem",color:"var(--t3)",marginBottom:"0.3rem"}}>You will receive:</div>
                        <div className="yf-mono" style={{fontSize:"1.2rem",fontWeight:700,color:"var(--purple)"}}>{previewVe.toFixed(4)} veSTK</div>
                        <div style={{fontSize:"0.72rem",color:"var(--t4)",marginTop:"0.2rem"}}>Locked for {LOCK_OPTIONS[lockOption].label}</div>
                      </div>
                    )}

                    {needsApproval
                      ? <button className="btn-primary btn-full" disabled={loading} onClick={handleApprove}
                          style={{background:"linear-gradient(135deg,var(--purple),var(--blue))"}}>
                          {loading?"⏳ Approving…":"Approve STK"}
                        </button>
                      : <button className="btn-primary btn-full" disabled={loading||!lockAmount||Number(lockAmount)<=0} onClick={handleLock}
                          style={{background:"linear-gradient(135deg,var(--purple),var(--blue))"}}>
                          {loading?"⏳ Locking…":"Lock STK → Get veSTK"}
                        </button>
                    }
                  </>
                )}
              </div>
            )}
          </div>

          {/* How it works */}
          <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
           <div className="yf-card" style={{padding:"1.5rem"}}>
                <h3 className="yf-h3" style={{marginBottom:"0.3rem"}}>How veSTK Works</h3>
                <p style={{fontSize:"0.77rem",color:"var(--t4)",marginBottom:"1.1rem"}}>Lock STK to earn voting power and shape the protocol.</p>
              
                <div style={{display:"flex",flexDirection:"column",gap:"0.5rem"}}>
                  {[
                    { icon:"🔒", title:"Lock STK",       desc:"Lock STK for 7 days up to 4 years. Longer lock = more power.", color:"var(--purple)", bg:"rgba(160,100,250,0.08)" },
                    { icon:"💎", title:"Receive veSTK",  desc:"Get veSTK instantly. Non-transferable — tied to your wallet.", color:"var(--blue)",   bg:"rgba(0,200,255,0.08)" },
                    { icon:"🗳", title:"Vote",           desc:"Vote on proposals with your veSTK balance. Every vote counts.", color:"var(--green)",  bg:"rgba(0,200,100,0.08)" },
                    { icon:"⏰", title:"Timelock",       desc:"Passed proposals execute after 2-day safety delay.",            color:"var(--yellow)", bg:"rgba(251,191,36,0.08)" },
                    { icon:"🔓", title:"Unlock",         desc:"Retrieve your STK when lock expires. Zero penalty.",           color:"var(--green)",  bg:"rgba(0,200,100,0.08)" },
                  ].map(({ icon, title, desc, color, bg }) => (
                    <div key={title} style={{
                      display:"flex", alignItems:"center", gap:"0.85rem",
                      padding:"0.85rem 1rem",
                      background:bg,
                      border:`1px solid ${color}25`,
                      borderRadius:"12px",
                      borderLeft:`3px solid ${color}`,
                    }}>
                      <div style={{
                        width:"38px", height:"38px", flexShrink:0,
                        borderRadius:"10px",
                        background:`${color}15`,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:"1.1rem",
                      }}>
                        {icon}
                      </div>
                      <div>
                        <div style={{fontSize:"0.85rem",fontWeight:700,color:"var(--t1)",marginBottom:"0.15rem"}}>{title}</div>
                        <div style={{fontSize:"0.75rem",color:"var(--t3)",lineHeight:1.5}}>{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="yf-card" style={{padding:"1.5rem"}}>
              <h3 className="yf-h3" style={{marginBottom:"0.85rem"}}>Voting Power Table</h3>
              <div style={{display:"flex",flexDirection:"column",gap:"0"}}>
                {LOCK_OPTIONS.map((opt,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:"0.8rem",padding:"0.45rem 0",borderBottom:i<LOCK_OPTIONS.length-1?"1px solid var(--border)":"none"}}>
                    <span style={{color:"var(--t3)"}}>{opt.label}</span>
                    <span className="yf-mono" style={{color:"var(--purple)",fontWeight:600}}>{opt.multiplier}x power</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
      )}

      {/* ── DAO STATS ── */}
     {tab==="stats"&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1.25rem"}} className="grid-2">
          <div className="yf-card" style={{padding:"1.75rem"}}>
            <h3 className="yf-h3" style={{marginBottom:"1.25rem"}}>Governor Parameters</h3>
            {[
              {k:"Voting Delay",       v:`${Math.floor(votingDelaySec/86400)} day`},
              {k:"Voting Period",      v:`${Math.floor(votingPeriodSec/86400)} days`},
              {k:"Proposal Threshold", v:`${fmt(propThreshold,0)} veSTK`},
              {k:"Quorum",             v:"4% of veSTK supply"},
              {k:"Timelock Delay",     v:"2 days"},
              {k:"Governor Contract",  v:GOVERNOR_ADDR!=="0x"?`${GOVERNOR_ADDR.slice(0,6)}…${GOVERNOR_ADDR.slice(-4)}`:"Not deployed"},
              {k:"veSTK Contract",     v:VESTK_ADDR!=="0x"?`${VESTK_ADDR.slice(0,6)}…${VESTK_ADDR.slice(-4)}`:"Not deployed"},
            ].map(({k,v},i,arr)=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:"0.82rem",color:"var(--t3)",padding:"0.55rem 0",borderBottom:i<arr.length-1?"1px solid var(--border)":"none"}}>
                <span>{k}</span><strong className="yf-mono" style={{color:"var(--t2)",fontWeight:600}}>{v}</strong>
              </div>
            ))}
          </div>

          <div className="yf-card" style={{padding:"1.75rem"}}>
            <h3 className="yf-h3" style={{marginBottom:"1.25rem"}}>How to Participate</h3>
            {[
              {icon:"1️⃣", title:"Lock STK",        desc:"Go to Lock STK tab and lock your tokens to receive veSTK voting power."},
              {icon:"2️⃣", title:"Check Proposals",  desc:"Browse active proposals in the Proposals tab and read each description carefully."},
              {icon:"3️⃣", title:"Cast Your Vote",   desc:"Vote For, Against, or Abstain. Your vote is weighted by your veSTK balance."},
              {icon:"4️⃣", title:"Wait for Result",  desc:"Voting runs for 7 days. Passed proposals queue in a 2-day timelock before execution."},
              {icon:"5️⃣", title:"Unlock When Done", desc:"After your lock expires, return to unlock your STK tokens with no penalty."},
            ].map(({icon,title,desc})=>(
              <div key={title} style={{display:"flex",gap:"0.85rem",padding:"0.75rem 0",borderBottom:"1px solid var(--border)"}}>
                <span style={{fontSize:"1.1rem",flexShrink:0}}>{icon}</span>
                <div>
                  <div style={{fontSize:"0.85rem",fontWeight:600,color:"var(--t1)",marginBottom:"0.2rem"}}>{title}</div>
                  <div style={{fontSize:"0.78rem",color:"var(--t3)",lineHeight:1.5}}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}