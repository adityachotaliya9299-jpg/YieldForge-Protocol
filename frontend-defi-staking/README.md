This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.



User Journey:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. User visits YieldForge Protocol
2. Connects MetaMask wallet
3. Gets STK tokens (from deployer/faucet)
4. Approves STK → Staking Contract
5. Stakes STK tokens (7-day lock starts)
6. Every second → RWD tokens accumulate
7. After 7 days → Withdraws STK + Claims RWD
8. Can vote on governance proposals with staked STK
9. Can view analytics (TVL, APR, earnings)
10. Can see leaderboard ranking vs other stakers

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

On-chain (real, live on Sepolia):

Stake STK tokens
Earn RWD every second
7-day lock enforcement
Withdraw + claim rewards
APR calculation based on TVL

Off-chain (UI only, V2 will make real):

Multiple pool display
Governance voting
Leaderboard
Auto-compound button


YieldForge Protocol is a production-ready DeFi staking platform. Any crypto project that wants to incentivise token holders can plug in their token addresses, set a reward rate, and launch — exactly like Lido, Curve, and PancakeSwap do at billion-dollar scale.


How veSTK Works :- 

Lock Duration     | veSTK Received (per STK)
────────────────────────────────────────────
1 week   (7d)    | 0.019x  (7/1460 of STK)
1 month  (30d)   | 0.082x
6 months (180d)  | 0.493x
1 year   (365d)  | 1.0x
2 years  (730d)  | 2.0x
4 years  (1460d) | 4.0x  ← Maximum


Governance Flow

1. Lock 1000 STK for 4 years → receive 1000 veSTK
2. Create proposal (requires 100 veSTK minimum)
3. 1-day voting delay
4. 7-day voting period
5. If passed (4% quorum + majority For):
6. 2-day timelock delay
7. Anyone calls execute() → change goes live


PriceOracle
Uses Chainlink on mainnet, mock prices on testnet:

STK = $0.024 (mockable)
RWD = $0.010 (mockable)
ETH = Sepolia Chainlink feed


