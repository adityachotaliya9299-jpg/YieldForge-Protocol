# YieldForge Protocol — Technical Whitepaper

**Version:** 1.0  
**Network:** Ethereum Sepolia (Testnet) → Arbitrum (Mainnet)  
**Author:** Aditya Chotaliya  
**Date:** March 2026

---

## Abstract

YieldForge Protocol is a non-custodial, decentralized staking platform built on Ethereum. Users stake STK tokens and earn RWD rewards proportional to their stake and chosen lock tier. The protocol introduces vote-escrowed governance (veSTK), NFT-based reward boosts, and an auto-compounding vault — creating a comprehensive DeFi yield ecosystem with on-chain governance.

---

## 1. Introduction

### 1.1 Problem Statement

Existing DeFi staking protocols suffer from:
- **Short-term extractive behavior** — users stake briefly, extract rewards, exit
- **Whale dominance** — large holders dilute small staker rewards
- **No governance alignment** — token holders have no direct protocol control
- **Passive yield only** — no mechanisms to incentivize long-term commitment

### 1.2 YieldForge Solution

YieldForge addresses these through:
- **Lock-weighted rewards** — longer commitment = higher multiplier (1x → 3x)
- **Vote-escrowed governance** — veSTK aligns long-term holders with protocol health
- **NFT boost system** — additional incentives for protocol participants
- **Transparent treasury** — all fees flow to verifiable on-chain vault

---

## 2. Protocol Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   YieldForge Protocol                   │
│                                                         │
│  ┌──────────┐   ┌──────────┐   ┌──────────────────┐     │
│  │ StakingV2│   │  VeSTK   │   │  YieldForgeNFT   │     │
│  │  (Core)  │   │ (Govern) │   │  (Boost NFTs)    │     │
│  └────┬─────┘   └────┬─────┘   └──────────────────┘     │
│       │              │                                  │
│  ┌────▼─────┐   ┌────▼──────────────────────────────┐   │
│  │  Reward  │   │         Governor + Timelock       │   │
│  │  Vault   │   │         (DAO Execution)           │   │
│  └──────────┘   └───────────────────────────────────┘   │
│                                                         │
│  ┌──────────┐   ┌──────────┐   ┌──────────────────┐     │
│  │  Auto-   │   │  Price   │   │    The Graph     │     │
│  │Compounder│   │  Oracle  │   │   (Indexing)     │     │
│  └──────────┘   └──────────┘   └──────────────────┘     │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Token Economics

### 3.1 Tokens

| Token | Symbol | Type | Supply |
|---|---|---|---|
| Staking Token | STK | ERC20 | 1,000,000 |
| Reward Token | RWD | ERC20 | 10,000,000 |
| Vote-Escrowed | veSTK | Non-transferable ERC20Votes | Variable |
| Vault Share | xSTK | ERC20 | Variable |

### 3.2 Reward Emission

```
Reward Rate: 0.001 RWD per second
Annual Emission: 0.001 × 31,536,000 = 31,536 RWD/year

APR Formula:
APR (%) = (rewardRate × SECONDS_PER_YEAR × 100) / totalStaked

At 1,000 STK TVL:  APR = 3,153%
At 10,000 STK TVL: APR = 315%
At 100,000 STK TVL: APR = 31.5%
At 1,000,000 STK TVL: APR = 3.15%
```

### 3.3 Fee Structure

| Fee | Amount | Destination |
|---|---|---|
| Performance Fee | 5% of rewards | RewardVault |
| Referral Bonus | 3% of net rewards | Referrer wallet |
| Deposit Fee | 0% | — |
| Withdrawal Fee | 0% | — |

### 3.4 RewardVault Allocation

```
Performance fees received:
  70% → Fund StakingV2 rewards
  20% → Buyback & Burn (dead address)
  10% → Protocol expenses (owner)
```

---

## 4. Staking Tiers

### 4.1 Tier System

| Tier | Lock Duration | Multiplier | Use Case |
|---|---|---|---|
| 🥉 Bronze | 7 days | 1× | Short-term, flexible |
| 🥈 Silver | 30 days | 1.5× | Medium commitment |
| 🥇 Gold | 90 days | 2× | Long-term |
| 💎 Diamond | 365 days | 3× | Maximum yield |

### 4.2 Reward Calculation

```
baseReward = rewardPerToken × stakedAmount
boostedReward = baseReward × tierMultiplier
fee = boostedReward × performanceFeeBps / 10000
netReward = boostedReward - fee
```

### 4.3 Tier Rules

- Users can **upgrade** tiers but cannot **downgrade**
- Re-staking resets the lock period
- Early withdrawal is not permitted (enforced on-chain)

---

## 5. Governance (veSTK)

### 5.1 Vote-Escrow Model

Inspired by Curve Finance's veCRV model:

```
veAmount = stkAmount × (lockDuration / MAX_LOCK_DURATION)

MAX_LOCK_DURATION = 4 years

Examples:
  Lock 1000 STK for 4 years  → 1000 veSTK (1:1)
  Lock 1000 STK for 1 year   → 250 veSTK (0.25:1)
  Lock 1000 STK for 7 days   → 4.75 veSTK (0.00475:1)
```

### 5.2 Proposal Lifecycle

```
Create Proposal (requires 100 veSTK)
          ↓
  1-day Voting Delay
          ↓
  7-day Voting Period
          ↓
  4% Quorum Required + Majority For
          ↓
  2-day Timelock Delay
          ↓
  Execute On-Chain
```

### 5.3 Governable Parameters

- `rewardRatePerSecond` — reward emission speed
- `performanceFeeBps` — treasury fee (max 20%)
- `tierConfigs` — lock durations and multipliers
- `treasury` — vault address
- New pool additions and parameter changes

---

## 6. NFT Boost System

### 6.1 Boost Tiers

| Rarity | Boost | Supply | Price |
|---|---|---|---|
| 🥉 Common | +10% | 1,000 | 0.001 ETH |
| 🥈 Rare | +20% | 500 | 0.005 ETH |
| 🥇 Epic | +35% | 100 | 0.020 ETH |
| 💎 Legendary | +50% | 10 | Owner airdrop |

### 6.2 Properties

- **Soulbound** — non-transferable ERC721
- **Stackable** — highest boost applies per wallet
- **Permanent** — no expiry

### 6.3 Integration (StakingV3)

```solidity
uint256 boost = nft.getBoostBps(msg.sender);
uint256 boostedReward = (baseReward * (10000 + boost)) / 10000;
```

---

## 7. Security Model

### 7.1 Smart Contract Security

| Mechanism | Implementation |
|---|---|
| Reentrancy Protection | OpenZeppelin `ReentrancyGuard` |
| Access Control | OpenZeppelin `Ownable` |
| Pause/Unpause | OpenZeppelin `Pausable` |
| Safe Transfers | OpenZeppelin `SafeERC20` |
| Integer Overflow | Solidity 0.8.x built-in |

### 7.2 Economic Security

**Flash stake attack:** Blocked by minimum lock period. Users cannot stake and immediately withdraw.

**Reward manipulation:** `rewardPerTokenPaid` is set at stake time, preventing late entrants from claiming pre-stake rewards.

**Whale dilution:** Proportional rewards mean whales dilute but do not steal. Small stakers always earn their proportional share.

**Self-referral:** Contract explicitly checks `require(_referrer != msg.sender)`.

**Tier downgrade:** Contract enforces `require(uint8(_tier) >= uint8(u.tier))`.

### 7.3 Invariants

The following invariants are enforced and tested:

1. `contractSTKBalance >= totalStaked` — no funds can disappear
2. `Σ(userStaked) == totalStaked` — accounting is always consistent
3. `rewardPerToken` never decreases — rewards only accumulate
4. No user can ever withdraw more STK than they staked
5. Treasury always receives ≥ feeBps % of claimed rewards
6. Emergency withdraw only callable when protocol is paused

### 7.4 Test Coverage

```
Unit Tests:     62 tests (100% pass)
Fuzz Tests:     6 property-based tests (1000 runs each)
Invariant Tests: 6 invariants (stateful fuzzing)
Economic Tests: 7 attack simulations
```

---

## 8. Auto-Compounding Vault (xSTK)

### 8.1 Mechanism

```
User deposits 100 STK
      ↓
Receives 100 xSTK (1:1 initial ratio)
      ↓
compound() called → rewards re-staked
      ↓
pricePerShare increases: 1 xSTK = 1.05 STK
      ↓
User withdraws 100 xSTK → receives 105 STK
```

### 8.2 Incentive Design

Anyone can call `compound()` and receives **0.1% of compounded amount** as incentive — ensuring regular compounding without centralized keepers.

---

## 9. Price Oracle

### 9.1 Chainlink Integration

| Feed | Network | Address |
|---|---|---|
| ETH/USD | Sepolia | `0x694AA...6306` |
| STK/USD | Testnet | Mock ($0.024) |
| RWD/USD | Testnet | Mock ($0.010) |

### 9.2 Mainnet Plan

On mainnet, STK/USD and RWD/USD feeds will be created via:
1. Chainlink Data Streams (for custom tokens)
2. Or Uniswap V3 TWAP oracle as fallback

---

## 10. Roadmap

### Phase 1 ✅ (Complete)
- StakingV1 deployment and testing
- Basic stake/withdraw/claim functionality
- Frontend with full UI

### Phase 2 ✅ (Complete)
- StakingV2 with tiers, fees, referrals
- AutoCompounder vault
- RewardVault treasury

### Phase 3 ✅ (Complete)
- veSTK governance token
- YieldForgeGovernor + Timelock
- On-chain DAO voting

### Phase 4 ✅ (Complete)
- NFT boost system
- Chainlink price oracle
- The Graph subgraph indexing

### Phase 5 🔜 (Next)
- ETH staking pool
- USDC stable pool
- STK-ETH LP mining pool
- StakingV3 with NFT boost integration

### Phase 6 🔜 (Future)
- Mainnet deployment (Arbitrum)
- Professional security audit
- Cross-chain bridge
- Launchpad integration

---

## 11. Risk Disclosure

- Smart contract risk — bugs may exist despite testing
- Economic risk — APR changes with TVL
- Liquidity risk — tokens locked during lock period
- Governance risk — bad proposals could harm protocol
- This is a testnet deployment — not for production use with real funds

---

## 12. Contract Addresses (Sepolia)

| Contract | Address |
|---|---|
| StakingToken (STK) | `0xe2E63678a54AA74f79b0AE68455db2E3c34d4e34` |
| RewardToken (RWD) | `0xE6f0adEE844A89Cd554e188609B0A44895f5Bf8D` |
| StakingV1 | `0x84b969e7c086Ae80498e46d139F1efF10Ad8e409` |
| StakingV2 | `0x47e8c6f0A59dcD5977941Bac675b891Fd4c026d2` |
| AutoCompounder | `0x74519dA50AD67DcC497cD531dBFa7785Fc8D5C16` |
| RewardVault | `0xaB60e009F7e0b5564CF516E80c0ff5b34bb2A13B` |
| VeSTK | `0x20196Bbc7e69B0Bd2d37e63a34F14259A9f75D03` |
| YieldForgeGovernor | `0xc9DF08305f794bC0D7D9Fc63a229957582685A11` |
| TimelockController | `0x377dd0e113f9A7e7D9B35e48Be18aaE207326910` |
| YieldForgeNFT | `0x9139a15ce22Fd3Ee7B8E08402Fc1220A33df55c8` |
| PriceOracle | `0x4d2dB3BEdDEBBA86d10463eDfC35f57988400a6f` |

All contracts verified on [Sepolia Etherscan](https://sepolia.etherscan.io).

---

*© 2026 YieldForge Protocol. Built by [Aditya Chotaliya](https://github.com/adityachotaliya9299-jpg).*