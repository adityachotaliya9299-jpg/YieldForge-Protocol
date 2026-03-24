# YieldForge Protocol 🔥

> **Production-grade DeFi staking protocol with tiered rewards, on-chain governance, NFT boosts, and auto-compounding vaults. Built with Foundry + Next.js 15.**

<div align="center">

[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-blue?logo=solidity)](https://soliditylang.org)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org)
[![Foundry](https://img.shields.io/badge/Built%20with-Foundry-orange)](https://getfoundry.sh)
[![Network](https://img.shields.io/badge/Network-Sepolia-purple)](https://sepolia.etherscan.io)
[![Tests](https://img.shields.io/badge/Tests-90%25%20Coverage-brightgreen)](./contracts/test)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

**[Live Demo](https://yield-forge-protocol.vercel.app)** · **[Subgraph](https://thegraph.com/studio/subgraph/yieldforge-protocol)** · **[Whitepaper](./docs/WHITEPAPER.md)**

</div>

---

## 📸 Screenshots

| Dashboard | Staking | Analytics |
|-----------|---------|-----------|
| ![Dashboard](./docs/screenshots/dashboard.png) | ![Staking](./docs/screenshots/stake.png) | ![Analytics](./docs/screenshots/analytics.png) |

---

## 🌟 Features

### 🏦 StakingV2 — Tiered Rewards
| Tier | Lock | Multiplier | Best For |
|------|------|-----------|----------|
| 🥉 Bronze | 7 days | 1× | Short-term, flexible |
| 🥈 Silver | 30 days | 1.5× | Medium commitment |
| 🥇 Gold | 90 days | 2× | Long-term holders |
| 💎 Diamond | 365 days | 3× | Maximum yield |

- 5% transparent performance fee → RewardVault treasury
- 3% referral bonus system for organic growth
- Emergency pause with protected emergency withdrawals
- Real-time per-second reward accrual

### 🏛 Governance (veSTK)
- Lock STK → receive veSTK voting power (non-transferable)
- Longer lock = more voting power (up to 4× at 4 year max)
- 1-day delay → 7-day voting → 2-day timelock → on-chain execution
- 4% quorum required — prevents low-participation attacks

### 🎨 NFT Boost System
| Rarity | Boost | Supply | Price |
|--------|-------|--------|-------|
| Common | +10% | 1,000 | 0.001 ETH |
| Rare | +20% | 500 | 0.005 ETH |
| Epic | +35% | 100 | 0.020 ETH |
| Legendary | +50% | 10 | Owner airdrop |

- Soulbound (ERC721, non-transferable) — not pay-to-win
- Highest boost applies per wallet, capped at +50%

### 📊 Auto-Compounding Vault (xSTK)
- Deposit STK → receive xSTK vault shares
- Anyone calls `compound()` → rewards auto-restaked
- Caller earns 0.1% incentive — no centralized keepers needed

### 📈 Analytics + The Graph
- Live TVL, APR, rewards from on-chain contracts
- 30-day historical charts from The Graph subgraph
- Real-time leaderboard with on-chain staker data

### 🔔 Alerts System
- Email + Telegram notifications before lock expiry
- Configurable days-before-unlock (1/2/3/7/14 days)
- Vercel daily cron job for automated sending

---

## 🏗 Architecture

```
YieldForge Protocol
├── contracts/                    # Foundry — Solidity
│   ├── src/
│   │   ├── StakingToken.sol      # STK ERC20 with mint/burn
│   │   ├── RewardToken.sol       # RWD ERC20 with max supply
│   │   ├── StakingContract.sol   # V1 — basic staking
│   │   ├── StakingV2.sol         # V2 — tiers, fees, referrals ⭐
│   │   ├── AutoCompounder.sol    # xSTK auto-compound vault
│   │   ├── RewardVault.sol       # Protocol treasury
│   │   ├── VeSTK.sol             # Vote-escrowed governance token
│   │   ├── YieldForgeGovernor.sol # DAO Governor (OpenZeppelin)
│   │   ├── YieldForgeNFT.sol     # Soulbound boost NFTs
│   │   └── PriceOracle.sol       # Chainlink price feeds
│   ├── test/
│   │   ├── StakingContract.t.sol # V1 unit tests (15 tests)
│   │   ├── StakingV2.t.sol       # V2 unit tests (20 tests)
│   │   ├── StakingV2Coverage.t.sol # Branch coverage (30 tests)
│   │   ├── AutoCompounder.t.sol  # Compounder tests (15 tests)
│   │   ├── RewardVault.t.sol     # Vault tests (12 tests)
│   │   ├── Governor.t.sol        # Governance tests (16 tests)
│   │   ├── CoverageBoost.t.sol   # NFT/Oracle/VeSTK/Token tests
│   │   ├── InvariantFuzz.t.sol   # 6 invariants + stateful fuzzer
│   │   └── EconomicSecurity.t.sol # 7 attack simulations
│   └── script/
│       ├── Deploy.s.sol          # V1 deploy
│       ├── DeployV2.s.sol        # V2 + Vault + Compounder
│       └── DeployPhase34.s.sol   # VeSTK + Governor + NFT + Oracle
├── frontend-defi-staking/        # Next.js 15
│   ├── src/app/
│   │   ├── page.tsx              # Dashboard
│   │   ├── stake/page.tsx        # Staking with tier selector
│   │   ├── pools/page.tsx        # All pools (live + coming soon)
│   │   ├── analytics/page.tsx    # Charts + live metrics
│   │   ├── governance/page.tsx   # Proposals + voting
│   │   ├── vestk/page.tsx        # Lock STK, voting power
│   │   ├── nft/page.tsx          # Mint boost NFTs
│   │   ├── leaderboard/page.tsx  # Top stakers
│   │   ├── compare/page.tsx      # vs Lido/Convex/Yearn
│   │   ├── faucet/page.tsx       # Get free testnet tokens
│   │   └── admin/page.tsx        # Owner-only controls
│   ├── src/components/
│   │   ├── NavBar.tsx            # Responsive with all links
│   │   ├── Footer.tsx
│   │   ├── TierSelector.tsx
│   │   ├── EarningsSimulator.tsx
│   │   ├── TransactionHistory.tsx # localStorage persistence
│   │   ├── AlertSettings.tsx
│   │   └── APRDisplay.tsx        # With TVL explanation tooltip
│   ├── src/hooks/
│   │   ├── useStaking.ts         # V2 contract reads
│   │   ├── useTokenPrice.ts      # PriceOracle live prices
│   │   └── useSubgraph.ts        # The Graph queries
│   └── src/lib/
│       ├── wagmi.ts              # Contracts config + TIERS
│       ├── abi.ts                # All contract ABIs
│       └── utils.ts              # formatDuration, shortAddr
└── subgraph/                     # The Graph
    ├── schema.graphql            # Entities: Staker, ProtocolDay, etc.
    ├── subgraph.yaml             # Manifest for 3 contracts
    └── src/
        ├── stakingV2.ts          # Staked/Withdrawn/Claimed handlers
        ├── vestk.ts              # Locked/Unlocked handlers
        └── governor.ts           # ProposalCreated/VoteCast handlers
```

---

## 📋 Deployed Contracts (Sepolia — All Verified)

| Contract | Address | Etherscan |
|----------|---------|-----------|
| StakingToken (STK) | `0xe2E63678a54AA74f79b0AE68455db2E3c34d4e34` | [View](https://sepolia.etherscan.io/address/0xe2E63678a54AA74f79b0AE68455db2E3c34d4e34) |
| RewardToken (RWD) | `0xE6f0adEE844A89Cd554e188609B0A44895f5Bf8D` | [View](https://sepolia.etherscan.io/address/0xE6f0adEE844A89Cd554e188609B0A44895f5Bf8D) |
| StakingV1 | `0x84b969e7c086Ae80498e46d139F1efF10Ad8e409` | [View](https://sepolia.etherscan.io/address/0x84b969e7c086Ae80498e46d139F1efF10Ad8e409) |
| StakingV2 | `0x47e8c6f0A59dcD5977941Bac675b891Fd4c026d2` | [View](https://sepolia.etherscan.io/address/0x47e8c6f0A59dcD5977941Bac675b891Fd4c026d2) |
| AutoCompounder | `0x74519dA50AD67DcC497cD531dBFa7785Fc8D5C16` | [View](https://sepolia.etherscan.io/address/0x74519dA50AD67DcC497cD531dBFa7785Fc8D5C16) |
| RewardVault | `0xaB60e009F7e0b5564CF516E80c0ff5b34bb2A13B` | [View](https://sepolia.etherscan.io/address/0xaB60e009F7e0b5564CF516E80c0ff5b34bb2A13B) |
| VeSTK | `0x20196Bbc7e69B0Bd2d37e63a34F14259A9f75D03` | [View](https://sepolia.etherscan.io/address/0x20196Bbc7e69B0Bd2d37e63a34F14259A9f75D03) |
| YieldForgeGovernor | `0xc9DF08305f794bC0D7D9Fc63a229957582685A11` | [View](https://sepolia.etherscan.io/address/0xc9DF08305f794bC0D7D9Fc63a229957582685A11) |
| TimelockController | `0x377dd0e113f9A7e7D9B35e48Be18aaE207326910` | [View](https://sepolia.etherscan.io/address/0x377dd0e113f9A7e7D9B35e48Be18aaE207326910) |
| YieldForgeNFT | `0x9139a15ce22Fd3Ee7B8E08402Fc1220A33df55c8` | [View](https://sepolia.etherscan.io/address/0x9139a15ce22Fd3Ee7B8E08402Fc1220A33df55c8) |
| PriceOracle | `0x4d2dB3BEdDEBBA86d10463eDfC35f57988400a6f` | [View](https://sepolia.etherscan.io/address/0x4d2dB3BEdDEBBA86d10463eDfC35f57988400a6f) |

---

## 🚀 Getting Started

### Prerequisites
```bash
node >= 20.18.1
foundry (forge, cast, anvil)
git
```

### Clone & Install
```bash
git clone https://github.com/adityachotaliya9299-jpg/yield-forge-protocol.git
cd yield-forge-protocol
```

### Smart Contracts
```bash
cd contracts
forge install
forge build

# Run all tests
forge test -vvv

# Run with coverage
forge coverage --report lcov
```

### Frontend
```bash
cd frontend-defi-staking
npm install
cp .env.local.example .env.local
# Edit .env.local with your values
npm run dev
# Open http://localhost:3000
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

## 🔒 Security

### Test Coverage

```
forge coverage
```

| File | Lines | Branches | Functions |
|------|-------|----------|-----------|
| StakingV2.sol | 90%+ | 85%+ | 95%+ |
| VeSTK.sol | 90%+ | 85%+ | 90%+ |
| AutoCompounder.sol | 90%+ | 80%+ | 90%+ |
| RewardVault.sol | 90%+ | 85%+ | 90%+ |
| YieldForgeNFT.sol | 90%+ | 85%+ | 95%+ |
| YieldForgeGovernor.sol | 85%+ | 80%+ | 90%+ |
| **Total** | **90%+** | **85%+** | **92%+** |

### Test Suite
```bash
# Unit tests
forge test --match-contract StakingV2 -vvv

# Invariant tests (stateful fuzzing)
forge test --match-contract InvariantStakingV2 -vvv

# Fuzz tests (property-based)
forge test --match-contract FuzzStakingV2 --fuzz-runs 10000 -vvv

# Economic security (attack simulations)
forge test --match-contract EconomicSecurityTest -vvv

# Full suite
forge test -vvv
```

### Audited Invariants
1. `contractSTKBalance >= totalStaked` — no funds disappear
2. `Σ(userStaked) == totalStaked` — accounting always consistent
3. `rewardPerToken` never decreases — rewards only accumulate
4. No user receives more STK than deposited
5. Treasury always receives ≥ feeBps % of claimed rewards
6. Emergency withdraw only when protocol is paused

### Attack Simulations Passed
- ✅ Flash stake attack (blocked by lock period)
- ✅ Late staker reward theft (blocked by rewardPerTokenPaid)
- ✅ Referral self-referral (explicit check)
- ✅ Tier downgrade (blocked on-chain)
- ✅ Emergency bypass (paused guard)
- ✅ Whale dilution (proportional, not extractive)

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

**Indexed entities:** Staker, StakeEvent, WithdrawEvent, ClaimEvent, ReferralEvent, ProtocolDay, ProtocolStats, VeSTKHolder, GovernanceProposal

---

## 🗺 Roadmap

| Phase | Status | Description |
|-------|--------|-------------|
| 1 | ✅ Done | StakingV1, basic UI |
| 2 | ✅ Done | StakingV2 — tiers, fees, referrals |
| 3 | ✅ Done | veSTK governance + DAO voting |
| 4 | ✅ Done | NFT boosts + Chainlink oracle |
| 5 | 🔜 Next | ETH/USDC pools + StakingV3 |
| 6 | 🔜 Future | Mainnet (Arbitrum) + audit |

---

## 🆚 Why YieldForge vs Alternatives

| Feature | Lido | Convex | Yearn | **YieldForge** |
|---------|------|--------|-------|----------------|
| Tier multipliers (1×–3×) | ❌ | ❌ | ❌ | ✅ |
| NFT boosts | ❌ | ❌ | ❌ | ✅ |
| Referral bonuses | ❌ | ❌ | ❌ | ✅ |
| 0% deposit fee | ❌ | ❌ | ❌ | ✅ |
| Accessible governance | ❌ | Partial | ❌ | ✅ |
| Auto-compound vault | ✅ | ✅ | ✅ | ✅ |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Run tests: `forge test`
4. Push and open a Pull Request

---

## 📄 Docs

- [Whitepaper](./docs/WHITEPAPER.md) — Protocol architecture and tokenomics
- [Security Guide](./docs/SECURITY.md) — Audit checklist and known risks
- [Competitive Analysis](./docs/COMPETITIVE.md) — vs Lido, Convex, Yearn

---

## 👤 Author

**Aditya Chotaliya**
- GitHub: [@adityachotaliya9299-jpg](https://github.com/adityachotaliya9299-jpg)

---

## ⚠️ Disclaimer

This is a testnet deployment for educational and demonstration purposes. Not audited for mainnet use. Do not use with real funds without a professional security audit.

---

## 📜 License

MIT — see [LICENSE](LICENSE)