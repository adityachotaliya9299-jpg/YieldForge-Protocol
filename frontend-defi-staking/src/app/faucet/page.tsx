"use client";
import { useState, useEffect } from "react";
import { useAccount, useConnect, useWriteContract, useReadContracts } from "wagmi";
import { injected } from "wagmi/connectors";
import { formatUnits } from "viem";
import { useToast } from "@/components/Toast";
import Link from "next/link";

const STK_ADDR    = process.env.NEXT_PUBLIC_STAKING_TOKEN as `0x${string}`;
const RWD_ADDR    = process.env.NEXT_PUBLIC_REWARD_TOKEN  as `0x${string}`;
const FAUCET_ADDR = process.env.NEXT_PUBLIC_FAUCET        as `0x${string}`;

const FAUCET_ABI = [
  { name:"claim",              type:"function", stateMutability:"nonpayable", inputs:[],                         outputs:[] },
  { name:"canClaim",           type:"function", stateMutability:"view",       inputs:[{name:"_user",type:"address"}], outputs:[{name:"",type:"bool"}] },
  { name:"timeUntilNextClaim", type:"function", stateMutability:"view",       inputs:[{name:"_user",type:"address"}], outputs:[{name:"",type:"uint256"}] },
  { name:"stkAmount",          type:"function", stateMutability:"view",       inputs:[],                         outputs:[{name:"",type:"uint256"}] },
  { name:"rwdAmount",          type:"function", stateMutability:"view",       inputs:[],                         outputs:[{name:"",type:"uint256"}] },
  { name:"cooldown",           type:"function", stateMutability:"view",       inputs:[],                         outputs:[{name:"",type:"uint256"}] },
] as const;

const ERC20_ABI = [
  { name:"balanceOf", type:"function", stateMutability:"view", inputs:[{name:"account",type:"address"}], outputs:[{name:"",type:"uint256"}] },
] as const;

function formatCountdown(secs: number): string {
  if (secs <= 0) return "Ready";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${h}h ${m}m ${s}s`;
}

export default function FaucetPage() {
  const { address, isConnected } = useAccount();
  const { connect }              = useConnect();
  const { toast }                = useToast();
  const { writeContractAsync }   = useWriteContract();

  const [mounted,   setMounted]   = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [lastClaimed, setLastClaimed] = useState(false);

  useEffect(() => setMounted(true), []);

  const { data, refetch } = useReadContracts({
    contracts: [
      { address:FAUCET_ADDR, abi:FAUCET_ABI, functionName:"canClaim",           args: address ? [address] : undefined },
      { address:FAUCET_ADDR, abi:FAUCET_ABI, functionName:"timeUntilNextClaim", args: address ? [address] : undefined },
      { address:FAUCET_ADDR, abi:FAUCET_ABI, functionName:"stkAmount" },
      { address:FAUCET_ADDR, abi:FAUCET_ABI, functionName:"rwdAmount" },
      { address:STK_ADDR,    abi:ERC20_ABI,  functionName:"balanceOf",          args: address ? [address] : undefined },
      { address:RWD_ADDR,    abi:ERC20_ABI,  functionName:"balanceOf",          args: address ? [address] : undefined },
    ],
    query: { refetchInterval: 10000 },
  });

  const canClaim   = (data?.[0]?.result as boolean)  ?? false;
  const timeLeft   = Number((data?.[1]?.result as bigint) ?? 0n);
  const stkAmount  = formatUnits((data?.[2]?.result as bigint) ?? 0n, 18);
  const rwdAmount  = formatUnits((data?.[3]?.result as bigint) ?? 0n, 18);
  const stkBal     = formatUnits((data?.[4]?.result as bigint) ?? 0n, 18);
  const rwdBal     = formatUnits((data?.[5]?.result as bigint) ?? 0n, 18);

  // Countdown timer
  useEffect(() => {
    setCountdown(timeLeft);
    if (!timeLeft) return;
    const id = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [timeLeft]);

  const claim = async () => {
    if (!address) return;
    setLoading(true);
    try {
      toast("Claiming tokens…", "pending");
      await writeContractAsync({
        address: FAUCET_ADDR,
        abi: FAUCET_ABI,
        functionName: "claim",
        gas: BigInt(200_000),
      });
      toast(`✅ Claimed ${Number(stkAmount).toLocaleString()} STK + ${Number(rwdAmount).toLocaleString()} RWD!`, "success");
      setLastClaimed(true);
      setTimeout(refetch, 3000);
    } catch(e: any) {
      const msg = e?.shortMessage ?? e?.message ?? "Claim failed";
      if (msg.includes("wait 24 hours")) {
        toast("Already claimed today. Come back in 24 hours!", "error");
      } else {
        toast(msg, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  const fmtBal = (n: string) => {
    const num = Number(n);
    if (num >= 1_000_000) return `${(num/1_000_000).toFixed(2)}M`;
    if (num >= 1_000)     return `${(num/1_000).toFixed(2)}K`;
    return num.toFixed(4);
  };

  return (
    <div className="yf-page">
      <div className="yf-page-header">
        <h1 className="yf-page-title">🚰 Token Faucet</h1>
        <p className="yf-sub">Get free STK and RWD tokens on Sepolia testnet. Once every 24 hours. No terminal needed.</p>
      </div>

      {/* Testnet notice */}
      <div style={{ marginBottom:"1.5rem", padding:"0.85rem 1.25rem", background:"rgba(251,191,36,0.07)", border:"1px solid rgba(251,191,36,0.2)", borderRadius:"12px", fontSize:"0.82rem", color:"var(--yellow)", display:"flex", alignItems:"center", gap:"0.6rem" }}>
        <span>ℹ️</span>
        <span>Testnet tokens only — no real monetary value. 1 claim per wallet per 24 hours.</span>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 380px", gap:"1.5rem", alignItems:"start" }} className="grid-stake">

        {/* Left — Claim panel */}
        <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>

          {/* Claim card */}
          <div className="yf-card" style={{ padding:"2rem", textAlign:"center" }}>
            <div style={{ fontSize:"3rem", marginBottom:"1rem" }}>🚰</div>
            <h2 className="yf-h2" style={{ marginBottom:"0.5rem" }}>
              {Number(stkAmount).toLocaleString()} STK + {Number(rwdAmount).toLocaleString()} RWD
            </h2>
            <p style={{ fontSize:"0.85rem", color:"var(--t3)", marginBottom:"1.75rem" }}>
              Per claim · Resets every 24 hours
            </p>

            {!isConnected ? (
              <button onClick={() => connect({ connector: injected() })} className="btn-primary btn-full" style={{ fontSize:"1rem", padding:"0.9rem" }}>
                Connect Wallet to Claim
              </button>
            ) : canClaim ? (
              <button onClick={claim} disabled={loading} className="btn-primary btn-full"
                style={{ fontSize:"1rem", padding:"0.9rem", background:"linear-gradient(135deg,var(--green),var(--blue))" }}>
                {loading ? "⏳ Claiming…" : "🚰 Claim Free Tokens"}
              </button>
            ) : (
              <div>
                <div style={{ padding:"1rem", background:"rgba(251,191,36,0.07)", border:"1px solid rgba(251,191,36,0.2)", borderRadius:"12px", marginBottom:"0.75rem" }}>
                  <div style={{ fontSize:"0.75rem", color:"var(--t4)", marginBottom:"0.25rem" }}>Next claim available in</div>
                  <div className="yf-mono" style={{ fontSize:"1.5rem", fontWeight:800, color:"var(--yellow)" }}>
                    {formatCountdown(countdown)}
                  </div>
                </div>
                <button disabled className="btn-primary btn-full" style={{ fontSize:"1rem", padding:"0.9rem", opacity:0.5, cursor:"not-allowed" }}>
                  Already Claimed Today
                </button>
              </div>
            )}

            {lastClaimed && (
              <div style={{ marginTop:"1rem", padding:"0.75rem", background:"rgba(0,200,100,0.07)", border:"1px solid rgba(0,200,100,0.2)", borderRadius:"10px", fontSize:"0.82rem", color:"var(--green)" }}>
                ✅ Tokens received! Go stake them now →{" "}
                <Link href="/stake" style={{ color:"var(--green)", fontWeight:700 }}>Stake page</Link>
              </div>
            )}
          </div>

          {/* What to do next */}
          <div className="yf-card" style={{ padding:"1.5rem" }}>
            <div className="yf-label" style={{ marginBottom:"0.85rem" }}>What to do next</div>
            {[
              { step:"1", text:"Claim STK from faucet (done!)",         done:true,  href:null },
              { step:"2", text:"Stake STK to earn RWD rewards",         done:false, href:"/stake" },
              { step:"3", text:"Choose your tier (Bronze to Diamond)",  done:false, href:"/stake" },
              { step:"4", text:"Lock STK for veSTK voting power",       done:false, href:"/vestk" },
              { step:"5", text:"Mint NFT for extra boost",              done:false, href:"/nft" },
            ].map(({ step, text, done, href }) => (
              <div key={step} style={{ display:"flex", alignItems:"center", gap:"0.65rem", padding:"0.5rem 0", borderBottom:"1px solid var(--border)" }}>
                <div style={{ width:"20px", height:"20px", flexShrink:0, borderRadius:"50%", background:done?"var(--green)":"var(--bg-input)", border:`1px solid ${done?"var(--green)":"var(--border)"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.65rem", fontWeight:700, color:done?"#040b14":"var(--t4)" }}>
                  {done ? "✓" : step}
                </div>
                {href ? (
                  <Link href={href} style={{ fontSize:"0.8rem", color:"var(--blue)", textDecoration:"none" }}>{text} →</Link>
                ) : (
                  <span style={{ fontSize:"0.8rem", color:done?"var(--green)":"var(--t3)" }}>{text}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right */}
        <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>

          {/* Balances */}
          <div className="yf-card" style={{ padding:"1.5rem" }}>
            <div className="yf-label" style={{ marginBottom:"0.85rem" }}>Your Balances</div>
            {[
              { label:"STK Balance", value:`${fmtBal(stkBal)} STK`, color:"var(--green)",  icon:"🏦" },
              { label:"RWD Balance", value:`${fmtBal(rwdBal)} RWD`, color:"var(--purple)", icon:"💎" },
            ].map(({ label, value, color, icon }) => (
              <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"0.65rem 0", borderBottom:"1px solid var(--border)" }}>
                <span style={{ fontSize:"0.82rem", color:"var(--t3)" }}>{icon} {label}</span>
                <span className="yf-mono" style={{ fontSize:"0.9rem", fontWeight:700, color }}>{isConnected ? value : "—"}</span>
              </div>
            ))}
            <button onClick={() => refetch()}
              style={{ marginTop:"0.75rem", width:"100%", padding:"0.45rem", background:"var(--bg-input)", border:"1px solid var(--border)", borderRadius:"8px", color:"var(--t3)", fontFamily:"inherit", fontSize:"0.78rem", cursor:"pointer" }}>
              🔄 Refresh Balance
            </button>
          </div>

          {/* Sepolia ETH */}
          <div className="yf-card" style={{ padding:"1.5rem" }}>
            <div className="yf-label" style={{ marginBottom:"0.5rem" }}>Need Sepolia ETH for gas?</div>
            <p style={{ fontSize:"0.78rem", color:"var(--t3)", lineHeight:1.6, marginBottom:"0.85rem" }}>
              You need Sepolia ETH to pay for transactions. Get it free:
            </p>
            {[
              { name:"Google Cloud Faucet",   href:"https://cloud.google.com/application/web3/faucet/ethereum/sepolia" },
              { name:"Alchemy Sepolia Faucet", href:"https://sepoliafaucet.com" },
              { name:"Infura Sepolia Faucet",  href:"https://www.infura.io/faucet/sepolia" },
            ].map(({ name, href }) => (
              <a key={name} href={href} target="_blank" rel="noopener noreferrer"
                style={{ display:"flex", justifyContent:"space-between", padding:"0.5rem 0", borderBottom:"1px solid var(--border)", fontSize:"0.8rem", color:"var(--blue)", textDecoration:"none" }}>
                {name} <span>↗</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}