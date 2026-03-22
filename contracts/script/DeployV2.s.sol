// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/StakingV2.sol";
import "../src/AutoCompounder.sol";
import "../src/RewardVault.sol";

// Import existing tokens from Phase 1
interface IERC20Mintable {
    function approve(address spender, uint256 amount) external returns (bool);
}

/**
 * @dev Deploy Phase 2:
 *   forge script script/DeployV2.s.sol:DeployV2 \
 *     --rpc-url $SEPOLIA_RPC_URL \
 *     --broadcast \
 *     --verify \
 *     --etherscan-api-key $ETHERSCAN_KEY \
 *     -vvvv
 *
 * Set in .env:
 *   PRIVATE_KEY=...
 *   STAKING_TOKEN=0xe2E63678a54AA74f79b0AE68455db2E3c34d4e34
 *   REWARD_TOKEN=0xE6f0adEE844A89Cd554e188609B0A44895f5Bf8D
 */
contract DeployV2 is Script {
    // ── Reuse existing Phase 1 tokens ────────────────────────
    address constant STK_TOKEN = 0xe2E63678a54AA74f79b0AE68455db2E3c34d4e34;
    address constant RWD_TOKEN = 0xE6f0adEE844A89Cd554e188609B0A44895f5Bf8D;

    // ── Config ───────────────────────────────────────────────
    uint256 constant REWARD_RATE = 1e15;       // 0.001 RWD/sec (more sustainable)
    uint256 constant REWARD_FUND = 500_000e18; // 500K RWD seeded

    function run() external {
        uint256 pk      = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);

        vm.startBroadcast(pk);

        // 1. Deploy RewardVault (treasury)
        RewardVault vault = new RewardVault(RWD_TOKEN, deployer);

        // 2. Deploy StakingV2 — treasury = vault
        StakingV2 stakingV2 = new StakingV2(
            STK_TOKEN,
            RWD_TOKEN,
            REWARD_RATE,
            address(vault),
            deployer
        );

        // 3. Deploy AutoCompounder
        AutoCompounder compounder = new AutoCompounder(
            STK_TOKEN,
            RWD_TOKEN,
            address(stakingV2),
            deployer
        );

        // 4. Fund StakingV2 with reward tokens
        IERC20Mintable(RWD_TOKEN).approve(address(stakingV2), REWARD_FUND);
        stakingV2.fundRewards(REWARD_FUND);

        vm.stopBroadcast();

        // ── Print ──────────────────────────────────────────────
        console.log("============================================");
        console.log("  PHASE 2 DEPLOYED");
        console.log("============================================");
        console.log("  StakingToken  :", STK_TOKEN);
        console.log("  RewardToken   :", RWD_TOKEN);
        console.log("  RewardVault   :", address(vault));
        console.log("  StakingV2     :", address(stakingV2));
        console.log("  AutoCompounder:", address(compounder));
        console.log("  Deployer      :", deployer);
        console.log("============================================");
        console.log("  REWARD_RATE   : 0.001 RWD/sec");
        console.log("  FUNDED        : 500,000 RWD");
        console.log("============================================");
        console.log("");
        console.log("  Update .env.local:");
        console.log("  NEXT_PUBLIC_STAKING_V2=", address(stakingV2));
        console.log("  NEXT_PUBLIC_REWARD_VAULT=", address(vault));
        console.log("  NEXT_PUBLIC_AUTO_COMPOUNDER=", address(compounder));
    }
}
