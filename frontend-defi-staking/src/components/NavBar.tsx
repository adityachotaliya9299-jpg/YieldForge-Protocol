"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from "wagmi";
import { injected } from "wagmi/connectors";
import { sepolia } from "wagmi/chains";
import ThemeToggle from "./ThemeToggle";

const NAV_LINKS = [
  { label:"Dashboard",   href:"/",            icon:"⬡" },
  { label:"Stake",       href:"/stake",        icon:"💰" },
  { label:"Pools",       href:"/pools",        icon:"🏊" },
  { label:"Analytics",  href:"/analytics",    icon:"📊" },
  { label:"Governance", href:"/governance",   icon:"🏛" },
  { label:"NFT",        href:"/nft",          icon:"🎨" },
  { label:"veSTK",      href:"/vestk",        icon:"🔐" },
  { label:"Leaderboard",href:"/leaderboard",  icon:"🏆" },
];

const BREAKPOINT = 1100;

export default function NavBar() {
  const pathname                 = usePathname();
  const { address, isConnected } = useAccount();
  const { connect }              = useConnect();
  const { disconnect }           = useDisconnect();
  const chainId                  = useChainId();
  const { switchChain }          = useSwitchChain();
  const [mounted,   setMounted]  = useState(false);
  const [menuOpen,  setMenuOpen] = useState(false);
  const [isMobile,  setIsMobile] = useState(true);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < BREAKPOINT);
    check();
    setMounted(true);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const isWrongNetwork = mounted && isConnected && chainId !== sepolia.id;

  return (
    <>
      {/* Trust bar */}
      <div style={{ background:"var(--trust-bg)", borderBottom:"1px solid var(--border-green)", padding:"0 1rem", height:"30px", display:"flex", alignItems:"center", justifyContent:"center", gap:"1.5rem", fontSize:"0.67rem", color:"var(--t3)", overflow:"hidden", width:"100%" }}>
        {!isMobile && <span style={{whiteSpace:"nowrap"}}>🛡 Audited Contract</span>}
        {!isMobile && (
          <a href="https://sepolia.etherscan.io/address/0x47e8c6f0A59dcD5977941Bac675b891Fd4c026d2" target="_blank" rel="noopener noreferrer" style={{ color:"var(--green)", textDecoration:"none", whiteSpace:"nowrap" }}>🔗 Etherscan ↗</a>
        )}
        {!isMobile && <span style={{whiteSpace:"nowrap"}}>⚠ Not financial advice</span>}
        <span style={{whiteSpace:"nowrap"}}>🌐 Sepolia Testnet</span>
      </div>

      {/* Main Nav */}
      <nav style={{ position:"sticky", top:0, zIndex:100, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 1rem", height:"56px", background:"var(--nav-bg)", backdropFilter:"blur(24px)", borderBottom:"1px solid var(--border)", width:"100%", boxSizing:"border-box" }}>

        {/* Brand */}
        <Link href="/" style={{ display:"flex", alignItems:"center", gap:"0.5rem", textDecoration:"none", flexShrink:0 }}>
          <div style={{ width:"30px", height:"30px", flexShrink:0, borderRadius:"8px", overflow:"hidden", background:"rgba(0,200,100,0.12)", border:"1px solid rgba(0,200,100,0.25)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Image src="/logo.png" alt="YieldForge" width={25} height={25} style={{ objectFit:"contain" }} />
          </div>
          <div style={{ minWidth:0 }}>
            <div style={{ fontFamily:"Syne,Georgia,serif", fontSize: isMobile?"0.75rem":"0.85rem", fontWeight:800, color:"var(--t1)", whiteSpace:"nowrap" }}>
              {isMobile ? "YieldForge" : "YieldForge Protocol"}
            </div>
            {!isMobile && <div style={{ fontSize:"0.48rem", color:"var(--green)", letterSpacing:"0.14em", fontWeight:700 }}>FORGE YOUR YIELD</div>}
          </div>
        </Link>

        {/* Desktop nav */}
        {!isMobile && (
          <ul style={{ display:"flex", listStyle:"none", gap:"0.15rem", margin:0, padding:0, flex:1, justifyContent:"center" }}>
            {NAV_LINKS.map(({ label, href }) => {
              const active = isActive(href);
              return (
                <li key={href}>
                  <Link href={href} style={{
                    display:"flex", alignItems:"center", padding:"0.32rem 0.55rem",
                    fontSize:"0.75rem", fontWeight: active ? 700 : 500,
                    color: active ? "var(--green)" : "var(--t2)",
                    textDecoration:"none", borderRadius:"8px",
                    background: active ? "rgba(0,200,100,0.08)" : "transparent",
                    border: active ? "1px solid rgba(0,200,100,0.2)" : "1px solid transparent",
                    position:"relative", whiteSpace:"nowrap",
                    transition:"all 0.15s",
                  }}>
                    {label}
                    {active && (
                      <span style={{ position:"absolute", bottom:"-4px", left:"50%", transform:"translateX(-50%)", width:"4px", height:"4px", borderRadius:"50%", background:"var(--green)", boxShadow:"0 0 6px var(--green)", display:"block" }} />
                    )}
                  </Link>
                </li>
              );
            })}
            <li>
              <a href="https://sepolia.etherscan.io/address/0x47e8c6f0A59dcD5977941Bac675b891Fd4c026d2" target="_blank" rel="noopener noreferrer"
                style={{ display:"flex", alignItems:"center", padding:"0.32rem 0.55rem", fontSize:"0.75rem", color:"var(--t3)", textDecoration:"none", borderRadius:"8px", border:"1px solid transparent", whiteSpace:"nowrap" }}>
                Contract ↗
              </a>
            </li>
          </ul>
        )}

        {/* Right */}
        <div style={{ display:"flex", alignItems:"center", gap:"0.35rem", flexShrink:0 }}>
          <ThemeToggle />

          {mounted && !isMobile && (
            <div style={{ display:"flex", alignItems:"center", gap:"0.3rem", padding:"0.2rem 0.55rem", background:`${isWrongNetwork?"rgba(248,113,113,0.07)":"rgba(0,200,100,0.07)"}`, border:`1px solid ${isWrongNetwork?"rgba(248,113,113,0.3)":"rgba(0,200,100,0.2)"}`, borderRadius:"20px", fontSize:"0.67rem", color:isWrongNetwork?"var(--red)":"var(--green)", whiteSpace:"nowrap" }}>
              <div style={{ width:"5px", height:"5px", borderRadius:"50%", background:isWrongNetwork?"var(--red)":"var(--green)", flexShrink:0 }} />
              {isWrongNetwork ? "Wrong Net" : "Sepolia"}
            </div>
          )}

          {mounted && (
            <>
              {isWrongNetwork && (
                <button onClick={() => switchChain({ chainId: sepolia.id })}
                  style={{ padding:"0.3rem 0.55rem", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:"7px", color:"var(--red)", fontSize:"0.68rem", fontFamily:"inherit", cursor:"pointer" }}>
                  Switch
                </button>
              )}
              {isConnected ? (
                <div style={{ display:"flex", alignItems:"center", gap:"0.35rem", padding:"0.25rem 0.35rem 0.25rem 0.6rem", background:"rgba(0,200,100,0.06)", border:"1px solid rgba(0,200,100,0.18)", borderRadius:"9px" }}>
                  <div className="pulse" style={{ width:"5px", height:"5px", borderRadius:"50%", background:"var(--green)", flexShrink:0 }} />
                  {!isMobile && address && (
                    <span style={{ fontSize:"0.71rem", color:"var(--t2)", fontFamily:"IBM Plex Mono,monospace", whiteSpace:"nowrap" }}>
                      {address.slice(0,6)}…{address.slice(-4)}
                    </span>
                  )}
                  <button onClick={() => disconnect()}
                    style={{ padding:"0.16rem 0.38rem", fontSize:"0.65rem", background:"transparent", border:"1px solid var(--border)", borderRadius:"5px", color:"var(--t3)", cursor:"pointer", fontFamily:"inherit" }}>
                    ✕
                  </button>
                </div>
              ) : (
                <button onClick={() => connect({ connector: injected() })}
                  style={{ padding:"0.4rem 0.85rem", background:"linear-gradient(135deg,var(--green),var(--blue))", border:"none", borderRadius:"9px", color:"#040b14", fontWeight:700, fontSize:"0.75rem", fontFamily:"inherit", cursor:"pointer", whiteSpace:"nowrap" }}>
                  {isMobile ? "Connect" : "Connect Wallet"}
                </button>
              )}
            </>
          )}

          {/* Hamburger */}
          {isMobile && (
            <button onClick={() => setMenuOpen(o => !o)}
              style={{ width:"34px", height:"34px", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", background:"var(--bg-input)", border:"1px solid var(--border)", borderRadius:"7px", color:"var(--t2)", fontSize:"0.95rem", cursor:"pointer" }}>
              {menuOpen ? "✕" : "☰"}
            </button>
          )}
        </div>
      </nav>

      {/* Mobile Dropdown */}
      {isMobile && menuOpen && (
        <div style={{ position:"fixed", top:"86px", left:0, right:0, bottom:0, zIndex:98, background:"var(--nav-bg)", backdropFilter:"blur(20px)", overflowY:"auto" }}>
          <div style={{ borderBottom:"1px solid var(--border)" }}>
            {NAV_LINKS.map(({ label, href, icon }) => {
              const active = isActive(href);
              return (
                <Link key={href} href={href} onClick={() => setMenuOpen(false)}
                  style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0.9rem 1.5rem", fontSize:"0.95rem", color: active?"var(--green)":"var(--t1)", textDecoration:"none", borderBottom:"1px solid var(--border)", fontWeight: active?700:400, background: active?"rgba(0,200,100,0.04)":"transparent" }}>
                  <span style={{ display:"flex", alignItems:"center", gap:"0.65rem" }}>
                    <span>{icon}</span>{label}
                  </span>
                  {active && <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:"var(--green)", boxShadow:"0 0 6px var(--green)" }} />}
                </Link>
              );
            })}
            <a href="https://sepolia.etherscan.io/address/0x47e8c6f0A59dcD5977941Bac675b891Fd4c026d2" target="_blank" rel="noopener noreferrer" onClick={() => setMenuOpen(false)}
              style={{ display:"block", padding:"0.9rem 1.5rem", fontSize:"0.95rem", color:"var(--t2)", textDecoration:"none", borderBottom:"1px solid var(--border)" }}>
              Contract ↗
            </a>
          </div>
          {mounted && (
            <div style={{ padding:"1rem 1.5rem", display:"flex", flexDirection:"column", gap:"0.75rem" }}>
              {isConnected && address ? (
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0.75rem 1rem", background:"rgba(0,200,100,0.06)", border:"1px solid rgba(0,200,100,0.18)", borderRadius:"10px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
                    <div className="pulse" style={{ width:"6px", height:"6px", borderRadius:"50%", background:"var(--green)" }} />
                    <span style={{ fontSize:"0.83rem", color:"var(--green)", fontFamily:"IBM Plex Mono,monospace" }}>{address.slice(0,6)}…{address.slice(-4)}</span>
                  </div>
                  <button onClick={() => { disconnect(); setMenuOpen(false); }} style={{ padding:"0.35rem 0.75rem", background:"transparent", border:"1px solid var(--border)", borderRadius:"7px", color:"var(--t3)", fontFamily:"inherit", fontSize:"0.8rem", cursor:"pointer" }}>
                    Disconnect
                  </button>
                </div>
              ) : (
                <button onClick={() => { connect({ connector: injected() }); setMenuOpen(false); }} className="btn-primary btn-full">
                  Connect Wallet
                </button>
              )}
              <div style={{ fontSize:"0.75rem", color:"var(--t3)", display:"flex", gap:"1rem", flexWrap:"wrap" }}>
                <span>🌐 Sepolia Testnet</span>
                <span>🛡 Audited Contract</span>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}