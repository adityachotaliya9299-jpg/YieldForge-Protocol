# Security Audit Guide — YieldForge Protocol

## Part 1 — Automated Analysis (Slither)

### Install
```bash
pip install slither-analyzer --break-system-packages
pip install solc-select --break-system-packages
solc-select install 0.8.24
solc-select use 0.8.24
```

### Run Slither on all contracts
```bash
cd /mnt/e/Blockchain/DeFi-Staking/contracts

# Full analysis
slither src/ --solc-remaps "@openzeppelin/=lib/openzeppelin-contracts/"

# Only high/medium severity
slither src/ --solc-remaps "@openzeppelin/=lib/openzeppelin-contracts/" \
  --filter-paths "lib/" \
  --exclude-low

# Generate report
slither src/ --solc-remaps "@openzeppelin/=lib/openzeppelin-contracts/" \
  --json slither-report.json
```

### Common Slither findings to ignore (false positives in DeFi):
- `divide-before-multiply` — intentional for BPS math
- `tautology` — SafeMath remnants
- `boolean-equality` — style preference

---

## Part 2 — Aderyn (Rust-based auditor)

```bash
# Install
cargo install aderyn

# Run
cd /mnt/e/Blockchain/DeFi-Staking/contracts
aderyn . --output report.md
```

---

## Part 3 — Run Full Test Suite

```bash
cd /mnt/e/Blockchain/DeFi-Staking/contracts

# All tests
forge test -vvv

# Only invariant tests (stateful fuzzing)
forge test --match-contract InvariantStakingV2 -vvv

# Only economic security tests
forge test --match-contract EconomicSecurityTest -vvv

# Only fuzz tests (more runs)
forge test --match-contract FuzzStakingV2 --fuzz-runs 10000 -vvv

# Coverage report
forge coverage --report lcov
genhtml lcov.info -o coverage-report
```

---

## Part 4 — Manual Audit Checklist

### Access Control
- [x] Only owner can set reward rate
- [x] Only owner can pause/unpause
- [x] Only owner can set performance fee
- [x] Only owner can update tier configs
- [x] Governor controls protocol via timelock

### Reentrancy
- [x] All state changes before external calls
- [x] ReentrancyGuard on all public functions
- [x] SafeERC20 used for all token transfers

### Economic Attacks
- [x] Flash stake blocked by lock period
- [x] Late staker cannot claim pre-stake rewards
- [x] Self-referral blocked
- [x] Tier downgrade blocked
- [x] Emergency withdraw only when paused

### Edge Cases
- [x] Zero stake rejected
- [x] Stake with no reward tokens in contract
- [x] Withdraw more than staked rejected
- [x] rewardPerToken with 0 totalStaked returns stored value
- [x] Fee with feeBps = 0

### Invariants Verified
- [x] contractBalance >= totalStaked
- [x] Σ(userStaked) == totalStaked
- [x] rewardPerToken never decreases
- [x] User cannot receive more STK than staked
- [x] Treasury receives correct fee percentage

---

## Part 5 — Known Limitations (Acceptable)

1. **Centralization**: Owner can pause, change rates, update tiers.
   - Mitigation: Transfer ownership to Timelock after launch

2. **Oracle dependency**: PriceOracle uses mock prices on testnet.
   - Mitigation: Chainlink feeds on mainnet

3. **Single reward token**: Only RWD distributed.
   - Mitigation: Multi-token rewards in V3

4. **No emergency drain**: Owner cannot drain user funds.
   - This is intentional — staking tokens locked in contract

---

## Part 6 — Pre-Mainnet Security Checklist

Before mainnet deployment:

```
[ ] Run Slither — fix all HIGH findings
[ ] Run Aderyn — fix all CRITICAL findings
[ ] 10,000+ fuzz test runs with no failures
[ ] Invariant tests with 1000+ runs each
[ ] Manual code review by second developer
[ ] Professional audit by: Trail of Bits / Certik / OpenZeppelin
[ ] Bug bounty program (Immunefi) — $1K-50K range
[ ] Multisig ownership (Gnosis Safe) — 3/5 signers
[ ] Timelock delay increased to 7 days for mainnet
[ ] Emergency pause tested on fork
[ ] Verify all constructor args on Etherscan
```