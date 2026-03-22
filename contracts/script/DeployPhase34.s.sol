// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/VeSTK.sol";
import "../src/YieldForgeGovernor.sol";
import "../src/YieldForgeNFT.sol";
import "../src/PriceOracle.sol";
import "@openzeppelin/contracts/governance/TimelockController.sol";

/**
 * @dev Deploy Phase 3 + 4:
 *   forge script script/DeployPhase34.s.sol:DeployPhase34 \
 *     --rpc-url $SEPOLIA_RPC_URL \
 *     --broadcast \
 *     --verify \
 *     --etherscan-api-key $ETHERSCAN_KEY \
 *     -vvvv
 */
contract DeployPhase34 is Script {
    // ── Reuse Phase 1 + 2 addresses ──────────────────────────
    address constant STK_TOKEN    = 0xe2E63678a54AA74f79b0AE68455db2E3c34d4e34;
    address constant STAKING_V2   = 0x47e8c6f0A59dcD5977941Bac675b891Fd4c026d2;

    // Sepolia ETH/USD Chainlink feed
    address constant ETH_USD_FEED = 0x694AA1769357215DE4FAC081bf1f309aDC325306;

    // Timelock settings
    uint256 constant TIMELOCK_DELAY = 2 days;

    function run() external {
        uint256 pk       = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);

        vm.startBroadcast(pk);

        // ── 1. Deploy veSTK ──────────────────────────────────
        VeSTK veStk = new VeSTK(STK_TOKEN, deployer);

        // ── 2. Deploy Timelock ───────────────────────────────
        address[] memory proposers = new address[](0); // will add governor
        address[] memory executors = new address[](1);
        executors[0] = address(0); // anyone can execute after delay

        TimelockController timeLock = new TimelockController(
            TIMELOCK_DELAY,
            proposers,
            executors,
            deployer
        );

        // ── 3. Deploy Governor ───────────────────────────────
        YieldForgeGovernor gov = new YieldForgeGovernor(
            IVotes(address(veStk)),
            timeLock
        );

        // ── 4. Wire Governor → Timelock ──────────────────────
        timeLock.grantRole(timeLock.PROPOSER_ROLE(),  address(gov));
        timeLock.grantRole(timeLock.CANCELLER_ROLE(), address(gov));
        // Optionally revoke deployer's admin after setup (production safety)
        // timeLock.revokeRole(timeLock.DEFAULT_ADMIN_ROLE(), deployer);

        // ── 5. Deploy NFT ────────────────────────────────────
        YieldForgeNFT nft = new YieldForgeNFT(deployer);

        // ── 6. Deploy PriceOracle ────────────────────────────
        PriceOracle oracle = new PriceOracle(ETH_USD_FEED, deployer);

        vm.stopBroadcast();

        // ── Print ─────────────────────────────────────────────
        console.log("================================================");
        console.log("  PHASE 3 + 4 DEPLOYED");
        console.log("================================================");
        console.log("  veSTK           :", address(veStk));
        console.log("  TimelockController:", address(timeLock));
        console.log("  YieldForgeGovernor:", address(gov));
        console.log("  YieldForgeNFT   :", address(nft));
        console.log("  PriceOracle     :", address(oracle));
        console.log("  Deployer        :", deployer);
        console.log("================================================");
        console.log("");
        console.log("  Update .env.local:");
        console.log("  NEXT_PUBLIC_VESTK=", address(veStk));
        console.log("  NEXT_PUBLIC_GOVERNOR=", address(gov));
        console.log("  NEXT_PUBLIC_TIMELOCK=", address(timeLock));
        console.log("  NEXT_PUBLIC_NFT=", address(nft));
        console.log("  NEXT_PUBLIC_ORACLE=", address(oracle));
        console.log("================================================");
        console.log("");
        console.log("  GOVERNANCE FLOW:");
        console.log("  1. Lock STK in veSTK contract");
        console.log("  2. Use veSTK to vote on proposals");
        console.log("  3. Passed proposals execute via Timelock (2 day delay)");
        console.log("================================================");
    }
}
