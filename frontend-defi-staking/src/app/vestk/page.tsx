"use client";
import { useState, useEffect } from "react";
import { useAccount, useConnect, useReadContracts, useWriteContract } from "wagmi";
import { injected } from "wagmi/connectors";
import { parseUnits, formatUnits } from "viem";
import { useToast } from "@/components/Toast";
import { AlertSettings } from "@/components/AlertSettings";
import { formatDuration } from "@/lib/utils";

const VESTK_ADDR = (process.env.NEXT_PUBLIC_VESTK     ?? "0x") as `0x${string}`;
const STK_ADDR   = (process.env.NEXT_PUBLIC_STAKING_TOKEN ?? "0x") as `0x${string}`;

const VESTK_ABI = [
  { name:"lock",            type:"function", stateMutability:"nonpayable", inputs:[{name:"_amount",type:"uint256"},{name:"_lockDuration",type:"uint256"}], outputs:[] },
  { name:"increaseLock",    type:"function", stateMutability:"nonpayable", inputs:[{name:"_additionalAmount",type:"uint256"}], outputs:[] },
  { name:"extendLock",      type:"function", stateMutability:"nonpayable", inputs:[{name:"_additionalDuration",type:"uint256"}], outputs:[] },
  { name:"unlock",          type:"function", stateMutability:"nonpayable", inputs:[], outputs:[] },
  { name:"balanceOf",       type:"function", stateMutability:"view",       inputs:[{name:"account",type:"address"}], outputs:[{name:"",type:"uint256"}] },
  { name:"locks",           type:"function", stateMutability:"view",       inputs:[{name:"",type:"address"}],        outputs:[{name:"amount",type:"uint256"},{name:"lockEnd",type:"uint256"},{name:"lockedAt",type:"uint256"}] },
  { name:"timeUntilUnlock", type:"function", stateMutability:"view",       inputs:[{name:"_user",type:"address"}],   outputs:[{name:"",type:"uint256"}] },
  { name:"totalLocked",     type:"function", stateMutability:"view",       inputs:[],                                outputs:[{name:"",type:"uint256"}] },
] as const;

const ERC20_ABI = [
  { name:"balanceOf", type:"function", stateMutability:"view",       inputs:[{name:"account",type:"address"}],                              outputs:[{name:"",type:"uint256"}] },
  { name:"approve",   type:"function", stateMutability:"nonpayable", inputs:[{name:"spender",type:"address"},{name:"amount",type:"uint256"}], outputs:[{name:"",type:"bool"}]  },
  { name:"allowance", type:"function", stateMutability:"view",       inputs:[{name:"owner",type:"address"},{name:"spender",type:"address"}],  outputs:[{name:"",type:"uint256"}] },
] as const;

const LOCK_OPTIONS = [
  { label:"1 Week",   days:7,    seconds: 7   * 86400, power:"0.019x" },
  { label:"1 Month",  days:30,   seconds: 30  * 86400, power:"0.082x" },
  { label:"6 Months", days:180,  seconds: 180 * 86400, power:"0.493x" },
  { label:"1 Year",   days:365,  seconds: 365 * 86400, power:"1.0x"   },
  { label:"2 Years",  days:730,  seconds: 730 * 86400, power:"2.0x"   },
  { label:"4 Years",  days:1460, seconds:1460 * 86400, power:"4.0x"   },
];

const MAX_LOCK = 4 * 365 * 86400;
const fmt = (n: string|number, dp=4) => Number(n).toLocaleString("en-US",{maximumFractionDigits:dp});

export default function VeSTKPage() {
  const { address, isConnected } = useAccount();
  const { connect }              = useConnect();
  const { toast }                = useToast();
  const { writeContractAsync }   = useWriteContract();

  const [mounted,    setMounted]    = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [lockAmt,    setLockAmt]    = useState("");
  const [addAmt,     setAddAmt]     = useState("");
  const [lockOpt,    setLockOpt]    = useState(3);
  const [extOpt,     setExtOpt]     = useState(0);
  const [countdown,  setCountdown]  = useState(0);
  const [activeTab,  setActiveTab]  = useState<"lock"|"increase"|"extend">("lock");

  useEffect(() => setMounted(true), []);

  const { data, refetch } = useReadContracts({
    contracts: [
      { address:VESTK_ADDR, abi:VESTK_ABI, functionName:"balanceOf",       args: address ? [address] : undefined },
      { address:VESTK_ADDR, abi:VESTK_ABI, functionName:"locks",           args: address ? [address] : undefined },
      { address:VESTK_ADDR, abi:VESTK_ABI, functionName:"timeUntilUnlock", args: address ? [address] : undefined },
      { address:VESTK_ADDR, abi:VESTK_ABI, functionName:"totalLocked" },
      { address:STK_ADDR,   abi:ERC20_ABI, functionName:"balanceOf",       args: address ? [address] : undefined },
      { address:STK_ADDR,   abi:ERC20_ABI, functionName:"allowance",       args: address ? [address, VESTK_ADDR] : undefined },
    ],
    query: { refetchInterval: 6000 },
  });

  const veBalance   = formatUnits((data?.[0]?.result as bigint) ?? 0n, 18);
  const lockInfo    = data?.[1]?.result as readonly [bigint,bigint,bigint] | undefined;
  const lockSecs    = Number((data?.[2]?.result as bigint) ?? 0n);
  const totalLocked = formatUnits((data?.[3]?.result as bigint) ?? 0n, 18);
  const stkBal      = formatUnits((data?.[4]?.result as bigint) ?? 0n, 18);
  const allowance   = (data?.[5]?.result as bigint) ?? 0n;

  const lockedAmt   = formatUnits(lockInfo?.[0] ?? 0n, 18);
  const lockEnd     = Number(lockInfo?.[1] ?? 0n);
  const lockedAt    = Number(lockInfo?.[2] ?? 0n);
  const hasLock     = Number(lockedAmt) > 0;
  const isUnlocked  = hasLock && lockSecs === 0;
  const needsApproval = allowance < parseUnits(lockAmt || "0", 18);

  // Countdown
  useEffect(() => {
    setCountdown(lockSecs);
    if (!lockSecs) return;
    const id = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [lockSecs]);

  const previewVe = lockAmt
    ? (Number(lockAmt) * LOCK_OPTIONS[lockOpt].seconds) / MAX_LOCK
    : 0;

  const lockProgress = hasLock && lockedAt && lockEnd
    ? Math.max(0, Math.min(100, ((Date.now()/1000 - lockedAt) / (lockEnd - lockedAt)) * 100))
    : 0;

  const run = async (fn: () => Promise<void>, successMsg: string) => {
    try {
      setLoading(true);
      await fn();
      toast(successMsg, "success");
      setTimeout(refetch, 3000);
    } catch(e: any) {
      toast(e?.shortMessage ?? e?.message ?? "Transaction failed", "error");
    } finally { setLoading(false); }
  };

  const handleApprove = () => run(async () => {
    toast("Approving STK…", "pending");
    await writeContractAsync({ address:STK_ADDR, abi:ERC20_ABI, functionName:"approve", args:[VESTK_ADDR, parseUnits("1000000000",18)], gas:BigInt(100_000) });
  }, "STK approved ✅");

  const handleLock = () => run(async () => {
    toast("Locking STK…", "pending");
    await writeContractAsync({ address:VESTK_ADDR, abi:VESTK_ABI, functionName:"lock", args:[parseUnits(lockAmt,18), BigInt(LOCK_OPTIONS[lockOpt].seconds)], gas:BigInt(250_000) });
    setLockAmt("");
  }, `Locked ${lockAmt} STK → ${previewVe.toFixed(4)} veSTK ✅`);

  const handleIncrease = () => run(async () => {
    toast("Adding to lock…", "pending");
    await writeContractAsync({ address:VESTK_ADDR, abi:VESTK_ABI, functionName:"increaseLock", args:[parseUnits(addAmt,18)], gas:BigInt(200_000) });
    setAddAmt("");
  }, `Added ${addAmt} STK to lock ✅`);

  const handleExtend = () => run(async () => {
    toast("Extending lock…", "pending");
    await writeContractAsync({ address:VESTK_ADDR, abi:VESTK_ABI, functionName:"extendLock", args:[BigInt(LOCK_OPTIONS[extOpt].seconds)], gas:BigInt(200_000) });
  }, `Lock extended by ${LOCK_OPTIONS[extOpt].label} ✅`);

  const handleUnlock = () => run(async () => {
    toast("Unlocking STK…", "pending");
    await writeContractAsync({ address:VESTK_ADDR, abi:VESTK_ABI, functionName:"unlock", gas:BigInt(180_000) });
  }, "STK unlocked ✅");

  if (!mounted) return null;

  return (
    <div className="yf-page">
      <div className="yf-page-header">
        <h1 className="yf-page-title">🔐 veSTK — Voting Power</h1>
        <p className="yf-sub">Lock STK to earn veSTK. Use veSTK to vote on protocol governance proposals.</p>
      </div>

      {/* Stats bar */}
      <div className="stat-bar" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",marginBottom:"1.5rem",borderRadius:"14px",overflow:"hidden",border:"1px solid var(--border)"}}>
        {[
          { label:"Your veSTK",      value:`${fmt(veBalance,4)} veSTK`, color:"var(--purple)" },
          { label:"STK Locked",      value:`${fmt(lockedAmt,4)} STK`,   color:"var(--blue)" },
          { label:"Total Locked",    value:`${fmt(totalLocked,2)} STK`, color:"var(--green)" },
          { label:"Unlock In",       value: isUnlocked ? "Unlocked ✅" : hasLock ? formatDuration(countdown) : "—", color: isUnlocked?"var(--green)":"var(--yellow)" },
        ].map(({label,value,color})=>(
          <div key={label} className="stat-bar-item" style={{padding:"1rem 1.25rem",background:"var(--bg-card)",borderRight:"1px solid var(--border)"}}>
            <div className="yf-label" style={{marginBottom:"0.25rem"}}>{label}</div>
            <div className="yf-mono" style={{fontSize:"0.9rem",fontWeight:700,color}}>{value}</div>
          </div>
        ))}
      </div>

      <div className="grid-stake">
        {/* Left — Action panel */}
        <div style={{display:"flex",flexDirection:"column",gap:"1.25rem"}}>

          {/* Active lock card */}
          {hasLock && (
            <div className="yf-card" style={{padding:"1.75rem",borderTop:`2px solid var(--purple)`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"1rem",flexWrap:"wrap",gap:"0.5rem"}}>
                <h3 className="yf-h3">Your Active Lock</h3>
                {isUnlocked && (
                  <button onClick={handleUnlock} disabled={loading}
                    style={{padding:"0.45rem 1rem",background:"linear-gradient(135deg,var(--green),var(--blue))",border:"none",borderRadius:"8px",color:"#040b14",fontWeight:700,fontSize:"0.82rem",fontFamily:"inherit",cursor:"pointer"}}>
                    {loading?"⏳ Unlocking…":"Unlock STK →"}
                  </button>
                )}
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.75rem",marginBottom:"1rem"}}>
                {[
                  {k:"Locked STK",  v:`${fmt(lockedAmt,4)} STK`, c:"var(--blue)"},
                  {k:"veSTK Power", v:`${fmt(veBalance,4)} veSTK`, c:"var(--purple)"},
                  {k:"Lock Status", v:isUnlocked?"✅ Unlocked":"🔒 Locked", c:isUnlocked?"var(--green)":"var(--yellow)"},
                  {k:"Unlock Date", v:lockEnd ? new Date(lockEnd*1000).toLocaleDateString() : "—", c:"var(--t2)"},
                ].map(({k,v,c})=>(
                  <div key={k} style={{padding:"0.75rem",background:"var(--bg-input)",border:"1px solid var(--border)",borderRadius:"10px"}}>
                    <div className="yf-label" style={{marginBottom:"0.25rem",fontSize:"0.62rem"}}>{k}</div>
                    <div className="yf-mono" style={{fontSize:"0.88rem",fontWeight:700,color:c}}>{v}</div>
                  </div>
                ))}
              </div>

              {/* Progress bar */}
              {!isUnlocked && (
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:"0.72rem",color:"var(--t3)",marginBottom:"0.3rem"}}>
                    <span>Lock progress</span>
                    <span>{lockProgress.toFixed(1)}% complete</span>
                  </div>
                  <div style={{height:"6px",background:"var(--bg-input)",borderRadius:"99px",overflow:"hidden",marginBottom:"0.5rem"}}>
                    <div style={{height:"100%",width:`${lockProgress}%`,background:"linear-gradient(90deg,var(--purple),var(--blue))",borderRadius:"99px"}}/>
                  </div>
                  <div style={{textAlign:"center",padding:"0.65rem",background:"rgba(160,100,250,0.07)",border:"1px solid rgba(160,100,250,0.2)",borderRadius:"10px"}}>
                    <div className="yf-mono" style={{fontSize:"1.4rem",fontWeight:800,color:"var(--purple)"}}>{formatDuration(countdown)}</div>
                    <div style={{fontSize:"0.7rem",color:"var(--t4)",marginTop:"0.15rem"}}>until unlock</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action card */}
          <div className="yf-card" style={{padding:"1.75rem"}}>
            {hasLock && !isUnlocked ? (
              <>
                {/* Tabs for existing lockers */}
                <div style={{display:"flex",gap:"0.4rem",marginBottom:"1.5rem"}}>
                  {(["increase","extend"] as const).map(t=>(
                    <button key={t} onClick={()=>setActiveTab(t)}
                      style={{flex:1,padding:"0.6rem",background:activeTab===t?"rgba(160,100,250,0.1)":"var(--bg-input)",border:activeTab===t?"1px solid rgba(160,100,250,0.35)":"1px solid var(--border)",borderRadius:"8px",color:activeTab===t?"var(--purple)":"var(--t3)",fontFamily:"inherit",fontSize:"0.82rem",cursor:"pointer",fontWeight:activeTab===t?600:400,textTransform:"capitalize"}}>
                      {t==="increase"?"Add More STK":"Extend Lock"}
                    </button>
                  ))}
                </div>

                {activeTab==="increase" && (
                  <div style={{display:"flex",flexDirection:"column",gap:"0.85rem"}}>
                    <div>
                      <div className="yf-label" style={{marginBottom:"0.4rem"}}>Additional STK to lock</div>
                      <div style={{display:"flex",gap:"0.5rem",alignItems:"center"}}>
                        <input type="number" placeholder="0.00" value={addAmt} onChange={e=>setAddAmt(e.target.value)} className="yf-input" style={{flex:1}}/>
                        <button onClick={()=>setAddAmt(stkBal)} style={{padding:"0.5rem 0.7rem",background:"rgba(160,100,250,0.1)",border:"1px solid rgba(160,100,250,0.25)",borderRadius:"6px",color:"var(--purple)",fontFamily:"inherit",fontSize:"0.72rem",fontWeight:700,cursor:"pointer",flexShrink:0}}>MAX</button>
                      </div>
                      <span style={{fontSize:"0.72rem",color:"var(--t3)",marginTop:"0.3rem",display:"block"}}>Balance: <strong style={{color:"var(--t2)"}}>{fmt(stkBal,4)} STK</strong></span>
                    </div>
                    <button className="btn-primary btn-full" disabled={loading||!addAmt||Number(addAmt)<=0}
                      style={{background:"linear-gradient(135deg,var(--purple),var(--blue))"}}
                      onClick={handleIncrease}>
                      {loading?"⏳ Adding…":"Add STK to Lock"}
                    </button>
                  </div>
                )}

                {activeTab==="extend" && (
                  <div style={{display:"flex",flexDirection:"column",gap:"0.85rem"}}>
                    <div>
                      <div className="yf-label" style={{marginBottom:"0.5rem"}}>Extend by</div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0.4rem"}}>
                        {LOCK_OPTIONS.slice(0,4).map((opt,i)=>(
                          <button key={i} onClick={()=>setExtOpt(i)}
                            style={{padding:"0.5rem",background:extOpt===i?"rgba(160,100,250,0.1)":"var(--bg-input)",border:extOpt===i?"1px solid rgba(160,100,250,0.4)":"1px solid var(--border)",borderRadius:"8px",cursor:"pointer",fontSize:"0.75rem",color:extOpt===i?"var(--purple)":"var(--t3)",fontWeight:extOpt===i?600:400,fontFamily:"inherit"}}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button className="btn-primary btn-full" disabled={loading}
                      style={{background:"linear-gradient(135deg,var(--purple),var(--blue))"}}
                      onClick={handleExtend}>
                      {loading?"⏳ Extending…":`Extend by ${LOCK_OPTIONS[extOpt].label}`}
                    </button>
                  </div>
                )}
              </>
            ) : !hasLock ? (
              <>
                <h3 className="yf-h3" style={{marginBottom:"1.25rem"}}>🔒 Lock STK → Get veSTK</h3>

                {!isConnected ? (
                  <button onClick={()=>connect({connector:injected()})} className="btn-primary btn-full">Connect Wallet</button>
                ) : (
                  <div style={{display:"flex",flexDirection:"column",gap:"0.85rem"}}>
                    <div>
                      <div className="yf-label" style={{marginBottom:"0.4rem"}}>Amount to Lock</div>
                      <div style={{display:"flex",gap:"0.5rem",alignItems:"center"}}>
                        <input type="number" placeholder="0.00" value={lockAmt} onChange={e=>setLockAmt(e.target.value)} className="yf-input" style={{flex:1}}/>
                        <button onClick={()=>setLockAmt(stkBal)} style={{padding:"0.5rem 0.7rem",background:"rgba(160,100,250,0.1)",border:"1px solid rgba(160,100,250,0.25)",borderRadius:"6px",color:"var(--purple)",fontFamily:"inherit",fontSize:"0.72rem",fontWeight:700,cursor:"pointer",flexShrink:0}}>MAX</button>
                      </div>
                      <span style={{fontSize:"0.72rem",color:"var(--t3)",marginTop:"0.3rem",display:"block"}}>Balance: <strong style={{color:"var(--t2)"}}>{fmt(stkBal,4)} STK</strong></span>
                    </div>

                    <div>
                      <div className="yf-label" style={{marginBottom:"0.5rem"}}>Lock Duration</div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0.4rem"}}>
                        {LOCK_OPTIONS.map((opt,i)=>(
                          <button key={i} onClick={()=>setLockOpt(i)}
                            style={{padding:"0.5rem 0.4rem",background:lockOpt===i?"rgba(160,100,250,0.1)":"var(--bg-input)",border:lockOpt===i?"1px solid rgba(160,100,250,0.4)":"1px solid var(--border)",borderRadius:"8px",cursor:"pointer",fontSize:"0.73rem",color:lockOpt===i?"var(--purple)":"var(--t3)",fontWeight:lockOpt===i?600:400,fontFamily:"inherit"}}>
                            {opt.label}<br/>
                            <span style={{fontSize:"0.62rem",color:"var(--t4)"}}>{opt.power}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {lockAmt && Number(lockAmt)>0 && (
                      <div style={{padding:"0.85rem 1rem",background:"rgba(160,100,250,0.07)",border:"1px solid rgba(160,100,250,0.2)",borderRadius:"10px"}}>
                        <div style={{fontSize:"0.78rem",color:"var(--t3)",marginBottom:"0.3rem"}}>You will receive:</div>
                        <div className="yf-mono" style={{fontSize:"1.2rem",fontWeight:700,color:"var(--purple)"}}>{previewVe.toFixed(4)} veSTK</div>
                        <div style={{fontSize:"0.7rem",color:"var(--t4)",marginTop:"0.2rem"}}>Locked for {LOCK_OPTIONS[lockOpt].label} · {LOCK_OPTIONS[lockOpt].power} voting power</div>
                      </div>
                    )}

                    {needsApproval && lockAmt && Number(lockAmt)>0
                      ? <button className="btn-primary btn-full" disabled={loading} onClick={handleApprove} style={{background:"linear-gradient(135deg,var(--purple),var(--blue))"}}>
                          {loading?"⏳ Approving…":"Approve STK"}
                        </button>
                      : <button className="btn-primary btn-full" disabled={loading||!lockAmt||Number(lockAmt)<=0} onClick={handleLock} style={{background:"linear-gradient(135deg,var(--purple),var(--blue))"}}>
                          {loading?"⏳ Locking…":"Lock STK → Get veSTK"}
                        </button>
                    }
                  </div>
                )}
              </>
            ) : (
              <div style={{textAlign:"center",padding:"1.5rem"}}>
                <div style={{fontSize:"2rem",marginBottom:"0.75rem"}}>✅</div>
                <div style={{fontFamily:"Syne,Georgia,serif",fontSize:"1rem",fontWeight:700,color:"var(--t1)",marginBottom:"0.5rem"}}>Lock Expired</div>
                <p style={{fontSize:"0.82rem",color:"var(--t3)",marginBottom:"1.25rem"}}>Your lock has expired. Unlock to retrieve your STK.</p>
                <button onClick={handleUnlock} disabled={loading} className="btn-primary btn-full" style={{background:"linear-gradient(135deg,var(--green),var(--blue))"}}>
                  {loading?"⏳ Unlocking…":"Unlock & Retrieve STK"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right — Info */}
        <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
          <div className="yf-card" style={{padding:"1.5rem"}}>
            
            <h3 className="yf-h3" style={{marginBottom:"1rem"}}>Voting Power Table</h3>
            {LOCK_OPTIONS.map((opt,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.5rem 0",borderBottom:i<LOCK_OPTIONS.length-1?"1px solid var(--border)":"none"}}>
                <span style={{fontSize:"0.82rem",color:"var(--t3)"}}>{opt.label}</span>
                <div style={{textAlign:"right"}}>
                  <span className="yf-mono" style={{fontSize:"0.82rem",fontWeight:700,color:"var(--purple)"}}>{opt.power}</span>
                  <div style={{fontSize:"0.68rem",color:"var(--t4)"}}>{opt.days} days</div>
                </div>
              </div>
            ))}
          </div>

          <div className="yf-card" style={{padding:"1.5rem"}}>
            <h3 className="yf-h3" style={{marginBottom:"1rem"}}>Why Lock STK?</h3>
            {[
              {icon:"🗳",  text:"Vote on protocol proposals"},
              {icon:"📈",  text:"Governance decides reward rates"},
              {icon:"💰",  text:"Governance decides performance fees"},
              {icon:"🏊",  text:"Vote to add new staking pools"},
              {icon:"🔒",  text:"STK returned when lock expires"},
              {icon:"💎",  text:"Longer lock = more voting power"},
            ].map(({icon,text})=>(
              <div key={text} style={{display:"flex",alignItems:"center",gap:"0.65rem",padding:"0.42rem 0",borderBottom:"1px solid var(--border)"}}>
                <span style={{fontSize:"0.95rem",flexShrink:0}}>{icon}</span>
                <span style={{fontSize:"0.8rem",color:"var(--t3)"}}>{text}</span>
              </div>
            ))}
            <div style={{marginTop:"0.85rem"}}>
              <a href="/governance" style={{display:"block",textAlign:"center",padding:"0.65rem",background:"rgba(160,100,250,0.08)",border:"1px solid rgba(160,100,250,0.2)",borderRadius:"10px",fontSize:"0.82rem",color:"var(--purple)",textDecoration:"none",fontWeight:600}}>
                View Active Proposals →
              </a>
            </div>
        </div>

          <AlertSettings lockEndTimestamp={lockEnd} />
        </div>
      </div>
    </div>
  );
}