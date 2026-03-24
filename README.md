# YieldForge Protocol 🔥

> **Non-custodial DeFi staking platform with tiered rewards, on-chain governance, and NFT boosts.**

[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-blue)](https://soliditylang.org)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org)
[![Network](https://img.shields.io/badge/Network-Sepolia-purple)](https://sepolia.etherscan.io)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## 🌐 Live Demo

**Frontend:** [yield-forge-protocol.vercel.app](https://yield-forge-protocol.vercel.app)  
**Subgraph:** [The Graph Studio](https://thegraph.com/studio/subgraph/yieldforge-protocol)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Contracts](#contracts)
- [Getting Started](#getting-started)
- [Frontend](#frontend)
- [Subgraph](#subgraph)
- [Security](#security)
- [Roadmap](#roadmap)

---

## Overview

YieldForge Protocol lets users stake **STK** tokens and earn **RWD** rewards. The longer you lock, the higher your multiplier (1× to 3×). Protocol fees flow to a transparent on-chain treasury. Token holders govern the protocol via **veSTK** voting power.

---

## Features

### 🏦 Staking V2
| Tier | Lock | Multiplier |
|------|------|-----------|
| 🥉 Bronze | 7 days | 1× |
| 🥈 Silver | 30 days | 1.5× |
| 🥇 Gold | 90 days | 2× |
| 💎 Diamond | 365 days | 3× |

- 5% performance fee → RewardVault treasury
- 3% referral bonus system
- Emergency pause + emergency withdraw

### 🏛 Governance (veSTK)
- Lock STK → receive veSTK (non-transferable)
- Vote on protocol proposals (For / Against / Abstain)
- 1-day delay → 7-day voting → 2-day timelock
- 4% quorum required

### 🎨 NFT Boosts
- Common (+10%) / Rare (+20%) / Epic (+35%) / Legendary (+50%)
- Soulbound — non-transferable
- Capped at +50% maximum

### 📊 Analytics
- Live TVL, APR, rewards from contract
- 30-day charts from The Graph subgraph
- Real data auto-switches when subgraph syncs

### 🔔 Alerts
- Email + Telegram notifications before lock expiry
- Configurable days-before-unlock

---

## Architecture

```
YieldForge Protocol
├── contracts/          # Foundry — Solidity smart contracts
│   ├── src/
│   │   ├── StakingToken.sol
│   │   ├── RewardToken.sol
│   │   ├── StakingContract.sol  (V1)
│   │   ├── StakingV2.sol        (V2 — tiers, fees, referrals)
│   │   ├── AutoCompounder.sol
│   │   ├── RewardVault.sol
│   │   ├── VeSTK.sol
│   │   ├── YieldForgeGovernor.sol
│   │   ├── YieldForgeNFT.sol
│   │   └── PriceOracle.sol
│   ├── test/           # Unit + Fuzz + Invariant tests
│   └── script/         # Deploy scripts
├── frontend-defi-staking/  # Next.js 15 frontend
│   ├── src/app/        # Pages (stake, pools, analytics, governance, nft, vestk)
│   ├── src/components/ # NavBar, Footer, TierSelector, AlertSettings
│   ├── src/hooks/      # useStaking, useTokenPrice, useSubgraph
│   └── src/lib/        # wagmi config, ABIs
└── subgraph/           # The Graph — event indexing
    ├── schema.graphql
    ├── subgraph.yaml
    └── src/            # AssemblyScript mappings
```

---

## Contracts

### Sepolia Testnet (All Verified)

| Contract | Address |
|----------|---------|
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

---

## Getting Started

### Prerequisites
```bash
node >= 20.18.1
foundry (forge, cast, anvil)
git
```

### Clone
```bash
git clone https://github.com/adityachotaliya9299-jpg/yield-forge-protocol.git
cd yield-forge-protocol
```

### Contracts
```bash
cd contracts
forge install
forge build
forge test -vvv
```

### Deploy (Sepolia)
```bash
cp .env.example .env
# Fill in PRIVATE_KEY, SEPOLIA_RPC_URL, ETHERSCAN_KEY
source .env
forge script script/DeployV2.s.sol:DeployV2 --rpc-url $SEPOLIA_RPC_URL --broadcast --verify
```

---

## Frontend

```bash
cd frontend-defi-staking
npm install
cp .env.local.example .env.local
# Fill in contract addresses and API keys
npm run dev
```

### Environment Variables
```env
NEXT_PUBLIC_STAKING_TOKEN=0xe2E63678a54AA74f79b0AE68455db2E3c34d4e34
NEXT_PUBLIC_REWARD_TOKEN=0xE6f0adEE844A89Cd554e188609B0A44895f5Bf8D
NEXT_PUBLIC_STAKING_CONTRACT=0x84b969e7c086Ae80498e46d139F1efF10Ad8e409
NEXT_PUBLIC_STAKING_V2=0x47e8c6f0A59dcD5977941Bac675b891Fd4c026d2
NEXT_PUBLIC_REWARD_VAULT=0xaB60e009F7e0b5564CF516E80c0ff5b34bb2A13B
NEXT_PUBLIC_AUTO_COMPOUNDER=0x74519dA50AD67DcC497cD531dBFa7785Fc8D5C16
NEXT_PUBLIC_VESTK=0x20196Bbc7e69B0Bd2d37e63a34F14259A9f75D03
NEXT_PUBLIC_GOVERNOR=0xc9DF08305f794bC0D7D9Fc63a229957582685A11
NEXT_PUBLIC_TIMELOCK=0x377dd0e113f9A7e7D9B35e48Be18aaE207326910
NEXT_PUBLIC_NFT=0x9139a15ce22Fd3Ee7B8E08402Fc1220A33df55c8
NEXT_PUBLIC_ORACLE=0x4d2dB3BEdDEBBA86d10463eDfC35f57988400a6f
NEXT_PUBLIC_RPC_SEPOLIA=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
NEXT_PUBLIC_WC_PROJECT_ID=your_walletconnect_id
NEXT_PUBLIC_SUBGRAPH_URL=https://api.studio.thegraph.com/query/ID/yieldforge-protocol/v1.0.0
TELEGRAM_BOT_TOKEN=your_bot_token
SENDGRID_API_KEY=your_sendgrid_key
CRON_SECRET=your_cron_secret
```

---

## Subgraph

```bash
cd subgraph
npm install -g @graphprotocol/graph-cli
graph auth --studio YOUR_DEPLOY_KEY
graph codegen && graph build
graph deploy --studio yieldforge-protocol \
  --node https://api.studio.thegraph.com/deploy/ \
  --version-label v1.0.0
```

---

## Security

### Test Coverage
```bash
# Unit tests
forge test -vvv

# Fuzz tests (1000 runs)
forge test --match-contract FuzzStakingV2 --fuzz-runs 1000 -vvv

# Invariant tests (stateful fuzzing)
forge test --match-contract InvariantStakingV2 -vvv

# Economic security (attack simulations)
forge test --match-contract EconomicSecurityTest -vvv
```

### Audited Invariants
1. Contract STK balance ≥ totalStaked (no funds disappear)
2. Sum of user stakes = totalStaked (accounting integrity)
3. rewardPerToken never decreases
4. No user earns more than deposited
5. Treasury always receives correct fee %

### Known Risks
- Testnet only — not for mainnet use without professional audit
- Owner centralization — mitigated by Timelock on mainnet
- Oracle uses mock prices on testnet

---



---

## Built By

**Aditya Chotaliya** — [GitHub](https://github.com/adityachotaliya9299-jpg)

---

## License

MIT — see [LICENSE](LICENSE)

> ⚠ This is a testnet deployment for educational purposes. Not financial advice.