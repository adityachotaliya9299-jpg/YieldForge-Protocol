/**
 * useSubgraph.ts
 * React hooks to query The Graph subgraph for real on-chain data.
 *
 * Setup:
 *   1. Deploy subgraph to https://thegraph.com/studio/
 *   2. Add to .env.local:
 *      NEXT_PUBLIC_SUBGRAPH_URL=https://api.studio.thegraph.com/query/<id>/<name>/version/latest
 */

import { useState, useEffect, useCallback } from "react";

const SUBGRAPH_URL = process.env.NEXT_PUBLIC_SUBGRAPH_URL ?? "";

async function query<T>(q: string, variables?: Record<string,unknown>): Promise<T | null> {
  if (!SUBGRAPH_URL) return null;
  try {
    const res = await fetch(SUBGRAPH_URL, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ query:q, variables }),
    });
    const { data, errors } = await res.json();
    if (errors) { console.error("Subgraph errors:", errors); return null; }
    return data as T;
  } catch(e) {
    console.error("Subgraph fetch error:", e);
    return null;
  }
}

// ── Types ──────────────────────────────────────────────────────
export interface SubgraphStaker {
  id:                  string;
  address:             string;
  stakedAmount:        string;
  totalRewardsClaimed: string;
  tier:                number;
  lockUntil:           string;
}

export interface SubgraphStakeEvent {
  id:          string;
  amount:      string;
  tier:        number;
  timestamp:   string;
  txHash:      string;
}

export interface SubgraphProtocolDay {
  date:         string;
  tvl:          string;
  dailyRewards: string;
  uniqueStakers: number;
}

export interface SubgraphProposal {
  id:          string;
  proposer:    string;
  description: string;
  state:       string;
  forVotes:    string;
  againstVotes:string;
  abstainVotes:string;
  timestamp:   string;
}

// ── Leaderboard ────────────────────────────────────────────────
export function useLeaderboard(limit = 10) {
  const [data,    setData]    = useState<SubgraphStaker[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const result = await query<{stakers: SubgraphStaker[]}>(`{
      stakers(
        first: ${limit}
        orderBy: stakedAmount
        orderDirection: desc
        where: { stakedAmount_gt: "0" }
      ) {
        id address stakedAmount totalRewardsClaimed tier lockUntil
      }
    }`);
    if (result?.stakers) setData(result.stakers);
    setLoading(false);
  }, [limit]);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { data, loading, refetch: fetch_ };
}

// ── Transaction history for a user ─────────────────────────────
export function useTransactionHistory(address: string | undefined) {
  const [data,    setData]    = useState<SubgraphStakeEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch_ = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    const result = await query<{staker: {stakes: SubgraphStakeEvent[]} | null}>(`{
      staker(id: "${address.toLowerCase()}") {
        stakes(first: 20, orderBy: timestamp, orderDirection: desc) {
          id amount tier timestamp txHash
        }
      }
    }`);
    if (result?.staker?.stakes) setData(result.staker.stakes);
    setLoading(false);
  }, [address]);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { data, loading, refetch: fetch_ };
}

// ── Protocol daily stats for charts ───────────────────────────
export function useProtocolDays(days = 30) {
  const [data,    setData]    = useState<SubgraphProtocolDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const result = await query<{protocolDays: SubgraphProtocolDay[]}>(`{
        protocolDays(
          first: ${days}
          orderBy: timestamp
          orderDirection: desc
        ) {
          date tvl dailyRewards uniqueStakers
        }
      }`);
      if (result?.protocolDays) setData([...result.protocolDays].reverse());
      setLoading(false);
    })();
  }, [days]);

  return { data, loading };
}

// ── Governance proposals ───────────────────────────────────────
export function useProposals() {
  const [data,    setData]    = useState<SubgraphProposal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const result = await query<{governanceProposals: SubgraphProposal[]}>(`{
        governanceProposals(
          first: 20
          orderBy: timestamp
          orderDirection: desc
        ) {
          id proposer description state
          forVotes againstVotes abstainVotes timestamp
        }
      }`);
      if (result?.governanceProposals) setData(result.governanceProposals);
      setLoading(false);
    })();
  }, []);

  return { data, loading };
}

// ── Protocol global stats ─────────────────────────────────────
export function useProtocolStats() {
  const [data,    setData]    = useState<{totalStaked:string,totalStakers:number,totalRewardsPaid:string} | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const result = await query<{protocolStats: typeof data}>(`{
        protocolStats(id: "global") {
          totalStaked totalStakers totalRewardsPaid totalFeesPaid
        }
      }`);
      if (result?.protocolStats) setData(result.protocolStats);
      setLoading(false);
    })();
  }, []);

  return { data, loading };
}