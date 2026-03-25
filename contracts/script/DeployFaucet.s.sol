// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/Faucet.sol";
import "../src/StakingToken.sol";
import "../src/RewardToken.sol";

contract DeployFaucet is Script {
    // ── Existing contract addresses ───────────────────────────
    address constant STK_TOKEN = 0xe2E63678a54AA74f79b0AE68455db2E3c34d4e34;
    address constant RWD_TOKEN = 0xE6f0adEE844A89Cd554e188609B0A44895f5Bf8D;

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer    = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        // 1. Deploy Faucet
        Faucet faucet = new Faucet(STK_TOKEN, RWD_TOKEN, deployer);
        console.log("Faucet deployed at:", address(faucet));

        // 2. Grant Faucet minter role on both tokens
        // StakingToken and RewardToken use Ownable — owner must call mint
        // So we transfer ownership to faucet? No — use a different approach:
        // We keep owner, faucet calls mint via owner-approved mechanism
        // SIMPLER: just call mint from owner in the faucet (owner = deployer = faucet owner)
        // The faucet contract itself calls token.mint() — so tokens need to allow faucet

        // Grant faucet permission — add faucet as minter on tokens
        StakingToken(STK_TOKEN).transferOwnership(address(faucet));
        console.log("STK ownership transferred to Faucet");

        // NOTE: If you don't want to transfer full ownership,
        // use the manual mint approach below instead (recommended)

        vm.stopBroadcast();

        console.log("\n=== DEPLOYMENT COMPLETE ===");
        console.log("Faucet:", address(faucet));
        console.log("\nAdd to .env.local:");
        console.log("NEXT_PUBLIC_FAUCET=", address(faucet));
    }
}
