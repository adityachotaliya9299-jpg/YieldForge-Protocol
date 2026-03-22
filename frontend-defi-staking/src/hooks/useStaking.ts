import { useAccount, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, formatUnits, maxUint256 } from "viem";
import { CONTRACTS_V2 } from "@/lib/wagmi";
import { STAKING_V2_ABI, ERC20_ABI } from "@/lib/abi";
import { useState, useCallback } from "react";
import type { TierId } from "@/lib/wagmi";

const ZERO_ADDR = "0x0000000000000000000000000000000000000000" as `0x${string}`;

// V1 contract address
const V1_CONTRACT = "0x84b969e7c086Ae80498e46d139F1efF10Ad8e409" as `0x${string}`;

export function useStaking() {
  const { address } = useAccount();

  // ── Batch read all contract data ──────────────────────────
  const { data, refetch } = useReadContracts({
    contracts: [
      // 0: userInfo
      { address:CONTRACTS_V2.stakingV2, abi:STAKING_V2_ABI, functionName:"userInfo",         args: address ? [address] : undefined },
      // 1: earned (base, before multiplier)
      { address:CONTRACTS_V2.stakingV2, abi:STAKING_V2_ABI, functionName:"earned",           args: address ? [address] : undefined },
      // 2: earnedAfterFee (boosted - fee)
      { address:CONTRACTS_V2.stakingV2, abi:STAKING_V2_ABI, functionName:"earnedAfterFee",   args: address ? [address] : undefined },
      // 3: currentAPR
      { address:CONTRACTS_V2.stakingV2, abi:STAKING_V2_ABI, functionName:"currentAPR" },
      // 4: totalStaked
      { address:CONTRACTS_V2.stakingV2, abi:STAKING_V2_ABI, functionName:"totalStaked" },
      // 5: timeUntilUnlock
      { address:CONTRACTS_V2.stakingV2, abi:STAKING_V2_ABI, functionName:"timeUntilUnlock",  args: address ? [address] : undefined },
      // 6: STK balance
      { address:CONTRACTS_V2.stakingToken, abi:ERC20_ABI,   functionName:"balanceOf",        args: address ? [address] : undefined },
      // 7: RWD balance
      { address:CONTRACTS_V2.rewardToken,  abi:ERC20_ABI,   functionName:"balanceOf",        args: address ? [address] : undefined },
      // 8: STK allowance for V2
      { address:CONTRACTS_V2.stakingToken, abi:ERC20_ABI,   functionName:"allowance",        args: address ? [address, CONTRACTS_V2.stakingV2] : undefined },
      // 9: performanceFeeBps
      { address:CONTRACTS_V2.stakingV2, abi:STAKING_V2_ABI, functionName:"performanceFeeBps" },
      // 10: referralEarnings
      { address:CONTRACTS_V2.stakingV2, abi:STAKING_V2_ABI, functionName:"referralEarnings", args: address ? [address] : undefined },
      // 11: referralCount
      { address:CONTRACTS_V2.stakingV2, abi:STAKING_V2_ABI, functionName:"referralCount",    args: address ? [address] : undefined },
      // 12: paused
      { address:CONTRACTS_V2.stakingV2, abi:STAKING_V2_ABI, functionName:"paused" },
      // 13: V1 userInfo (to show migration prompt)
      { address:V1_CONTRACT, abi:STAKING_V2_ABI, functionName:"userInfo", args: address ? [address] : undefined },
    ],
    query: { refetchInterval:4_000, refetchIntervalInBackground:true },
  });

  // ── Parse results ────────────────────────────────────────
  const userInfoResult = data?.[0]?.result  as readonly [bigint,bigint,bigint,bigint,bigint,number,`0x${string}`] | undefined;
  const earnedResult   = data?.[1]?.result  as bigint | undefined;
  const earnedFeeResult= data?.[2]?.result  as readonly [bigint,bigint] | undefined;
  const aprResult      = data?.[3]?.result  as bigint | undefined;
  const totalStaked    = data?.[4]?.result  as bigint | undefined;
  const lockSeconds    = data?.[5]?.result  as bigint | undefined;
  const stkBalance     = data?.[6]?.result  as bigint | undefined;
  const rwdBalance     = data?.[7]?.result  as bigint | undefined;
  const allowance      = data?.[8]?.result  as bigint | undefined;
  const perfFeeBps     = data?.[9]?.result  as bigint | undefined;
  const refEarnings    = data?.[10]?.result as bigint | undefined;
  const refCount       = data?.[11]?.result as bigint | undefined;
  const isPaused       = data?.[12]?.result as boolean | undefined;

  const stakedAmount   = userInfoResult?.[0] ?? 0n;
  const lockUntil      = userInfoResult?.[3] ?? 0n;
  const currentTier    = (userInfoResult?.[5] ?? 0) as TierId;
  const referrer       = userInfoResult?.[6] ?? ZERO_ADDR;

  // Boosted net reward (after multiplier - fee)
  const netReward      = earnedFeeResult?.[0] ?? earnedResult ?? 0n;
  const rewardFee      = earnedFeeResult?.[1] ?? 0n;
  const baseReward     = earnedResult ?? 0n;

  const aprBps         = aprResult ?? 0n;
  const aprPercent     = Number(aprBps) / 100;

  // ── Write helpers ────────────────────────────────────────
  const { writeContractAsync } = useWriteContract();
  const [txHash, setTxHash]    = useState<`0x${string}` | undefined>();
  const { isLoading: isTxPending } = useWaitForTransactionReceipt({ hash: txHash });

  const sendTx = useCallback(async (fn: () => Promise<`0x${string}`>) => {
    const hash = await fn();
    setTxHash(hash);
    setTimeout(refetch, 2_000);
    setTimeout(refetch, 6_000);
    setTimeout(refetch, 12_000);
  }, [refetch]);

  // ── Actions ──────────────────────────────────────────────
  const approve = useCallback(() =>
    sendTx(() => writeContractAsync({
      address:CONTRACTS_V2.stakingToken, abi:ERC20_ABI,
      functionName:"approve",
      args:[CONTRACTS_V2.stakingV2, maxUint256],
      gas:BigInt(100_000),
    })), [sendTx, writeContractAsync]);

  const stake = useCallback((amount: string, tier: TierId, referrerAddr?: string) =>
    sendTx(() => writeContractAsync({
      address:CONTRACTS_V2.stakingV2, abi:STAKING_V2_ABI,
      functionName:"stake",
      args:[
        parseUnits(amount, 18),
        tier,
        (referrerAddr && referrerAddr.startsWith("0x") && referrerAddr.length === 42
          ? referrerAddr as `0x${string}`
          : ZERO_ADDR),
      ],
      gas:BigInt(250_000),
    })), [sendTx, writeContractAsync]);

  const withdraw = useCallback((amount: string) =>
    sendTx(() => writeContractAsync({
      address:CONTRACTS_V2.stakingV2, abi:STAKING_V2_ABI,
      functionName:"withdraw",
      args:[parseUnits(amount, 18)],
      gas:BigInt(180_000),
    })), [sendTx, writeContractAsync]);

  const claimRewards = useCallback(() =>
    sendTx(() => writeContractAsync({
      address:CONTRACTS_V2.stakingV2, abi:STAKING_V2_ABI,
      functionName:"claimRewards",
      gas:BigInt(200_000),
    })), [sendTx, writeContractAsync]);

  const exit = useCallback(() =>
    sendTx(() => writeContractAsync({
      address:CONTRACTS_V2.stakingV2, abi:STAKING_V2_ABI,
      functionName:"exit",
      gas:BigInt(280_000),
    })), [sendTx, writeContractAsync]);

  const emergencyWithdraw = useCallback(() =>
    sendTx(() => writeContractAsync({
      address:CONTRACTS_V2.stakingV2, abi:STAKING_V2_ABI,
      functionName:"emergencyWithdraw",
      gas:BigInt(150_000),
    })), [sendTx, writeContractAsync]);

  return {
    // Balances
    stkBalance:       formatUnits(stkBalance ?? 0n, 18),
    rwdBalance:       formatUnits(rwdBalance ?? 0n, 18),
    stakedAmount:     formatUnits(stakedAmount, 18),
    totalStaked:      formatUnits(totalStaked ?? 0n, 18),
    // Rewards
    baseRewards:      formatUnits(baseReward, 18),
    netRewards:       formatUnits(netReward, 18),
    rewardFee:        formatUnits(rewardFee, 18),
    pendingRewards:   formatUnits(netReward, 18), // alias for compatibility
    // Tier
    currentTier,
    referrer,
    referralEarnings: formatUnits(refEarnings ?? 0n, 18),
    referralCount:    Number(refCount ?? 0n),
    // Lock
    lockUntil:        Number(lockUntil),
    lockSecondsLeft:  Number(lockSeconds ?? 0n),
    isLocked:         (lockSeconds ?? 0n) > 0n,
    // Protocol
    aprPercent,
    performanceFeePct:Number(perfFeeBps ?? 500n) / 100,
    isPaused:         isPaused ?? false,
    v1StakedAmount:   formatUnits((data?.[13]?.result as any)?.[0] ?? 0n, 18),
    // Allowance
    needsApproval:    (allowance ?? 0n) === 0n,
    // Actions
    approve, stake, withdraw, claimRewards, exit, emergencyWithdraw,
    isTxPending,
    refetch,
  };
}