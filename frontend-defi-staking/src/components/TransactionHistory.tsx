"use client";
import { useWatchContractEvent, useAccount } from "wagmi";
import { useState } from "react";
import { CONTRACTS_V2 as CONTRACTS } from "@/lib/wagmi";
import { STAKING_V2_ABI as STAKING_ABI } from "@/lib/abi";
import { formatUnits } from "viem";

interface TxEvent {
  type: "Staked" | "Withdrawn" | "RewardClaimed";
  amount: string;
  hash?: string;
  time: Date;
}

const typeStyle: Record<TxEvent["type"], { color: string; bgVar: string; label: string; icon: string }> = {
  Staked:        { color:"var(--green)",  bgVar:"rgba(0,200,100,0.07)",   label:"Staked",   icon:"↑" },
  Withdrawn:     { color:"var(--red)",    bgVar:"rgba(248,113,113,0.07)", label:"Withdrew", icon:"↓" },
  RewardClaimed: { color:"var(--yellow)", bgVar:"rgba(251,191,36,0.07)",  label:"Claimed",  icon:"★" },
};

export default function TransactionHistory() {
  const { address } = useAccount();
  const [events, setEvents] = useState<TxEvent[]>([]);

  const addEvent = (type: TxEvent["type"], amount: string, hash?: string) => {
    setEvents(e => [{ type, amount, hash, time: new Date() }, ...e].slice(0, 20));
  };

  useWatchContractEvent({
    address: CONTRACTS.stakingV2, abi: STAKING_ABI, eventName: "Staked",
    onLogs(logs: any[]) {
      logs.forEach(log => {
        if (log.args?.user?.toLowerCase() !== address?.toLowerCase()) return;
        addEvent("Staked", log.args?.amount ? formatUnits(log.args.amount as bigint, 18) : "0", log.transactionHash);
      });
    },
  });

  useWatchContractEvent({
    address: CONTRACTS.stakingV2, abi: STAKING_ABI, eventName: "Withdrawn",
    onLogs(logs: any[]) {
      logs.forEach(log => {
        if (log.args?.user?.toLowerCase() !== address?.toLowerCase()) return;
        addEvent("Withdrawn", log.args?.amount ? formatUnits(log.args.amount as bigint, 18) : "0", log.transactionHash);
      });
    },
  });

  useWatchContractEvent({
    address: CONTRACTS.stakingV2, abi: STAKING_ABI, eventName: "RewardClaimed",
    onLogs(logs: any[]) {
      logs.forEach(log => {
        if (log.args?.user?.toLowerCase() !== address?.toLowerCase()) return;
        addEvent("RewardClaimed", log.args?.reward ? formatUnits(log.args.reward as bigint, 18) : "0", log.transactionHash);
      });
    },
  });

  return (
    <div className="yf-card" style={{ padding:"1.75rem" }}>
      <h3 className="yf-h3" style={{ marginBottom:"1.25rem" }}>📋 Activity History</h3>

      {events.length === 0 ? (
        <div style={{ textAlign:"center", padding:"2rem 1rem", color:"var(--t4)", fontSize:"0.83rem" }}>
          <div style={{ fontSize:"2rem", marginBottom:"0.6rem" }}>📭</div>
          No activity yet in this session.<br/>
          <span style={{ fontSize:"0.73rem" }}>Events appear in real time as transactions confirm.</span>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:"0.5rem" }}>
          {events.map((ev, i) => {
            const s = typeStyle[ev.type];
            return (
              <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0.75rem 1rem", background:s.bgVar, border:`1px solid ${s.color}25`, borderRadius:"10px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"0.65rem" }}>
                  <span style={{ fontSize:"1rem", color:s.color, fontWeight:700, flexShrink:0 }}>{s.icon}</span>
                  <div>
                    <div style={{ fontSize:"0.82rem", color:s.color, fontWeight:600 }}>{s.label}</div>
                    <div style={{ fontSize:"0.72rem", color:"var(--t4)" }}>{ev.time.toLocaleTimeString()}</div>
                  </div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div className="yf-mono" style={{ fontSize:"0.85rem", fontWeight:700, color:"var(--t1)" }}>
                    {Number(ev.amount).toLocaleString("en-US", { maximumFractionDigits:4 })}
                    {ev.type === "RewardClaimed" ? " RWD" : " STK"}
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