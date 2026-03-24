"use client";
import { useWatchContractEvent, useAccount } from "wagmi";
import { useState, useEffect } from "react";
import { CONTRACTS_V2 } from "@/lib/wagmi";
import { STAKING_V2_ABI } from "@/lib/abi";
import { formatUnits } from "viem";

interface TxEvent {
  type: "Staked" | "Withdrawn" | "RewardClaimed";
  amount: string;
  hash?: string;
  time: string; // store as string for localStorage
}

const typeStyle: Record<TxEvent["type"], { color:string; bg:string; label:string; icon:string }> = {
  Staked:        { color:"var(--green)",  bg:"rgba(0,200,100,0.07)",   label:"Staked",   icon:"↑" },
  Withdrawn:     { color:"var(--red)",    bg:"rgba(248,113,113,0.07)", label:"Withdrew", icon:"↓" },
  RewardClaimed: { color:"var(--yellow)", bg:"rgba(251,191,36,0.07)",  label:"Claimed",  icon:"★" },
};

const STORAGE_KEY = (addr: string) => `yf-tx-history-${addr.toLowerCase()}`;

export default function TransactionHistory() {
  const { address } = useAccount();
  const [events, setEvents] = useState<TxEvent[]>([]);

  // Load from localStorage on mount / address change
  useEffect(() => {
    if (!address) return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY(address));
      if (saved) setEvents(JSON.parse(saved));
    } catch {}
  }, [address]);

  const addEvent = (type: TxEvent["type"], amount: string, hash?: string) => {
    setEvents(prev => {
      const newEvents = [{ type, amount, hash, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 20);
      // Persist to localStorage
      if (address) {
        try { localStorage.setItem(STORAGE_KEY(address), JSON.stringify(newEvents)); } catch {}
      }
      return newEvents;
    });
  };

  useWatchContractEvent({
    address: CONTRACTS_V2.stakingV2, abi: STAKING_V2_ABI, eventName: "Staked",
    onLogs(logs: any[]) {
      logs.forEach(log => {
        if (log.args?.user?.toLowerCase() !== address?.toLowerCase()) return;
        addEvent("Staked", log.args?.amount ? formatUnits(log.args.amount as bigint, 18) : "0", log.transactionHash);
      });
    },
  });

  useWatchContractEvent({
    address: CONTRACTS_V2.stakingV2, abi: STAKING_V2_ABI, eventName: "Withdrawn",
    onLogs(logs: any[]) {
      logs.forEach(log => {
        if (log.args?.user?.toLowerCase() !== address?.toLowerCase()) return;
        addEvent("Withdrawn", log.args?.amount ? formatUnits(log.args.amount as bigint, 18) : "0", log.transactionHash);
      });
    },
  });

  useWatchContractEvent({
    address: CONTRACTS_V2.stakingV2, abi: STAKING_V2_ABI, eventName: "RewardClaimed",
    onLogs(logs: any[]) {
      logs.forEach(log => {
        if (log.args?.user?.toLowerCase() !== address?.toLowerCase()) return;
        addEvent("RewardClaimed", log.args?.reward ? formatUnits(log.args.reward as bigint, 18) : "0", log.transactionHash);
      });
    },
  });

  const clearHistory = () => {
    setEvents([]);
    if (address) {
      try { localStorage.removeItem(STORAGE_KEY(address)); } catch {}
    }
  };

  return (
    <div className="yf-card" style={{ padding:"1.75rem" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem" }}>
        <h3 className="yf-h3">📋 Activity History</h3>
        {events.length > 0 && (
          <button onClick={clearHistory}
            style={{ fontSize:"0.72rem", color:"var(--t4)", background:"none", border:"none", cursor:"pointer", padding:"0.2rem 0.5rem" }}>
            Clear
          </button>
        )}
      </div>

      {events.length === 0 ? (
        <div style={{ textAlign:"center", padding:"2rem 1rem", color:"var(--t4)", fontSize:"0.83rem" }}>
          <div style={{ fontSize:"2rem", marginBottom:"0.6rem" }}>📭</div>
          No activity yet.<br/>
          <span style={{ fontSize:"0.73rem" }}>Events appear as transactions confirm and persist across page visits.</span>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:"0.5rem" }}>
          {events.map((ev, i) => {
            const s = typeStyle[ev.type];
            return (
              <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0.75rem 1rem", background:s.bg, border:`1px solid ${s.color}25`, borderRadius:"10px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"0.65rem" }}>
                  <span style={{ fontSize:"1rem", color:s.color, fontWeight:700, flexShrink:0 }}>{s.icon}</span>
                  <div>
                    <div style={{ fontSize:"0.82rem", color:s.color, fontWeight:600 }}>{s.label}</div>
                    <div style={{ fontSize:"0.72rem", color:"var(--t4)" }}>{ev.time}</div>
                  </div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div className="yf-mono" style={{ fontSize:"0.85rem", fontWeight:700, color:"var(--t1)" }}>
                    {Number(ev.amount).toLocaleString("en-US",{maximumFractionDigits:4})}
                    {ev.type==="RewardClaimed" ? " RWD" : " STK"}
                  </div>
                  {ev.hash && (
                    <a href={`https://sepolia.etherscan.io/tx/${ev.hash}`} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize:"0.68rem", color:"var(--green)", textDecoration:"none" }}>
                      View ↗
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}