import { createConfig, http } from "wagmi";
import { sepolia, hardhat } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID!;

export const config = createConfig({
  chains: [sepolia, hardhat],
  connectors: [
    injected(),
    walletConnect({ projectId }),
  ],
  transports: {
    [sepolia.id]:  http(process.env.NEXT_PUBLIC_RPC_SEPOLIA),
    [hardhat.id]:  http("http://127.0.0.1:8545"),
  },
});

// ── V1 Contracts (still active) ──────────────────────────────
export const CONTRACTS_V1 = {
  stakingToken:    process.env.NEXT_PUBLIC_STAKING_TOKEN    as `0x${string}`,
  rewardToken:     process.env.NEXT_PUBLIC_REWARD_TOKEN     as `0x${string}`,
  stakingContract: process.env.NEXT_PUBLIC_STAKING_CONTRACT as `0x${string}`,
};

// ── V2 Contracts ─────────────────────────────────────────────
export const CONTRACTS_V2 = {
  stakingToken:    process.env.NEXT_PUBLIC_STAKING_TOKEN    as `0x${string}`,
  rewardToken:     process.env.NEXT_PUBLIC_REWARD_TOKEN     as `0x${string}`,
  stakingV2:       process.env.NEXT_PUBLIC_STAKING_V2       as `0x${string}`,
  rewardVault:     process.env.NEXT_PUBLIC_REWARD_VAULT     as `0x${string}`,
  autoCompounder:  process.env.NEXT_PUBLIC_AUTO_COMPOUNDER  as `0x${string}`,
};

// Default to V2
export const CONTRACTS = CONTRACTS_V2;

// ── Tier config (mirrors contract) ───────────────────────────
export const TIERS = [
  { id: 0, name:"Bronze",  emoji:"🥉", lockDays:7,   multiplier:1.0, multiplierBps:10000, color:"#cd7f32", desc:"Best for short-term stakers" },
  { id: 1, name:"Silver",  emoji:"🥈", lockDays:30,  multiplier:1.5, multiplierBps:15000, color:"#aaaaaa", desc:"50% more rewards, 30-day lock" },
  { id: 2, name:"Gold",    emoji:"🥇", lockDays:90,  multiplier:2.0, multiplierBps:20000, color:"#fbbf24", desc:"Double rewards, 90-day lock" },
  { id: 3, name:"Diamond", emoji:"💎", lockDays:365, multiplier:3.0, multiplierBps:30000, color:"#00c9ff", desc:"Triple rewards, 1-year lock" },
] as const;

export type TierId = 0 | 1 | 2 | 3;