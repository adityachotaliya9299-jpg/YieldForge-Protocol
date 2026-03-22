"use client";
import { useState, useEffect } from "react";
import { useAccount, useConnect, useReadContracts, useWriteContract } from "wagmi";
import { injected } from "wagmi/connectors";
import { formatEther, parseEther } from "viem";
import { useToast } from "@/components/Toast";

const NFT_ADDR = (process.env.NEXT_PUBLIC_NFT ?? "0x") as `0x${string}`;

const NFT_ABI = [
  { name:"mintCommon",  type:"function", stateMutability:"payable",  inputs:[], outputs:[] },
  { name:"mintRare",    type:"function", stateMutability:"payable",  inputs:[], outputs:[] },
  { name:"mintEpic",    type:"function", stateMutability:"payable",  inputs:[], outputs:[] },
  { name:"getBoostBps", type:"function", stateMutability:"view",     inputs:[{name:"_user",type:"address"}], outputs:[{name:"",type:"uint256"}] },
  { name:"hasBoost",    type:"function", stateMutability:"view",     inputs:[{name:"_user",type:"address"}], outputs:[{name:"",type:"bool"}] },
  { name:"getUserNFTs", type:"function", stateMutability:"view",     inputs:[{name:"_user",type:"address"}], outputs:[{name:"",type:"uint256[]"}] },
  { name:"commonMinted",  type:"function", stateMutability:"view",   inputs:[], outputs:[{name:"",type:"uint256"}] },
  { name:"rareMinted",    type:"function", stateMutability:"view",   inputs:[], outputs:[{name:"",type:"uint256"}] },
  { name:"epicMinted",    type:"function", stateMutability:"view",   inputs:[], outputs:[{name:"",type:"uint256"}] },
  { name:"commonPrice",   type:"function", stateMutability:"view",   inputs:[], outputs:[{name:"",type:"uint256"}] },
  { name:"rarePrice",     type:"function", stateMutability:"view",   inputs:[], outputs:[{name:"",type:"uint256"}] },
  { name:"epicPrice",     type:"function", stateMutability:"view",   inputs:[], outputs:[{name:"",type:"uint256"}] },
  { name:"nftInfo",       type:"function", stateMutability:"view",   inputs:[{name:"",type:"uint256"}], outputs:[{name:"rarity",type:"uint8"},{name:"boostBps",type:"uint256"},{name:"name",type:"string"}] },
] as const;

const TIERS = [
  { id:"common",  label:"Common",   emoji:"🥉", boost:"+10%", boostBps:1000, color:"#cd7f32", bg:"rgba(205,127,50,0.1)",  border:"rgba(205,127,50,0.3)",  fn:"mintCommon",  maxSupply:1000, desc:"Perfect for new stakers. Grants +10% reward boost on all staking.", price:"0.001" },
  { id:"rare",    label:"Rare",     emoji:"🥈", boost:"+20%", boostBps:2000, color:"#aaaaaa", bg:"rgba(170,170,170,0.1)", border:"rgba(170,170,170,0.3)", fn:"mintRare",    maxSupply:500,  desc:"For committed stakers. Doubles your edge with +20% rewards.", price:"0.005" },
  { id:"epic",    label:"Epic",     emoji:"🥇", boost:"+35%", boostBps:3500, color:"#fbbf24", bg:"rgba(251,191,36,0.1)",  border:"rgba(251,191,36,0.3)",  fn:"mintEpic",    maxSupply:100,  desc:"Elite status. +35% boost makes a serious difference at scale.", price:"0.020" },
  { id:"legendary",label:"Legendary",emoji:"💎", boost:"+50%",boostBps:5000, color:"#00c9ff", bg:"rgba(0,201,255,0.1)",   border:"rgba(0,201,255,0.3)",   fn:"",            maxSupply:10,   desc:"Owner airdrop only. Maximum +50% boost. Ultra rare.", price:"Airdrop only" },
];

const RARITY_NAMES = ["Common","Rare","Epic","Legendary"];
const RARITY_COLORS = ["#cd7f32","#aaaaaa","#fbbf24","#00c9ff"];

export default function NFTPage() {
  const { address, isConnected } = useAccount();
  const { connect }              = useConnect();
  const { toast }                = useToast();
  const { writeContractAsync }   = useWriteContract();
  const [mounted,  setMounted]   = useState(false);
  const [loading,  setLoading]   = useState<string|null>(null);

  useEffect(() => setMounted(true), []);

  const { data, refetch } = useReadContracts({
    contracts: [
      { address:NFT_ADDR, abi:NFT_ABI, functionName:"commonMinted" },
      { address:NFT_ADDR, abi:NFT_ABI, functionName:"rareMinted" },
      { address:NFT_ADDR, abi:NFT_ABI, functionName:"epicMinted" },
      { address:NFT_ADDR, abi:NFT_ABI, functionName:"commonPrice" },
      { address:NFT_ADDR, abi:NFT_ABI, functionName:"rarePrice" },
      { address:NFT_ADDR, abi:NFT_ABI, functionName:"epicPrice" },
      { address:NFT_ADDR, abi:NFT_ABI, functionName:"getBoostBps", args: address ? [address] : undefined },
      { address:NFT_ADDR, abi:NFT_ABI, functionName:"hasBoost",    args: address ? [address] : undefined },
      { address:NFT_ADDR, abi:NFT_ABI, functionName:"getUserNFTs", args: address ? [address] : undefined },
    ],
    query: { refetchInterval: 8000 },
  });

  const minted   = [Number(data?.[0]?.result ?? 0n), Number(data?.[1]?.result ?? 0n), Number(data?.[2]?.result ?? 0n), 0];
  const prices   = [data?.[3]?.result as bigint ?? parseEther("0.001"), data?.[4]?.result as bigint ?? parseEther("0.005"), data?.[5]?.result as bigint ?? parseEther("0.020")];
  const boostBps = Number(data?.[6]?.result ?? 0n);
  const hasBoost = data?.[7]?.result as boolean ?? false;
  const userNFTs = data?.[8]?.result as bigint[] ?? [];

  const boostPct = boostBps / 100;
  const boostTier = TIERS.find(t => t.boostBps === boostBps);

  const mint = async (tierId: string, price: bigint) => {
    const tier = TIERS.find(t => t.id === tierId);
    if (!tier || !tier.fn) return;
    try {
      setLoading(tierId);
      toast(`Minting ${tier.label} NFT…`, "pending");
      await writeContractAsync({
        address: NFT_ADDR,
        abi: NFT_ABI,
        functionName: tier.fn as any,
        value: price,
        gas: BigInt(300_000),
      });
      toast(`${tier.emoji} ${tier.label} NFT minted! You now have ${tier.boost} boost ✅`, "success");
      setTimeout(refetch, 3000);
    } catch(e: any) {
      toast(e?.shortMessage ?? e?.message ?? "Mint failed", "error");
    } finally {
      setLoading(null);
    }
  };

  if (!mounted) return null;

  return (
    <div className="yf-page">
      <div className="yf-page-header">
        <h1 className="yf-page-title">Boost NFTs</h1>
        <p className="yf-sub">Soulbound NFTs that permanently boost your staking rewards. Hold one to earn more.</p>
      </div>

      {/* User boost status */}
      {isConnected && (
        <div style={{ marginBottom:"1.75rem", padding:"1.25rem 1.5rem", background: hasBoost ? `${boostTier?.bg ?? "rgba(0,200,100,0.08)"}` : "var(--bg-card)", border:`1px solid ${hasBoost ? boostTier?.border ?? "rgba(0,200,100,0.2)" : "var(--border)"}`, borderRadius:"14px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"1rem" }}>
          <div>
            <div style={{ fontSize:"0.72rem", textTransform:"uppercase", letterSpacing:"0.1em", color:"var(--t3)", marginBottom:"0.35rem" }}>Your Boost Status</div>
            {hasBoost ? (
              <div>
                <div style={{ fontFamily:"Syne,Georgia,serif", fontSize:"1.25rem", fontWeight:800, color:boostTier?.color ?? "var(--green)" }}>
                  {boostTier?.emoji} {boostTier?.label} · {boostPct}% Boost Active
                </div>
                <div style={{ fontSize:"0.78rem", color:"var(--t3)", marginTop:"0.2rem" }}>
                  You hold {userNFTs.length} YieldForge NFT{userNFTs.length > 1 ? "s" : ""} · Highest boost applied
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontFamily:"Syne,Georgia,serif", fontSize:"1.1rem", fontWeight:700, color:"var(--t2)" }}>No boost active</div>
                <div style={{ fontSize:"0.78rem", color:"var(--t3)", marginTop:"0.2rem" }}>Mint a NFT below to start earning boosted rewards</div>
              </div>
            )}
          </div>
          {hasBoost && userNFTs.length > 0 && (
            <div style={{ padding:"0.6rem 1.1rem", background:"rgba(0,200,100,0.08)", border:"1px solid rgba(0,200,100,0.2)", borderRadius:"10px", textAlign:"center" }}>
              <div className="yf-mono" style={{ fontSize:"1.4rem", fontWeight:800, color:"var(--green)" }}>+{boostPct}%</div>
              <div style={{ fontSize:"0.7rem", color:"var(--t3)" }}>reward boost</div>
            </div>
          )}
        </div>
      )}

      {/* NFT Cards */}
      <div className="pool-grid-2" style={{ marginBottom:"2rem" }}>
        {TIERS.map((tier, i) => {
          const isSoldOut = i < 3 && minted[i] >= tier.maxSupply;
          const isLegendary = tier.id === "legendary";
          const alreadyOwns = hasBoost && boostTier?.id === tier.id;
          const priceEth = i < 3 ? formatEther(prices[i]) : null;

          return (
            <div key={tier.id} className="yf-card" style={{ padding:"1.75rem", border:`1px solid ${tier.border}`, borderTop:`3px solid ${tier.color}`, position:"relative" }}>
              {alreadyOwns && (
                <div style={{ position:"absolute", top:"1rem", right:"1rem", padding:"0.22rem 0.6rem", background:tier.bg, border:`1px solid ${tier.border}`, borderRadius:"20px", fontSize:"0.68rem", color:tier.color, fontWeight:700 }}>
                  ✓ YOU OWN THIS
                </div>
              )}
              {isSoldOut && !alreadyOwns && (
                <div style={{ position:"absolute", top:"1rem", right:"1rem", padding:"0.22rem 0.6rem", background:"rgba(248,113,113,0.1)", border:"1px solid rgba(248,113,113,0.3)", borderRadius:"20px", fontSize:"0.68rem", color:"var(--red)", fontWeight:700 }}>
                  SOLD OUT
                </div>
              )}

              {/* Icon */}
              <div style={{ width:"64px", height:"64px", borderRadius:"16px", background:tier.bg, border:`1px solid ${tier.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"2rem", marginBottom:"1rem" }}>
                {tier.emoji}
              </div>

              {/* Info */}
              <div style={{ fontFamily:"Syne,Georgia,serif", fontSize:"1.2rem", fontWeight:800, color:"var(--t1)", marginBottom:"0.25rem" }}>{tier.label}</div>
              <p style={{ fontSize:"0.82rem", color:"var(--t3)", lineHeight:1.6, marginBottom:"1.1rem" }}>{tier.desc}</p>

              {/* Stats */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.5rem", marginBottom:"1.1rem" }}>
                {[
                  { label:"Boost",   value:tier.boost,                                color:tier.color },
                  { label:"Supply",  value:`${isSoldOut ? tier.maxSupply : minted[i]}/${tier.maxSupply}`, color:"var(--t2)" },
                  { label:"Price",   value:priceEth ? `${priceEth} ETH` : tier.price, color:"var(--t2)" },
                  { label:"Type",    value:"Soulbound",                               color:"var(--t4)" },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ padding:"0.6rem 0.75rem", background:"var(--bg-input)", border:"1px solid var(--border)", borderRadius:"9px" }}>
                    <div className="yf-label" style={{ marginBottom:"0.18rem", fontSize:"0.6rem" }}>{label}</div>
                    <div className="yf-mono" style={{ fontSize:"0.85rem", fontWeight:700, color }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Boost bar */}
              <div style={{ marginBottom:"1.1rem" }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.7rem", color:"var(--t3)", marginBottom:"0.3rem" }}>
                  <span>Boost strength</span><span style={{ color:tier.color, fontWeight:600 }}>{tier.boost}</span>
                </div>
                <div style={{ height:"6px", background:"var(--bg-input)", borderRadius:"99px", overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${(tier.boostBps/5000)*100}%`, background:`linear-gradient(90deg,${tier.color},var(--blue))`, borderRadius:"99px" }} />
                </div>
              </div>

              {/* Mint button */}
              {isLegendary ? (
                <div style={{ textAlign:"center", padding:"0.75rem", background:"var(--bg-input)", border:"1px solid var(--border)", borderRadius:"10px", fontSize:"0.82rem", color:"var(--t4)" }}>
                  Owner airdrop only — not for sale
                </div>
              ) : isSoldOut ? (
                <div style={{ textAlign:"center", padding:"0.75rem", background:"rgba(248,113,113,0.06)", border:"1px solid rgba(248,113,113,0.2)", borderRadius:"10px", fontSize:"0.82rem", color:"var(--red)" }}>
                  Sold Out
                </div>
              ) : !isConnected ? (
                <button onClick={() => connect({ connector: injected() })}
                  style={{ width:"100%", padding:"0.75rem", background:`linear-gradient(135deg,${tier.color},var(--blue))`, border:"none", borderRadius:"10px", color:"#040b14", fontWeight:800, fontSize:"0.88rem", fontFamily:"inherit", cursor:"pointer" }}>
                  Connect to Mint
                </button>
              ) : (
                <button
                  disabled={loading === tier.id}
                  onClick={() => mint(tier.id, prices[i])}
                  style={{ width:"100%", padding:"0.75rem", background: loading===tier.id ? "var(--bg-input)" : `linear-gradient(135deg,${tier.color},var(--blue))`, border:"none", borderRadius:"10px", color: loading===tier.id ? "var(--t4)" : "#040b14", fontWeight:800, fontSize:"0.88rem", fontFamily:"inherit", cursor: loading===tier.id ? "not-allowed" : "pointer" }}>
                  {loading===tier.id ? "⏳ Minting…" : `Mint ${tier.label} — ${priceEth} ETH`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* How it works */}
      <div className="yf-card" style={{ padding:"1.75rem" }}>
        <h3 className="yf-h3" style={{ marginBottom:"1.1rem" }}>How NFT Boosts Work</h3>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"1rem" }}>
          {[
            { icon:"🎨", title:"Mint Once",     desc:"Mint a soulbound NFT. It stays permanently in your wallet — non-transferable." },
            { icon:"🔒", title:"Stake Tokens",  desc:"Stake STK in the staking contract. The contract checks if you hold a boost NFT." },
            { icon:"💰", title:"Earn More",      desc:"Your rewards are automatically multiplied by the boost percentage of your highest NFT." },
          ].map(({ icon, title, desc },i) => (
            <div key={title} style={{ padding:"1.1rem", background:"var(--bg-input)", border:"1px solid var(--border)", borderRadius:"12px", borderTop:`2px solid ${["var(--green)","var(--blue)","var(--yellow)"][i]}` }}>
              <div style={{ fontSize:"1.4rem", marginBottom:"0.5rem" }}>{icon}</div>
              <div style={{ fontFamily:"Syne,Georgia,serif", fontSize:"0.9rem", fontWeight:700, color:"var(--t1)", marginBottom:"0.35rem" }}>{title}</div>
              <div style={{ fontSize:"0.78rem", color:"var(--t3)", lineHeight:1.6 }}>{desc}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop:"1rem", padding:"0.75rem 1rem", background:"rgba(0,200,100,0.05)", border:"1px solid rgba(0,200,100,0.15)", borderRadius:"10px", fontSize:"0.78rem", color:"var(--t3)" }}>
          ℹ <strong style={{ color:"var(--t2)" }}>Only the highest boost applies</strong> — if you hold a Rare (+20%) and a Common (+10%), you get +20%. NFT boosts will be integrated into StakingV3.
        </div>
      </div>
    </div>
  );
}