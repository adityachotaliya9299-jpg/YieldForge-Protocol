// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/StakingToken.sol";
import "../src/RewardToken.sol";
import "../src/StakingContract.sol";

/**
 * @dev Deploy:
 *   forge script script/Deploy.s.sol:Deploy \
 *     --rpc-url $RPC_URL \
 *     --broadcast \
 *     --verify \
 *     --etherscan-api-key $ETHERSCAN_KEY \
 *     -vvvv
 */
contract Deploy is Script {
    // ── Tune these before deploying ──────────────────────────────
    string  constant STK_NAME    = "StakeToken";
    string  constant STK_SYMBOL  = "STK";
    string  constant RWD_NAME    = "RewardToken";
    string  constant RWD_SYMBOL  = "RWD";

    uint256 constant STK_SUPPLY  = 10_000_000e18;   // 10M staking tokens
    uint256 constant RWD_SUPPLY  = 100_000_000e18;  // 100M reward tokens
    uint256 constant REWARD_FUND = 1_000_000e18;    // 1M to seed staking contract

    // 1 RWD per second  →  ~31.5M RWD/year at 1 staker
    // Tune down once you know totalStaked target
    uint256 constant REWARD_RATE = 1e18;
    // ─────────────────────────────────────────────────────────────

    function run() external {
        uint256 deployerPK = vm.envUint("PRIVATE_KEY");
        address deployer   = vm.addr(deployerPK);

        vm.startBroadcast(deployerPK);

        // 1. Deploy tokens
        StakingToken stkToken = new StakingToken(
            STK_NAME, STK_SYMBOL, 18, STK_SUPPLY, deployer
        );
        RewardToken rwdToken = new RewardToken(
            RWD_NAME, RWD_SYMBOL, 18, RWD_SUPPLY, deployer
        );

        // 2. Deploy staking contract
        StakingContract stakingContract = new StakingContract(
            address(stkToken),
            address(rwdToken),
            REWARD_RATE,
            deployer
        );

        // 3. Fund staking contract with reward tokens
        rwdToken.approve(address(stakingContract), REWARD_FUND);
        stakingContract.fundRewards(REWARD_FUND);

        vm.stopBroadcast();

        // ── Print deployed addresses ──────────────────────────────
        console.log("==============================================");
        console.log("  StakingToken  :", address(stkToken));
        console.log("  RewardToken   :", address(rwdToken));
        console.log("  StakingContract:", address(stakingContract));
        console.log("  Deployer       :", deployer);
        console.log("==============================================");
    }
}
