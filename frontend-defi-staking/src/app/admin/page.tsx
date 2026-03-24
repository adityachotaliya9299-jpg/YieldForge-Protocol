"use client";
import { useState, useEffect } from "react";
import { useAccount, useReadContracts, useWriteContract } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { useToast } from "@/components/Toast";

const STAKING_V2 = (process.env.NEXT_PUBLIC_STAKING_V2  ?? "0x") as `0x${string}`;
const RWD_TOKEN  = (process.env.NEXT_PUBLIC_REWARD_TOKEN ?? "0x") as `0x${string}`;
const VAULT_ADDR = (process.env.NEXT_PUBLIC_REWARD_VAULT ?? "0x") as `0x${string}`;
const OWNER_ADDR = "0x72F668Aca488E6d5Aa847f3636aEb0B95413DEF7";

// ── ABIs ────────────────────────────────────────────────────────
const S_ABI = [
  { name:"rewardRatePerSecond", type:"function" as const, stateMutability:"view"        as const, inputs:[], outputs:[{name:"",type:"uint256"}] },
  { name:"performanceFeeBps",   type:"function" as const, stateMutability:"view"        as const, inputs:[], outputs:[{name:"",type:"uint256"}] },
  { name:"referralBonusBps",    type:"function" as const, stateMutability:"view"        as const, inputs:[], outputs:[{name:"",type:"uint256"}] },
  { name:"totalStaked",         type:"function" as const, stateMutability:"view"        as const, inputs:[], outputs:[{name:"",type:"uint256"}] },
  { name:"paused",              type:"function" as const, stateMutability:"view"        as const, inputs:[], outputs:[{name:"",type:"bool"}]    },
  { name:"treasury",            type:"function" as const, stateMutability:"view"        as const, inputs:[], outputs:[{name:"",type:"address"}] },
  { name:"setRewardRate",       type:"function" as const, stateMutability:"nonpayable"  as const, inputs:[{name:"_newRate",  type:"uint256"}], outputs:[] },
  { name:"setPerformanceFee",   type:"function" as const, stateMutability:"nonpayable"  as const, inputs:[{name:"_feeBps",   type:"uint256"}], outputs:[] },
  { name:"setReferralBonus",    type:"function" as const, stateMutability:"nonpayable"  as const, inputs:[{name:"_bps",      type:"uint256"}], outputs:[] },
  { name:"fundRewards",         type:"function" as const, stateMutability:"nonpayable"  as const, inputs:[{name:"_amount",   type:"uint256"}], outputs:[] },
  { name:"pause",               type:"function" as const, stateMutability:"nonpayable"  as const, inputs:[], outputs:[] },
  { name:"unpause",             type:"function" as const, stateMutability:"nonpayable"  as const, inputs:[], outputs:[] },
];

const E_ABI = [
  { name:"balanceOf", type:"function" as const, stateMutability:"view"       as const, inputs:[{name:"account",type:"address"}],                              outputs:[{name:"",type:"uint256"}] },
  { name:"approve",   type:"function" as const, stateMutability:"nonpayable" as const, inputs:[{name:"spender",type:"address"},{name:"amount",type:"uint256"}], outputs:[{name:"",type:"bool"}]  },
];

const V_ABI = [
  { name:"balance",       type:"function" as const, stateMutability:"view"       as const, inputs:[], outputs:[{name:"",type:"uint256"}] },
  { name:"totalReceived", type:"function" as const, stateMutability:"view"       as const, inputs:[], outputs:[{name:"",type:"uint256"}] },
  { name:"totalBurned",   type:"function" as const, stateMutability:"view"       as const, inputs:[], outputs:[{name:"",type:"uint256"}] },
  { name:"distribute",    type:"function" as const, stateMutability:"nonpayable" as const, inputs:[{name:"_stakingContract",type:"address"}], outputs:[] },
];

export default function AdminPage() {
  const { address, isConnected } = useAccount();
  const { toast }                = useToast();
  const { writeContractAsync }   = useWriteContract();
  const [mounted,  setMounted]   = useState(false);
  const [loading,  setLoading]   = useState<string|null>(null);
  const [newRate,  setNewRate]   = useState("");
  const [newFee,   setNewFee]    = useState("");
  const [newRef,   setNewRef]    = useState("");
  const [fundAmt,  setFundAmt]   = useState("");

  useEffect(() => setMounted(true), []);

  const { data, refetch } = useReadContracts({
    contracts: [
      { address:STAKING_V2, abi:S_ABI, functionName:"rewardRatePerSecond" },
      { address:STAKING_V2, abi:S_ABI, functionName:"performanceFeeBps"   },
      { address:STAKING_V2, abi:S_ABI, functionName:"referralBonusBps"    },
      { address:STAKING_V2, abi:S_ABI, functionName:"totalStaked"         },
      { address:STAKING_V2, abi:S_ABI, functionName:"paused"              },
      { address:STAKING_V2, abi:S_ABI, functionName:"treasury"            },
      { address:RWD_TOKEN,  abi:E_ABI, functionName:"balanceOf", args:[STAKING_V2] },
      { address:VAULT_ADDR, abi:V_ABI, functionName:"balance"       },
      { address:VAULT_ADDR, abi:V_ABI, functionName:"totalReceived" },
      { address:VAULT_ADDR, abi:V_ABI, functionName:"totalBurned"   },
    ],
    query: { refetchInterval:8000 },
  });

  const rewardRate    = (data?.[0]?.result ?? 0n)    as bigint;
  const feeBps        = (data?.[1]?.result ?? 500n)  as bigint;
  const refBps        = (data?.[2]?.result ?? 300n)  as bigint;
  const totalStaked   = (data?.[3]?.result ?? 0n)    as bigint;
  const isPaused      = (data?.[4]?.result ?? false) as boolean;
  const treasury      = (data?.[5]?.result ?? "—")   as string;
  const rwdInContract = (data?.[6]?.result ?? 0n)    as bigint;
  const vaultBal      = (data?.[7]?.result ?? 0n)    as bigint;
  const vaultRcvd     = (data?.[8]?.result ?? 0n)    as bigint;
  const vaultBurned   = (data?.[9]?.result ?? 0n)    as bigint;

  const isOwner = address?.toLowerCase() === OWNER_ADDR.toLowerCase();

  const run = async (label: string, fn: () => Promise<unknown>) => {
    setLoading(label);
    try {
      toast(`${label}…`, "pending");
      await fn();
      toast(`${label} ✅`, "success");
      setTimeout(refetch, 3000);
    } catch(e: unknown) {
      const msg = (e as {shortMessage?:string; message?:string})?.shortMessage
               ?? (e as {message?:string})?.message
               ?? "Failed";
      toast(msg, "error");
    } finally { setLoading(null); }
  };

  const fmt = (n: bigint) =>
    Number(formatUnits(n, 18)).toLocaleString("en-US",{maximumFractionDigits:4});

  if (!mounted) return null;

  // ── Access denied screens ────────────────────────────────────
  if (!isConnected) return (
    <div className="yf-page" style={{display:"flex",justifyContent:"center",alignItems:"center",minHeight:"60vh"}}>
      <div className="yf-card" style={{textAlign:"center",padding:"2.5rem",maxWidth:"380px",width:"100%"}}>
        <div style={{fontSize:"2.5rem",marginBottom:"1rem"}}>🔐</div>
        <h2 className="yf-h3" style={{marginBottom:"0.5rem"}}>Admin Access Required</h2>
        <p style={{fontSize:"0.83rem",color:"var(--t3)",marginBottom:"1.5rem"}}>Connect the owner wallet to access admin controls.</p>
        <p style={{fontSize:"0.75rem",color:"var(--t4)",fontFamily:"IBM Plex Mono,monospace"}}>{OWNER_ADDR.slice(0,6)}…{OWNER_ADDR.slice(-4)}</p>
      </div>
    </div>
  );

  if (!isOwner) return (
    <div className="yf-page" style={{display:"flex",justifyContent:"center",alignItems:"center",minHeight:"60vh"}}>
      <div className="yf-card" style={{textAlign:"center",padding:"2.5rem",maxWidth:"380px",width:"100%",border:"1px solid rgba(248,113,113,0.3)"}}>
        <div style={{fontSize:"2.5rem",marginBottom:"1rem"}}>⛔</div>
        <h2 className="yf-h3" style={{color:"var(--red)",marginBottom:"0.5rem"}}>Access Denied</h2>
        <p style={{fontSize:"0.83rem",color:"var(--t3)",marginBottom:"1rem"}}>Only the protocol owner can access this page.</p>
        <p style={{fontSize:"0.75rem",color:"var(--t4)",fontFamily:"IBM Plex Mono,monospace"}}>
          Connected: {address?.slice(0,6)}…{address?.slice(-4)}
        </p>
      </div>
    </div>
  );

  // ── Main admin UI ────────────────────────────────────────────
  return (
    <div className="yf-page">
      <div className="yf-page-header">
        <div style={{display:"flex",alignItems:"center",gap:"0.85rem"}}>
          <h1 className="yf-page-title" style={{marginBottom:0}}>⚙️ Admin Panel</h1>
          <span style={{padding:"0.22rem 0.7rem",background:"rgba(0,200,100,0.1)",border:"1px solid rgba(0,200,100,0.25)",borderRadius:"20px",fontSize:"0.7rem",color:"var(--green)",fontWeight:700}}>
            ● Owner Connected
          </span>
        </div>
        <p className="yf-sub">Protocol owner controls — manage reward rates, fees, and treasury.</p>
      </div>

      {/* Paused banner */}
      {isPaused && (
        <div style={{marginBottom:"1.5rem",padding:"1rem 1.25rem",background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.35)",borderRadius:"12px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"0.75rem"}}>
          <div>
            <div style={{fontSize:"0.9rem",fontWeight:700,color:"var(--red)",marginBottom:"0.2rem"}}>⚠️ Protocol is PAUSED</div>
            <div style={{fontSize:"0.8rem",color:"var(--t3)"}}>Users cannot stake or claim. Emergency withdrawals are enabled.</div>
          </div>
          <button disabled={loading!==null}
            onClick={() => run("Unpausing", () => writeContractAsync({address:STAKING_V2,abi:S_ABI,functionName:"unpause",gas:BigInt(100_000)}))}
            style={{padding:"0.55rem 1.25rem",background:"linear-gradient(135deg,var(--green),var(--blue))",border:"none",borderRadius:"9px",color:"#040b14",fontWeight:700,fontSize:"0.88rem",fontFamily:"inherit",cursor:"pointer"}}>
            {loading==="Unpausing" ? "⏳…" : "✅ Unpause"}
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid-4" style={{marginBottom:"2rem"}}>
        {[
          {label:"Total Staked",    value:`${fmt(totalStaked)} STK`,   color:"var(--green)",  icon:"🏦"},
          {label:"RWD in Contract", value:`${fmt(rwdInContract)} RWD`, color:"var(--purple)", icon:"💰"},
          {label:"Vault Balance",   value:`${fmt(vaultBal)} RWD`,      color:"var(--blue)",   icon:"🏛"},
          {label:"Status",          value:isPaused?"PAUSED ⚠️":"LIVE ✅", color:isPaused?"var(--red)":"var(--green)", icon:"📡"},
        ].map(({label,value,color,icon}) => (
          <div key={label} className="yf-card" style={{padding:"1.25rem",borderTop:`2px solid ${color}`}}>
            <div style={{fontSize:"1.2rem",marginBottom:"0.4rem"}}>{icon}</div>
            <div className="yf-label" style={{marginBottom:"0.35rem"}}>{label}</div>
            <div className="yf-mono" style={{fontSize:"0.95rem",fontWeight:700,color}}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1.5rem"}} className="grid-2">

        {/* Reward Rate */}
        <div className="yf-card" style={{padding:"1.75rem"}}>
          <h3 className="yf-h3" style={{marginBottom:"0.35rem"}}>⚡ Reward Rate</h3>
          <p style={{fontSize:"0.78rem",color:"var(--t3)",marginBottom:"1.25rem"}}>
            Current: <strong style={{color:"var(--green)",fontFamily:"IBM Plex Mono,monospace"}}>
              {Number(formatUnits(rewardRate,18)).toFixed(6)} RWD/sec
            </strong>
          </p>
          <div className="yf-label" style={{marginBottom:"0.4rem"}}>New rate (RWD/sec)</div>
          <input type="number" placeholder="e.g. 0.001" step="0.0001" value={newRate}
            onChange={e=>setNewRate(e.target.value)} className="yf-input" style={{marginBottom:"0.75rem"}}/>
          <div style={{display:"flex",gap:"0.4rem",flexWrap:"wrap",marginBottom:"0.75rem"}}>
            {[["0.0001","Slow"],["0.001","Normal"],["0.01","Fast"],["0.1","Max"]].map(([v,l])=>(
              <button key={v} onClick={()=>setNewRate(v)}
                style={{padding:"0.3rem 0.65rem",fontSize:"0.73rem",background:"var(--bg-input)",border:"1px solid var(--border)",borderRadius:"6px",cursor:"pointer",color:"var(--t3)",fontFamily:"inherit"}}>
                {v} ({l})
              </button>
            ))}
          </div>
          <button disabled={!newRate||loading!==null} className="btn-primary btn-full"
            onClick={() => {
              const rate = parseUnits(newRate || "0", 18);
              run("Updating reward rate", () =>
                writeContractAsync({address:STAKING_V2,abi:S_ABI,functionName:"setRewardRate",args:[rate],gas:BigInt(120_000)})
              );
            }}>
            {loading==="Updating reward rate" ? "⏳ Updating…" : "Update Reward Rate"}
          </button>
        </div>

        {/* Performance Fee */}
        <div className="yf-card" style={{padding:"1.75rem"}}>
          <h3 className="yf-h3" style={{marginBottom:"0.35rem"}}>💸 Performance Fee</h3>
          <p style={{fontSize:"0.78rem",color:"var(--t3)",marginBottom:"1.25rem"}}>
            Current: <strong style={{color:"var(--yellow)",fontFamily:"IBM Plex Mono,monospace"}}>
              {Number(feeBps)/100}%
            </strong> · Max: 20%
          </p>
          <div className="yf-label" style={{marginBottom:"0.4rem"}}>New fee %</div>
          <input type="number" placeholder="e.g. 5" min="0" max="20" value={newFee}
            onChange={e=>setNewFee(e.target.value)} className="yf-input" style={{marginBottom:"0.75rem"}}/>
          <div style={{display:"flex",gap:"0.4rem",marginBottom:"0.75rem"}}>
            {["0","2","5","10"].map(v=>(
              <button key={v} onClick={()=>setNewFee(v)}
                style={{flex:1,padding:"0.3rem",fontSize:"0.73rem",background:"var(--bg-input)",border:"1px solid var(--border)",borderRadius:"6px",cursor:"pointer",color:"var(--t3)",fontFamily:"inherit"}}>
                {v}%
              </button>
            ))}
          </div>
          <button disabled={!newFee||loading!==null} className="btn-primary btn-full"
            style={{background:"linear-gradient(135deg,var(--yellow),var(--green))"}}
            onClick={() => {
              const feeVal = BigInt(Math.round(Number(newFee) * 100));
              run("Updating fee", () =>
                writeContractAsync({address:STAKING_V2,abi:S_ABI,functionName:"setPerformanceFee",args:[feeVal],gas:BigInt(80_000)})
              );
            }}>
            {loading==="Updating fee" ? "⏳ Updating…" : "Update Fee"}
          </button>
        </div>

        {/* Referral Bonus */}
        <div className="yf-card" style={{padding:"1.75rem"}}>
          <h3 className="yf-h3" style={{marginBottom:"0.35rem"}}>🔗 Referral Bonus</h3>
          <p style={{fontSize:"0.78rem",color:"var(--t3)",marginBottom:"1.25rem"}}>
            Current: <strong style={{color:"var(--blue)",fontFamily:"IBM Plex Mono,monospace"}}>
              {Number(refBps)/100}%
            </strong> · Max: 10%
          </p>
          <div className="yf-label" style={{marginBottom:"0.4rem"}}>New bonus %</div>
          <input type="number" placeholder="e.g. 3" min="0" max="10" value={newRef}
            onChange={e=>setNewRef(e.target.value)} className="yf-input" style={{marginBottom:"0.75rem"}}/>
          <div style={{display:"flex",gap:"0.4rem",marginBottom:"0.75rem"}}>
            {["0","1","3","5"].map(v=>(
              <button key={v} onClick={()=>setNewRef(v)}
                style={{flex:1,padding:"0.3rem",fontSize:"0.73rem",background:"var(--bg-input)",border:"1px solid var(--border)",borderRadius:"6px",cursor:"pointer",color:"var(--t3)",fontFamily:"inherit"}}>
                {v}%
              </button>
            ))}
          </div>
          <button disabled={!newRef||loading!==null} className="btn-primary btn-full"
            style={{background:"linear-gradient(135deg,var(--blue),var(--purple))"}}
            onClick={() => {
              const refVal = BigInt(Math.round(Number(newRef) * 100));
              run("Updating referral", () =>
                writeContractAsync({address:STAKING_V2,abi:S_ABI,functionName:"setReferralBonus",args:[refVal],gas:BigInt(80_000)})
              );
            }}>
            {loading==="Updating referral" ? "⏳ Updating…" : "Update Referral Bonus"}
          </button>
        </div>

        {/* Fund Rewards */}
        <div className="yf-card" style={{padding:"1.75rem"}}>
          <h3 className="yf-h3" style={{marginBottom:"0.35rem"}}>💰 Fund Rewards</h3>
          <p style={{fontSize:"0.78rem",color:"var(--t3)",marginBottom:"1.25rem"}}>
            RWD in contract: <strong style={{color:"var(--purple)",fontFamily:"IBM Plex Mono,monospace"}}>{fmt(rwdInContract)}</strong>
          </p>
          <div className="yf-label" style={{marginBottom:"0.4rem"}}>Amount to fund (RWD)</div>
          <input type="number" placeholder="e.g. 100000" value={fundAmt}
            onChange={e=>setFundAmt(e.target.value)} className="yf-input" style={{marginBottom:"0.75rem"}}/>
          <div style={{display:"flex",gap:"0.4rem",marginBottom:"0.75rem"}}>
            {[["10000","10K"],["100000","100K"],["500000","500K"],["1000000","1M"]].map(([v,l])=>(
              <button key={v} onClick={()=>setFundAmt(v)}
                style={{flex:1,padding:"0.3rem",fontSize:"0.73rem",background:"var(--bg-input)",border:"1px solid var(--border)",borderRadius:"6px",cursor:"pointer",color:"var(--t3)",fontFamily:"inherit"}}>
                {l}
              </button>
            ))}
          </div>
          <button disabled={!fundAmt||loading!==null} className="btn-primary btn-full"
            style={{background:"linear-gradient(135deg,var(--purple),var(--blue))"}}
            onClick={() => {
              const parsed = parseUnits(fundAmt, 18);
              run("Funding rewards", async () => {
                await writeContractAsync({address:RWD_TOKEN,abi:E_ABI,functionName:"approve",args:[STAKING_V2,parsed],gas:BigInt(100_000)});
                await writeContractAsync({address:STAKING_V2,abi:S_ABI,functionName:"fundRewards",args:[parsed],gas:BigInt(150_000)});
              });
            }}>
            {loading==="Funding rewards" ? "⏳ Funding…" : "Approve & Fund"}
          </button>
        </div>
      </div>

      {/* Vault + Emergency */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1.5rem",marginTop:"1.5rem"}} className="grid-2">

        <div className="yf-card" style={{padding:"1.75rem"}}>
          <h3 className="yf-h3" style={{marginBottom:"1.25rem"}}>🏛 RewardVault</h3>
          {[
            {k:"Vault Balance",  v:`${fmt(vaultBal)} RWD`,    c:"var(--green)"},
            {k:"Total Received", v:`${fmt(vaultRcvd)} RWD`,   c:"var(--t2)"},
            {k:"Total Burned",   v:`${fmt(vaultBurned)} RWD`, c:"var(--red)"},
            {k:"Treasury",       v:typeof treasury==="string"&&treasury.length>6?`${treasury.slice(0,6)}…${treasury.slice(-4)}`:"—", c:"var(--t2)"},
          ].map(({k,v,c})=>(
            <div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:"0.82rem",color:"var(--t3)",padding:"0.5rem 0",borderBottom:"1px solid var(--border)"}}>
              <span>{k}</span>
              <strong className="yf-mono" style={{color:c,fontWeight:600}}>{v}</strong>
            </div>
          ))}
          <button disabled={loading!==null} className="btn-outline btn-full" style={{marginTop:"1rem"}}
            onClick={() => run("Distributing vault", () =>
              writeContractAsync({address:VAULT_ADDR,abi:V_ABI,functionName:"distribute",args:[STAKING_V2],gas:BigInt(200_000)})
            )}>
            {loading==="Distributing vault" ? "⏳ Distributing…" : "Distribute Vault Funds"}
          </button>
        </div>

        <div className="yf-card" style={{padding:"1.75rem",border:"1px solid rgba(248,113,113,0.2)"}}>
          <h3 className="yf-h3" style={{marginBottom:"0.35rem",color:"var(--red)"}}>🚨 Emergency Controls</h3>
          <p style={{fontSize:"0.78rem",color:"var(--t3)",lineHeight:1.6,marginBottom:"1.25rem"}}>
            Pause halts all staking. Users can still emergency withdraw. Use only in a security incident.
          </p>
          <div style={{display:"flex",flexDirection:"column",gap:"0.75rem"}}>
            <button disabled={isPaused||loading!==null}
              onClick={() => run("Pausing", () =>
                writeContractAsync({address:STAKING_V2,abi:S_ABI,functionName:"pause",gas:BigInt(80_000)})
              )}
              style={{padding:"0.85rem",background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.35)",borderRadius:"10px",color:"var(--red)",fontFamily:"inherit",fontWeight:700,fontSize:"0.88rem",cursor:isPaused||loading?"not-allowed":"pointer",opacity:isPaused?0.4:1}}>
              {loading==="Pausing" ? "⏳ Pausing…" : "⏸ Pause Protocol"}
            </button>
            <button disabled={!isPaused||loading!==null}
              onClick={() => run("Unpausing", () =>
                writeContractAsync({address:STAKING_V2,abi:S_ABI,functionName:"unpause",gas:BigInt(80_000)})
              )}
              style={{padding:"0.85rem",background:"rgba(0,200,100,0.08)",border:"1px solid rgba(0,200,100,0.3)",borderRadius:"10px",color:"var(--green)",fontFamily:"inherit",fontWeight:700,fontSize:"0.88rem",cursor:!isPaused||loading?"not-allowed":"pointer",opacity:!isPaused?0.4:1}}>
              {loading==="Unpausing" ? "⏳ Unpausing…" : "▶ Unpause Protocol"}
            </button>
          </div>
          <div style={{marginTop:"1rem",padding:"0.65rem 0.85rem",background:"rgba(248,113,113,0.05)",border:"1px solid rgba(248,113,113,0.15)",borderRadius:"8px",fontSize:"0.73rem",color:"var(--red)",lineHeight:1.5}}>
            ⚠ Pausing affects all users immediately.
          </div>
        </div>
      </div>
    </div>
  );
}