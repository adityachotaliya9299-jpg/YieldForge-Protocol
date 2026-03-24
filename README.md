# YieldForge Protocol 🔥

> **Production-grade DeFi staking protocol with tiered rewards, on-chain governance, NFT boosts, and auto-compounding vaults.**

<div align="center">

[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636?logo=solidity&logoColor=white)](https://soliditylang.org)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org)
[![Foundry](https://img.shields.io/badge/Built%20with-Foundry-DBEAFE)](https://getfoundry.sh)
[![Coverage](https://img.shields.io/badge/Test%20Coverage-76%25-brightgreen)](./contracts/test)
[![Tests](https://img.shields.io/badge/Tests-222%20Passing-brightgreen)](#testing)
[![Network](https://img.shields.io/badge/Network-Sepolia%20Testnet-7C3AED)](https://sepolia.etherscan.io)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black?logo=vercel)](https://yield-forge-protocol.vercel.app)

<br/>

**[🌐 Live Demo](https://yield-forge-protocol.vercel.app)** · **[📊 Subgraph](https://thegraph.com/studio/subgraph/yieldforge-protocol)** · **[📄 Whitepaper](./docs/WHITEPAPER.md)** · **[🛡 Security](./docs/SECURITY.md)**

<br/>

![YieldForge Dashboard](./docs/screenshots/dashboard.png)

</div>

---

## 🌟 What is YieldForge?

YieldForge is a **full-stack DeFi staking protocol** built from scratch — 10 smart contracts, a complete Next.js frontend, on-chain governance, and a live subgraph. Users stake **STK tokens**, earn **RWD rewards**, boost yields with **NFTs**, and vote on protocol changes using **veSTK**.

This project demonstrates end-to-end DeFi development: from smart contract architecture and security testing to frontend integration, subgraph indexing, and alert systems.

---

## ✨ Features

### 🏦 Tiered Staking (StakingV2)

| Tier | Lock | Multiplier | Best For |
|------|------|-----------|----------|
| 🥉 Bronze | 7 days | **1×** | Short-term, flexible |
| 🥈 Silver | 30 days | **1.5×** | Medium commitment |
| 🥇 Gold | 90 days | **2×** | Long-term holders |
| 💎 Diamond | 365 days | **3×** | Maximum yield |

- **5%** transparent performance fee → RewardVault treasury
- **3%** referral bonus — users earn by bringing others
- Emergency pause with protected emergency withdrawals
- Real-time per-second reward accrual

### 🏛 On-Chain Governance (veSTK)

- Lock STK → receive **veSTK** (non-transferable voting token)
- Longer lock = more voting power (up to **4×** at max 4-year lock)
- Full DAO lifecycle: **1-day delay → 7-day voting → 2-day timelock → execution**
- 4% quorum required — prevents low-participation attacks

### 🎨 NFT Boost System

| Rarity | Boost | Supply | Price |
|--------|-------|--------|-------|
| 🥉 Common | **+10%** | 1,000 | 0.001 ETH |
| 🥈 Rare | **+20%** | 500 | 0.005 ETH |
| 🥇 Epic | **+35%** | 100 | 0.020 ETH |
| 💎 Legendary | **+50%** | 10 | Owner airdrop |

- **Soulbound ERC721** — non-transferable, permanently tied to wallet
- **Not pay-to-win** — capped at +50% maximum, same % for all holders

### 📈 Auto-Compounding Vault (xSTK)
- Deposit STK → receive **xSTK** vault shares
- Anyone calls `compound()` → rewards auto-restaked into vault
- Caller earns **0.1% incentive** — no centralized keepers needed
- xSTK price increases over time as rewards compound

### 📊 Analytics + The Graph
- **Live TVL**, APR, rewards from on-chain contracts
- **30-day historical charts** from The Graph subgraph
- Real-time leaderboard with on-chain staker rankings
- Data auto-switches from simulated → live when subgraph syncs

### 🔔 Alert System
- **Email** + **Telegram** notifications before lock expiry
- Configurable days-before-unlock (1/2/3/7/14 days)
- Vercel daily cron job for automated delivery

---

## 🏗 Architecture

```
YieldForge Protocol
├── contracts/                      # Foundry — Solidity 0.8.24
│   ├── src/
│   │   ├── StakingToken.sol        # STK ERC20 with mint/burn
│   │   ├── RewardToken.sol         # RWD ERC20 with max supply
│   │   ├── StakingContract.sol     # V1 — basic single-tier staking
│   │   ├── StakingV2.sol           # V2 — tiers, fees, referrals ⭐
│   │   ├── AutoCompounder.sol      # xSTK auto-compound vault
│   │   ├── RewardVault.sol         # Protocol treasury
│   │   ├── VeSTK.sol               # Vote-escrowed governance token
│   │   ├── YieldForgeGovernor.sol  # DAO Governor (OpenZeppelin)
│   │   ├── YieldForgeNFT.sol       # Soulbound boost NFTs
│   │   └── PriceOracle.sol         # Chainlink price feeds
│   └── test/
│       ├── StakingContract.t.sol   # 15 unit tests
│       ├── StakingV2.t.sol         # 20 unit tests
│       ├── StakingV2Coverage.t.sol # 28 branch coverage tests
│       ├── AutoCompounder.t.sol    # 21 tests
│       ├── RewardVault.t.sol       # 17 tests
│       ├── Governor.t.sol          # 17 tests
│       ├── CoverageBoost.t.sol     # NFT + Oracle + VeSTK + Token tests
│       ├── InvariantFuzz.t.sol     # 6 invariants + stateful fuzzer
│       └── EconomicSecurity.t.sol  # 9 attack simulations
│
├── frontend-defi-staking/          # Next.js 15 + wagmi v2 + viem
│   ├── src/app/
│   │   ├── page.tsx                # Dashboard — portfolio overview
│   │   ├── stake/                  # Staking with tier selector
│   │   ├── pools/                  # All pools (live + coming soon)
│   │   ├── analytics/              # Charts + live metrics
│   │   ├── governance/             # Proposals + voting
│   │   ├── vestk/                  # Lock STK, voting power
│   │   ├── nft/                    # Mint boost NFTs
│   │   ├── leaderboard/            # Top stakers from The Graph
│   │   ├── compare/                # vs Lido/Convex/Yearn
│   │   ├── faucet/                 # Get free testnet tokens
│   │   └── admin/                  # Owner-only protocol controls
│   ├── src/hooks/
│   │   ├── useStaking.ts           # V2 contract reads
│   │   ├── useTokenPrice.ts        # PriceOracle live prices
│   │   └── useSubgraph.ts          # The Graph queries
│   └── src/components/
│       ├── NavBar.tsx              # Responsive navigation
│       ├── TierSelector.tsx        # Bronze/Silver/Gold/Diamond picker
│       ├── EarningsSimulator.tsx   # Per-tier earnings projector
│       ├── TransactionHistory.tsx  # localStorage persistence
│       ├── AlertSettings.tsx       # Email + Telegram alerts
│       └── APRDisplay.tsx          # APR with TVL tooltip
│
└── subgraph/                       # The Graph — event indexing
    ├── schema.graphql              # Entities: Staker, ProtocolDay, etc.
    ├── subgraph.yaml               # Manifest for StakingV2 + VeSTK + Governor
    └── src/
        ├── stakingV2.ts            # Staked/Withdrawn/Claimed handlers
        ├── vestk.ts                # Locked/Unlocked handlers
        └── governor.ts             # ProposalCreated/VoteCast handlers
```

---

## 📋 Deployed Contracts (Sepolia — All Verified ✅)

| Contract | Address | Etherscan |
|----------|---------|-----------|
| StakingToken (STK) | `0xe2E63678a54AA74f79b0AE68455db2E3c34d4e34` | [View ↗](https://sepolia.etherscan.io/address/0xe2E63678a54AA74f79b0AE68455db2E3c34d4e34) |
| RewardToken (RWD) | `0xE6f0adEE844A89Cd554e188609B0A44895f5Bf8D` | [View ↗](https://sepolia.etherscan.io/address/0xE6f0adEE844A89Cd554e188609B0A44895f5Bf8D) |
| StakingV1 | `0x84b969e7c086Ae80498e46d139F1efF10Ad8e409` | [View ↗](https://sepolia.etherscan.io/address/0x84b969e7c086Ae80498e46d139F1efF10Ad8e409) |
| StakingV2 | `0x47e8c6f0A59dcD5977941Bac675b891Fd4c026d2` | [View ↗](https://sepolia.etherscan.io/address/0x47e8c6f0A59dcD5977941Bac675b891Fd4c026d2) |
| AutoCompounder | `0x74519dA50AD67DcC497cD531dBFa7785Fc8D5C16` | [View ↗](https://sepolia.etherscan.io/address/0x74519dA50AD67DcC497cD531dBFa7785Fc8D5C16) |
| RewardVault | `0xaB60e009F7e0b5564CF516E80c0ff5b34bb2A13B` | [View ↗](https://sepolia.etherscan.io/address/0xaB60e009F7e0b5564CF516E80c0ff5b34bb2A13B) |
| VeSTK | `0x20196Bbc7e69B0Bd2d37e63a34F14259A9f75D03` | [View ↗](https://sepolia.etherscan.io/address/0x20196Bbc7e69B0Bd2d37e63a34F14259A9f75D03) |
| YieldForgeGovernor | `0xc9DF08305f794bC0D7D9Fc63a229957582685A11` | [View ↗](https://sepolia.etherscan.io/address/0xc9DF08305f794bC0D7D9Fc63a229957582685A11) |
| TimelockController | `0x377dd0e113f9A7e7D9B35e48Be18aaE207326910` | [View ↗](https://sepolia.etherscan.io/address/0x377dd0e113f9A7e7D9B35e48Be18aaE207326910) |
| YieldForgeNFT | `0x9139a15ce22Fd3Ee7B8E08402Fc1220A33df55c8` | [View ↗](https://sepolia.etherscan.io/address/0x9139a15ce22Fd3Ee7B8E08402Fc1220A33df55c8) |
| PriceOracle | `0x4d2dB3BEdDEBBA86d10463eDfC35f57988400a6f` | [View ↗](https://sepolia.etherscan.io/address/0x4d2dB3BEdDEBBA86d10463eDfC35f57988400a6f) |

---

## 🚀 Getting Started

### Prerequisites
```bash
node >= 20.18.1
foundry (forge, cast, anvil)
git
```

### Clone & Setup
```bash
git clone https://github.com/adityachotaliya9299-jpg/yield-forge-protocol.git
cd yield-forge-protocol
```

### Smart Contracts
```bash
cd contracts
forge install
forge build
forge test -vvv          # run all 227 tests
forge coverage           # coverage report
```

### Frontend
```bash
cd frontend-defi-staking
npm install
cp .env.local.example .env.local
# Fill in contract addresses (already in .env.local.example)
npm run dev
# → http://localhost:3000
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
NEXT_PUBLIC_SUBGRAPH_URL=https://api.studio.thegraph.com/query/1744854/yieldforge-protocol/v1.0.0
TELEGRAM_BOT_TOKEN=your_bot_token
SENDGRID_API_KEY=your_sendgrid_key
CRON_SECRET=your_cron_secret
```

---

## 🔒 Security & Testing

### Test Suite — 222 Tests Passing

```bash
forge test -vvv                                              # all tests
forge test --match-contract StakingV2 -vvv                   # unit tests
forge test --match-contract InvariantStakingV2 -vvv          # invariant fuzzing
forge test --match-contract FuzzStakingV2 --fuzz-runs 10000  # property tests
forge test --match-contract EconomicSecurityTest -vvv        # attack simulations
```

### Coverage

| Contract | Lines | Branches |
|----------|-------|----------|
| AutoCompounder | 98% | 76% |
| RewardVault | 100% | 73% |
| StakingToken | 100% | 100% |
| RewardToken | 100% | 100% |
| StakingV2 | 89% | 64% |
| VeSTK | 90% | 64% |
| YieldForgeNFT | 90% | 70% |
| **Overall** | **76%** | **64%** |

### Verified Invariants (Stateful Fuzzing — 128,000 calls each)
1. `contractSTKBalance ≥ totalStaked` — no funds can disappear
2. `Σ(userStaked) == totalStaked` — accounting always consistent
3. `rewardPerToken` never decreases — rewards only accumulate
4. No user receives more STK than deposited
5. Treasury always receives ≥ feeBps % of claimed rewards
6. Emergency withdraw only callable when paused

### Attack Simulations — All Blocked ✅
- Flash stake attack (blocked by lock period)
- Late staker reward theft (blocked by `rewardPerTokenPaid`)
- Referral self-referral (explicit check)
- Tier downgrade attack (blocked on-chain)
- Emergency bypass (paused guard)
- Whale dominance (proportional, not extractive)

---

## 📊 The Graph Subgraph

```bash
cd subgraph
npm install -g @graphprotocol/graph-cli
graph auth --studio YOUR_DEPLOY_KEY
graph codegen && graph build
graph deploy --studio yieldforge-protocol \
  --node https://api.studio.thegraph.com/deploy/ \
  --version-label v1.0.0
```

**Indexed entities:** `Staker`, `StakeEvent`, `WithdrawEvent`, `ClaimEvent`, `ReferralEvent`, `ProtocolDay`, `ProtocolStats`, `VeSTKHolder`, `GovernanceProposal`

**Live endpoint:**
```
https://api.studio.thegraph.com/query/1744854/yieldforge-protocol/v1.0.0
```

---

## ⚔️ Why YieldForge vs Alternatives

| Feature | Lido | Convex | Yearn | **YieldForge** |
|---------|------|--------|-------|----------------|
| Lock tiers (1×–3× multiplier) | ❌ | ❌ | ❌ | ✅ |
| NFT boost system | ❌ | ❌ | ❌ | ✅ |
| Referral bonus (3%) | ❌ | ❌ | ❌ | ✅ |
| 0% deposit/withdrawal fee | ❌ | ❌ | ❌ | ✅ |
| Accessible governance | ❌ | Partial | ❌ | ✅ |
| Auto-compound vault | ✅ | ✅ | ✅ | ✅ |
| On-chain treasury | Partial | ✅ | ✅ | ✅ |
| Honest APR display | ❌ | ❌ | ❌ | ✅ |

---

## 🗺 Roadmap

| Phase | Status | Features |
|-------|--------|----------|
| Phase 1 | ✅ Complete | StakingV1, basic frontend |
| Phase 2 | ✅ Complete | StakingV2 — tiers, fees, referrals |
| Phase 3 | ✅ Complete | veSTK governance + DAO voting |
| Phase 4 | ✅ Complete | NFT boosts + Chainlink oracle |
| Phase 5 | 🔜 Next | ETH/USDC pools, StakingV3 with NFT integration |
| Phase 6 | 🔜 Future | Mainnet (Arbitrum) + professional audit |

---

## 🛠 Tech Stack

**Smart Contracts**
- Solidity 0.8.24
- Foundry (forge, cast, anvil)
- OpenZeppelin Contracts v5
- Chainlink Price Feeds

**Frontend**
- Next.js 15 (App Router)
- wagmi v2 + viem
- TypeScript
- The Graph (subgraph queries)

**Infrastructure**
- Vercel (frontend + cron jobs)
- The Graph Studio (event indexing)
- Alchemy (RPC)
- SendGrid + Telegram (alerts)

---

## 📄 Documentation

| Doc | Description |
|-----|-------------|
| [WHITEPAPER.md](./docs/WHITEPAPER.md) | Protocol architecture, tokenomics, governance model |
| [SECURITY.md](./docs/SECURITY.md) | Audit checklist, known risks, pre-mainnet requirements |

---

## 👤 Author

**Aditya Chotaliya** — Full-Stack Blockchain Developer

- 🌐 Portfolio: [adityachotaliya.vercel.app](https://portfolio-one-bice-xqt0376aiu.vercel.app/)
- 💻 GitHub: [@adityachotaliya9299-jpg](https://github.com/adityachotaliya9299-jpg)
- 🚀 Available for freelance DeFi protocol development

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Run tests: `forge test`
4. Push and open a Pull Request

---

## ⚠️ Disclaimer

This is a **testnet deployment** for educational and portfolio purposes. The contracts have not been professionally audited. **Do not use with real funds** without a professional security audit from a reputable firm.

---

## 📜 License

MIT — see [LICENSE](LICENSE)
