"use client";
import { useState, useEffect } from "react";
import { useAccount, useConnect, useWriteContract, useReadContract } from "wagmi";
import { injected } from "wagmi/connectors";
import { formatUnits } from "viem";
import { useToast } from "@/components/Toast";
import Link from "next/link";

const STK_ADDR = process.env.NEXT_PUBLIC_STAKING_TOKEN as `0x${string}`;
const RWD_ADDR = process.env.NEXT_PUBLIC_REWARD_TOKEN  as `0x${string}`;

const FAUCET_ABI = [
  { name:"mint",      type:"function", stateMutability:"nonpayable", inputs:[{name:"to",type:"address"},{name:"amount",type:"uint256"}], outputs:[] },
  { name:"balanceOf", type:"function", stateMutability:"view",       inputs:[{name:"account",type:"address"}], outputs:[{name:"",type:"uint256"}] },
] as const;

const AMOUNTS = [
  { label:"1,000 STK",    value:BigInt("1000000000000000000000"),     desc:"Good for testing Bronze tier" },
  { label:"10,000 STK",   value:BigInt("10000000000000000000000"),    desc:"Good for testing Silver/Gold" },
  { label:"100,000 STK",  value:BigInt("100000000000000000000000"),   desc:"Good for testing Diamond tier" },
  { label:"1,000,000 STK",value:BigInt("1000000000000000000000000"),  desc:"Maximum — whale mode 🐋" },
];

export default function FaucetPage() {
  const { address, isConnected } = useAccount();
  const { connect }              = useConnect();
  const { toast }                = useToast();
  const { writeContractAsync }   = useWriteContract();

  const [mounted,    setMounted]    = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [lastMinted, setLastMinted] = useState<string | null>(null);
  const [selected,   setSelected]   = useState(1); // default 10K

  useEffect(() => setMounted(true), []);

  // Read balances
  const { data: stkBal, refetch: refetchStk } = useReadContract({
    address: STK_ADDR, abi: FAUCET_ABI, functionName:"balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
  const { data: rwdBal, refetch: refetchRwd } = useReadContract({
    address: RWD_ADDR, abi: FAUCET_ABI, functionName:"balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const stkBalance = formatUnits((stkBal as bigint) ?? 0n, 18);
  const rwdBalance = formatUnits((rwdBal as bigint) ?? 0n, 18);

  const mint = async (token: "STK" | "RWD") => {
    if (!address) return;
    setLoading(true);
    try {
      toast(`Minting ${AMOUNTS[selected].label}…`, "pending");
      await writeContractAsync({
        address: token === "STK" ? STK_ADDR : RWD_ADDR,
        abi: FAUCET_ABI,
        functionName: "mint",
        args: [address, AMOUNTS[selected].value],
        gas: BigInt(100_000),
      });
      setLastMinted(`${AMOUNTS[selected].label} ${token}`);
      toast(`✅ Minted ${AMOUNTS[selected].label} ${token} to your wallet!`, "success");
      setTimeout(() => { refetchStk(); refetchRwd(); }, 3000);
    } catch(e: any) {
      toast(e?.shortMessage ?? e?.message ?? "Mint failed", "error");
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
        <p className="yf-sub">Get free STK and RWD tokens on Sepolia testnet. No terminal needed.</p>
      </div>

      {/* Testnet notice */}
      <div style={{ marginBottom:"1.5rem", padding:"0.85rem 1.25rem", background:"rgba(251,191,36,0.07)", border:"1px solid rgba(251,191,36,0.2)", borderRadius:"12px", fontSize:"0.82rem", color:"var(--yellow)", display:"flex", alignItems:"center", gap:"0.6rem" }}>
        <span style={{ fontSize:"1rem" }}>ℹ️</span>
        <span>These are <strong>testnet tokens only</strong> — they have no real monetary value. Use them to test staking and governance features.</span>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 380px", gap:"1.5rem", alignItems:"start" }} className="grid-stake">

        {/* Left — Mint panel */}
        <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem" }}>

          {/* Step 1 — Connect */}
          <div className="yf-card" style={{ padding:"1.75rem", borderLeft: isConnected ? "3px solid var(--green)" : "3px solid var(--border)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"0.75rem", marginBottom: isConnected ? 0 : "1rem" }}>
              <div style={{ width:"28px", height:"28px", flexShrink:0, borderRadius:"50%", background: isConnected ? "var(--green)" : "var(--bg-input)", border:`1px solid ${isConnected ? "var(--green)" : "var(--border)"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.75rem", fontWeight:700, color: isConnected ? "#040b14" : "var(--t3)" }}>
                {isConnected ? "✓" : "1"}
              </div>
              <div>
                <div style={{ fontFamily:"Syne,Georgia,serif", fontSize:"0.95rem", fontWeight:700, color:"var(--t1)" }}>Connect Wallet</div>
                {isConnected && address && (
                  <div style={{ fontSize:"0.73rem", color:"var(--green)", fontFamily:"IBM Plex Mono,monospace" }}>
                    {address.slice(0,6)}…{address.slice(-4)} ✓
                  </div>
                )}
              </div>
            </div>
            {!isConnected && (
              <button onClick={() => connect({ connector: injected() })} className="btn-primary btn-full">
                Connect MetaMask
              </button>
            )}
          </div>

          {/* Step 2 — Choose amount */}
          <div className="yf-card" style={{ padding:"1.75rem", borderLeft: "3px solid var(--blue)", opacity: isConnected ? 1 : 0.5 }}>
            <div style={{ display:"flex", alignItems:"center", gap:"0.75rem", marginBottom:"1.25rem" }}>
              <div style={{ width:"28px", height:"28px", flexShrink:0, borderRadius:"50%", background:"var(--bg-input)", border:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.75rem", fontWeight:700, color:"var(--t3)" }}>2</div>
              <div style={{ fontFamily:"Syne,Georgia,serif", fontSize:"0.95rem", fontWeight:700, color:"var(--t1)" }}>Choose Amount</div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:"0.5rem" }}>
              {AMOUNTS.map((a, i) => (
                <button key={i} onClick={() => setSelected(i)} disabled={!isConnected}
                  style={{ padding:"0.85rem 1rem", background: selected===i ? "rgba(0,200,100,0.08)" : "var(--bg-input)", border: selected===i ? "1.5px solid rgba(0,200,100,0.4)" : "1px solid var(--border)", borderRadius:"10px", cursor: isConnected ? "pointer" : "not-allowed", display:"flex", justifyContent:"space-between", alignItems:"center", fontFamily:"inherit" }}>
                  <div style={{ textAlign:"left" }}>
                    <div style={{ fontSize:"0.88rem", fontWeight: selected===i ? 700 : 500, color: selected===i ? "var(--green)" : "var(--t1)" }}>{a.label}</div>
                    <div style={{ fontSize:"0.72rem", color:"var(--t4)" }}>{a.desc}</div>
                  </div>
                  {selected===i && <span style={{ color:"var(--green)", fontSize:"1rem" }}>✓</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Step 3 — Mint */}
          <div className="yf-card" style={{ padding:"1.75rem", borderLeft:"3px solid var(--purple)", opacity: isConnected ? 1 : 0.5 }}>
            <div style={{ display:"flex", alignItems:"center", gap:"0.75rem", marginBottom:"1.25rem" }}>
              <div style={{ width:"28px", height:"28px", flexShrink:0, borderRadius:"50%", background:"var(--bg-input)", border:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.75rem", fontWeight:700, color:"var(--t3)" }}>3</div>
              <div style={{ fontFamily:"Syne,Georgia,serif", fontSize:"0.95rem", fontWeight:700, color:"var(--t1)" }}>Mint Tokens</div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.75rem" }}>
              <button onClick={() => mint("STK")} disabled={!isConnected || loading} className="btn-primary"
                style={{ padding:"0.85rem", background:"linear-gradient(135deg,var(--green),var(--blue))", border:"none", borderRadius:"10px", color:"#040b14", fontWeight:800, fontSize:"0.88rem", fontFamily:"inherit", cursor: !isConnected||loading ? "not-allowed" : "pointer" }}>
                {loading ? "⏳ Minting…" : `Mint ${AMOUNTS[selected].label}`}
                <div style={{ fontSize:"0.7rem", fontWeight:400, marginTop:"0.15rem" }}>STK Token</div>
              </button>
              <button onClick={() => mint("RWD")} disabled={!isConnected || loading}
                style={{ padding:"0.85rem", background:"linear-gradient(135deg,var(--purple),var(--blue))", border:"none", borderRadius:"10px", color:"white", fontWeight:800, fontSize:"0.88rem", fontFamily:"inherit", cursor: !isConnected||loading ? "not-allowed" : "pointer", opacity: !isConnected||loading ? 0.5 : 1 }}>
                {loading ? "⏳ Minting…" : `Mint ${AMOUNTS[selected].label}`}
                <div style={{ fontSize:"0.7rem", fontWeight:400, marginTop:"0.15rem" }}>RWD Token</div>
              </button>
            </div>
            {lastMinted && (
              <div style={{ marginTop:"0.85rem", padding:"0.65rem 0.9rem", background:"rgba(0,200,100,0.07)", border:"1px solid rgba(0,200,100,0.2)", borderRadius:"8px", fontSize:"0.8rem", color:"var(--green)" }}>
                ✅ Last minted: {lastMinted}
              </div>
            )}
          </div>
        </div>

        {/* Right — Info */}
        <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>

          {/* Your balances */}
          <div className="yf-card" style={{ padding:"1.5rem" }}>
            <div className="yf-label" style={{ marginBottom:"0.85rem" }}>Your Balances</div>
            {[
              { label:"STK Balance", value:`${fmtBal(stkBalance)} STK`, color:"var(--green)",  icon:"🏦" },
              { label:"RWD Balance", value:`${fmtBal(rwdBalance)} RWD`, color:"var(--purple)", icon:"💎" },
            ].map(({ label, value, color, icon }) => (
              <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"0.65rem 0", borderBottom:"1px solid var(--border)" }}>
                <span style={{ fontSize:"0.82rem", color:"var(--t3)" }}>{icon} {label}</span>
                <span className="yf-mono" style={{ fontSize:"0.9rem", fontWeight:700, color }}>{value}</span>
              </div>
            ))}
            <button onClick={() => { refetchStk(); refetchRwd(); }}
              style={{ marginTop:"0.75rem", width:"100%", padding:"0.45rem", background:"var(--bg-input)", border:"1px solid var(--border)", borderRadius:"8px", color:"var(--t3)", fontFamily:"inherit", fontSize:"0.78rem", cursor:"pointer" }}>
              🔄 Refresh Balance
            </button>
          </div>

          {/* What to do next */}
          <div className="yf-card" style={{ padding:"1.5rem" }}>
            <div className="yf-label" style={{ marginBottom:"0.85rem" }}>What to do next</div>
            <div style={{ display:"flex", flexDirection:"column", gap:"0.5rem" }}>
              {[
                { step:"1", text:"Get STK from faucet (done!)", done:true,  href:null },
                { step:"2", text:"Stake STK to earn RWD",        done:false, href:"/stake" },
                { step:"3", text:"Choose your tier (Bronze→Diamond)", done:false, href:"/stake" },
                { step:"4", text:"Lock STK for veSTK voting power", done:false, href:"/vestk" },
                { step:"5", text:"Mint NFT for extra boost",     done:false, href:"/nft" },
              ].map(({ step, text, done, href }) => (
                <div key={step} style={{ display:"flex", alignItems:"center", gap:"0.65rem", padding:"0.5rem 0", borderBottom:"1px solid var(--border)" }}>
                  <div style={{ width:"20px", height:"20px", flexShrink:0, borderRadius:"50%", background: done ? "var(--green)" : "var(--bg-input)", border:`1px solid ${done ? "var(--green)" : "var(--border)"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.65rem", fontWeight:700, color: done ? "#040b14" : "var(--t4)" }}>
                    {done ? "✓" : step}
                  </div>
                  {href ? (
                    <Link href={href} style={{ fontSize:"0.8rem", color:"var(--blue)", textDecoration:"none" }}>{text} →</Link>
                  ) : (
                    <span style={{ fontSize:"0.8rem", color: done ? "var(--green)" : "var(--t3)" }}>{text}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Sepolia ETH */}
          <div className="yf-card" style={{ padding:"1.5rem" }}>
            <div className="yf-label" style={{ marginBottom:"0.5rem" }}>Need Sepolia ETH for gas?</div>
            <p style={{ fontSize:"0.78rem", color:"var(--t3)", lineHeight:1.6, marginBottom:"0.85rem" }}>
              You need a small amount of Sepolia ETH to pay for transactions. Get it free from these faucets:
            </p>
            {[
              { name:"Google Cloud Faucet",  href:"https://cloud.google.com/application/web3/faucet/ethereum/sepolia" },
              { name:"Alchemy Sepolia Faucet", href:"https://sepoliafaucet.com" },
              { name:"Infura Sepolia Faucet",  href:"https://www.infura.io/faucet/sepolia" },
            ].map(({ name, href }) => (
              <a key={name} href={href} target="_blank" rel="noopener noreferrer"
                style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"0.5rem 0", borderBottom:"1px solid var(--border)", fontSize:"0.8rem", color:"var(--blue)", textDecoration:"none" }}>
                {name} <span>↗</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}