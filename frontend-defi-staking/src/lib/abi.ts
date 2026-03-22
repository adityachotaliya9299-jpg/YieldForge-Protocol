// ── ERC20 ABI ────────────────────────────────────────────────
export const ERC20_ABI = [
  { name:"approve",   type:"function", stateMutability:"nonpayable", inputs:[{name:"spender",type:"address"},{name:"amount",type:"uint256"}], outputs:[{name:"",type:"bool"}] },
  { name:"allowance", type:"function", stateMutability:"view",       inputs:[{name:"owner",type:"address"},{name:"spender",type:"address"}], outputs:[{name:"",type:"uint256"}] },
  { name:"balanceOf", type:"function", stateMutability:"view",       inputs:[{name:"account",type:"address"}],                              outputs:[{name:"",type:"uint256"}] },
  { name:"decimals",  type:"function", stateMutability:"view",       inputs:[],                                                              outputs:[{name:"",type:"uint8"}] },
  { name:"symbol",    type:"function", stateMutability:"view",       inputs:[],                                                              outputs:[{name:"",type:"string"}] },
] as const;

// ── StakingV2 ABI ────────────────────────────────────────────
export const STAKING_V2_ABI = [
  // ── Read ──────────────────────────────────────────────────
  {
    name:"userInfo", type:"function", stateMutability:"view",
    inputs:[{name:"",type:"address"}],
    outputs:[
      {name:"stakedAmount",      type:"uint256"},
      {name:"rewardPerTokenPaid",type:"uint256"},
      {name:"pendingRewards",    type:"uint256"},
      {name:"lockUntil",         type:"uint256"},
      {name:"stakedAt",          type:"uint256"},
      {name:"tier",              type:"uint8"},
      {name:"referrer",          type:"address"},
    ],
  },
  {
    name:"earned", type:"function", stateMutability:"view",
    inputs:[{name:"_user",type:"address"}],
    outputs:[{name:"",type:"uint256"}],
  },
  {
    name:"earnedAfterFee", type:"function", stateMutability:"view",
    inputs:[{name:"_user",type:"address"}],
    outputs:[{name:"net",type:"uint256"},{name:"fee",type:"uint256"}],
  },
  {
    name:"currentAPR", type:"function", stateMutability:"view",
    inputs:[], outputs:[{name:"",type:"uint256"}],
  },
  {
    name:"totalStaked", type:"function", stateMutability:"view",
    inputs:[], outputs:[{name:"",type:"uint256"}],
  },
  {
    name:"timeUntilUnlock", type:"function", stateMutability:"view",
    inputs:[{name:"_user",type:"address"}],
    outputs:[{name:"",type:"uint256"}],
  },
  {
    name:"rewardRatePerSecond", type:"function", stateMutability:"view",
    inputs:[], outputs:[{name:"",type:"uint256"}],
  },
  {
    name:"performanceFeeBps", type:"function", stateMutability:"view",
    inputs:[], outputs:[{name:"",type:"uint256"}],
  },
  {
    name:"referralBonusBps", type:"function", stateMutability:"view",
    inputs:[], outputs:[{name:"",type:"uint256"}],
  },
  {
    name:"referralEarnings", type:"function", stateMutability:"view",
    inputs:[{name:"",type:"address"}],
    outputs:[{name:"",type:"uint256"}],
  },
  {
    name:"referralCount", type:"function", stateMutability:"view",
    inputs:[{name:"",type:"address"}],
    outputs:[{name:"",type:"uint256"}],
  },
  {
    name:"getTierConfig", type:"function", stateMutability:"view",
    inputs:[{name:"_tier",type:"uint8"}],
    outputs:[{name:"",type:"tuple",components:[
      {name:"lockDuration",  type:"uint256"},
      {name:"multiplierBps", type:"uint256"},
      {name:"name",          type:"string"},
    ]}],
  },
  {
    name:"paused", type:"function", stateMutability:"view",
    inputs:[], outputs:[{name:"",type:"bool"}],
  },

  // ── Write ─────────────────────────────────────────────────
  {
    name:"stake", type:"function", stateMutability:"nonpayable",
    inputs:[
      {name:"_amount",  type:"uint256"},
      {name:"_tier",    type:"uint8"},
      {name:"_referrer",type:"address"},
    ],
    outputs:[],
  },
  {
    name:"withdraw", type:"function", stateMutability:"nonpayable",
    inputs:[{name:"_amount",type:"uint256"}],
    outputs:[],
  },
  {
    name:"claimRewards", type:"function", stateMutability:"nonpayable",
    inputs:[], outputs:[],
  },
  {
    name:"exit", type:"function", stateMutability:"nonpayable",
    inputs:[], outputs:[],
  },
  {
    name:"emergencyWithdraw", type:"function", stateMutability:"nonpayable",
    inputs:[], outputs:[],
  },

  // ── Events ────────────────────────────────────────────────
  {
    name:"Staked", type:"event",
    inputs:[
      {name:"user",     type:"address",indexed:true},
      {name:"amount",   type:"uint256",indexed:false},
      {name:"tier",     type:"uint8",  indexed:false},
      {name:"lockUntil",type:"uint256",indexed:false},
    ],
  },
  {
    name:"Withdrawn", type:"event",
    inputs:[
      {name:"user",  type:"address",indexed:true},
      {name:"amount",type:"uint256",indexed:false},
    ],
  },
  {
    name:"RewardClaimed", type:"event",
    inputs:[
      {name:"user",  type:"address",indexed:true},
      {name:"reward",type:"uint256",indexed:false},
      {name:"fee",   type:"uint256",indexed:false},
    ],
  },
  {
    name:"ReferralBonus", type:"event",
    inputs:[
      {name:"referrer",type:"address",indexed:true},
      {name:"referee", type:"address",indexed:true},
      {name:"bonus",   type:"uint256",indexed:false},
    ],
  },
] as const;

// ── AutoCompounder ABI ───────────────────────────────────────
export const AUTO_COMPOUNDER_ABI = [
  { name:"deposit",       type:"function", stateMutability:"nonpayable", inputs:[{name:"_amount",type:"uint256"}], outputs:[] },
  { name:"withdraw",      type:"function", stateMutability:"nonpayable", inputs:[{name:"_xStkAmount",type:"uint256"}], outputs:[] },
  { name:"compound",      type:"function", stateMutability:"nonpayable", inputs:[], outputs:[] },
  { name:"pricePerShare", type:"function", stateMutability:"view",       inputs:[], outputs:[{name:"",type:"uint256"}] },
  { name:"previewWithdraw",type:"function",stateMutability:"view",       inputs:[{name:"_user",type:"address"}], outputs:[{name:"",type:"uint256"}] },
  { name:"totalDeposited",type:"function", stateMutability:"view",       inputs:[], outputs:[{name:"",type:"uint256"}] },
  { name:"balanceOf",     type:"function", stateMutability:"view",       inputs:[{name:"account",type:"address"}], outputs:[{name:"",type:"uint256"}] },
  { name:"lastCompoundTime",type:"function",stateMutability:"view",      inputs:[], outputs:[{name:"",type:"uint256"}] },
] as const;

// ── RewardVault ABI ──────────────────────────────────────────
export const REWARD_VAULT_ABI = [
  { name:"balance",     type:"function", stateMutability:"view",       inputs:[], outputs:[{name:"",type:"uint256"}] },
  { name:"totalReceived",type:"function",stateMutability:"view",       inputs:[], outputs:[{name:"",type:"uint256"}] },
  { name:"totalBurned", type:"function", stateMutability:"view",       inputs:[], outputs:[{name:"",type:"uint256"}] },
  { name:"distribute",  type:"function", stateMutability:"nonpayable", inputs:[{name:"_stakingContract",type:"address"}], outputs:[] },
] as const;