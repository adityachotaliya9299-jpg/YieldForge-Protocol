// src/stakingV2.ts
import { BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import { Staked, Withdrawn, RewardClaimed, ReferralBonus } from "../generated/StakingV2/StakingV2";
import { Staker, StakeEvent, WithdrawEvent, ClaimEvent, ReferralEvent, ProtocolStats, ProtocolDay } from "../generated/schema";

const DECIMALS = BigDecimal.fromString("1000000000000000000"); // 1e18
const GLOBAL   = "global";

function toDecimal(val: BigInt): BigDecimal {
  return val.toBigDecimal().div(DECIMALS);
}

function getOrCreateStaker(address: string): Staker {
  let staker = Staker.load(address);
  if (!staker) {
    staker = new Staker(address);
    staker.address             = address;
    staker.stakedAmount        = BigDecimal.fromString("0");
    staker.totalRewardsClaimed = BigDecimal.fromString("0");
    staker.pendingRewards      = BigDecimal.fromString("0");
    staker.tier                = 0;
    staker.lockUntil           = BigInt.fromI32(0);
    staker.stakedAt            = BigInt.fromI32(0);

    // New staker — increment global count
    let stats = getOrCreateStats();
    stats.totalStakers = stats.totalStakers + 1;
    stats.save();
  }
  return staker;
}

function getOrCreateStats(): ProtocolStats {
  let stats = ProtocolStats.load(GLOBAL);
  if (!stats) {
    stats = new ProtocolStats(GLOBAL);
    stats.totalStaked      = BigDecimal.fromString("0");
    stats.totalStakers     = 0;
    stats.totalRewardsPaid = BigDecimal.fromString("0");
    stats.totalFeesPaid    = BigDecimal.fromString("0");
    stats.rewardRate       = BigDecimal.fromString("0");
    stats.updatedAt        = BigInt.fromI32(0);
  }
  return stats;
}

function getDayId(timestamp: BigInt): string {
  const dayTs  = timestamp.toI32() / 86400 * 86400;
  const date   = new Date(dayTs * 1000);
  return date.toISOString().split("T")[0];
}

function getOrCreateDay(timestamp: BigInt): ProtocolDay {
  const id  = getDayId(timestamp);
  let   day = ProtocolDay.load(id);
  if (!day) {
    day = new ProtocolDay(id);
    day.date          = id;
    day.tvl           = BigDecimal.fromString("0");
    day.dailyRewards  = BigDecimal.fromString("0");
    day.uniqueStakers = 0;
    day.newStakers    = 0;
    day.timestamp     = timestamp;
  }
  return day;
}

export function handleStaked(event: Staked): void {
  const addr   = event.params.user.toHexString();
  const staker = getOrCreateStaker(addr);
  const amount = toDecimal(event.params.amount);

  staker.stakedAmount = staker.stakedAmount.plus(amount);
  staker.tier         = event.params.tier;
  staker.lockUntil    = event.params.lockUntil;
  staker.stakedAt     = event.block.timestamp;
  staker.save();

  // StakeEvent
  const id   = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  const ev   = new StakeEvent(id);
  ev.user      = addr;
  ev.amount    = amount;
  ev.tier      = event.params.tier;
  ev.lockUntil = event.params.lockUntil;
  ev.timestamp = event.block.timestamp;
  ev.txHash    = event.transaction.hash.toHexString();
  ev.blockNumber = event.block.number;
  ev.save();

  // Protocol stats
  let stats = getOrCreateStats();
  stats.totalStaked = stats.totalStaked.plus(amount);
  stats.updatedAt   = event.block.timestamp;
  stats.save();

  // Day stats
  let day = getOrCreateDay(event.block.timestamp);
  day.tvl = stats.totalStaked;
  day.save();
}

export function handleWithdrawn(event: Withdrawn): void {
  const addr   = event.params.user.toHexString();
  const staker = getOrCreateStaker(addr);
  const amount = toDecimal(event.params.amount);

  staker.stakedAmount = staker.stakedAmount.minus(amount);
  if (staker.stakedAmount.lt(BigDecimal.fromString("0"))) {
    staker.stakedAmount = BigDecimal.fromString("0");
  }
  staker.save();

  const id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  const ev = new WithdrawEvent(id);
  ev.user      = addr;
  ev.amount    = amount;
  ev.timestamp = event.block.timestamp;
  ev.txHash    = event.transaction.hash.toHexString();
  ev.save();

  let stats = getOrCreateStats();
  stats.totalStaked = stats.totalStaked.minus(amount);
  if (stats.totalStaked.lt(BigDecimal.fromString("0"))) {
    stats.totalStaked = BigDecimal.fromString("0");
  }
  stats.updatedAt = event.block.timestamp;
  stats.save();
}

export function handleRewardClaimed(event: RewardClaimed): void {
  const addr   = event.params.user.toHexString();
  const staker = getOrCreateStaker(addr);
  const reward = toDecimal(event.params.reward);
  const fee    = toDecimal(event.params.fee);

  staker.totalRewardsClaimed = staker.totalRewardsClaimed.plus(reward);
  staker.save();

  const id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  const ev = new ClaimEvent(id);
  ev.user      = addr;
  ev.reward    = reward;
  ev.fee       = fee;
  ev.timestamp = event.block.timestamp;
  ev.txHash    = event.transaction.hash.toHexString();
  ev.save();

  let stats = getOrCreateStats();
  stats.totalRewardsPaid = stats.totalRewardsPaid.plus(reward);
  stats.totalFeesPaid    = stats.totalFeesPaid.plus(fee);
  stats.updatedAt        = event.block.timestamp;
  stats.save();

  let day = getOrCreateDay(event.block.timestamp);
  day.dailyRewards = day.dailyRewards.plus(reward);
  day.save();
}

export function handleReferralBonus(event: ReferralBonus): void {
  const referrerAddr = event.params.referrer.toHexString();
  const refereeAddr  = event.params.referee.toHexString();

  getOrCreateStaker(referrerAddr);
  getOrCreateStaker(refereeAddr);

  const id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  const ev = new ReferralEvent(id);
  ev.referrer  = referrerAddr;
  ev.referee   = refereeAddr;
  ev.bonus     = toDecimal(event.params.bonus);
  ev.timestamp = event.block.timestamp;
  ev.txHash    = event.transaction.hash.toHexString();
  ev.save();
}