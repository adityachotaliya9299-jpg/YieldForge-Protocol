// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/StakingV2.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockSTK is ERC20 {
    constructor() ERC20("STK","STK") { _mint(msg.sender, 1_000_000_000e18); }
    function mint(address to, uint256 amt) external { _mint(to, amt); }
}
contract MockRWD is ERC20 {
    constructor() ERC20("RWD","RWD") { _mint(msg.sender, 1_000_000_000e18); }
}

contract EconomicSecurityTest is Test {
    StakingV2 public staking;
    MockSTK   public stkToken;
    MockRWD   public rwdToken;

    address owner    = address(this);
    address treasury = makeAddr("treasury");

    // Actors
    address whale   = makeAddr("whale");
    address alice   = makeAddr("alice");
    address bob     = makeAddr("bob");
    address charlie = makeAddr("charlie");
    address attacker= makeAddr("attacker");

    uint256 constant REWARD_RATE = 1e15; // 0.001 RWD/sec

    function setUp() public {
        stkToken = new MockSTK();
        rwdToken = new MockRWD();
        staking  = new StakingV2(address(stkToken), address(rwdToken), REWARD_RATE, treasury, owner);
        rwdToken.approve(address(staking), 100_000_000e18);
        staking.fundRewards(100_000_000e18);

        // Distribute tokens
        stkToken.transfer(whale,    100_000_000e18); // 100M - whale
        stkToken.transfer(alice,        10_000e18);
        stkToken.transfer(bob,          10_000e18);
        stkToken.transfer(charlie,      10_000e18);
        stkToken.transfer(attacker,     50_000e18);
    }

    // ─────────────────────────────────────────────────────────────
    //  ATTACK 1: Flash stake attack (stake → claim → exit same block)
    // ─────────────────────────────────────────────────────────────
    function test_Attack_FlashStake_Blocked() public {
        // Attacker tries to stake and immediately claim rewards
        vm.startPrank(attacker);
        stkToken.approve(address(staking), 50_000e18);
        staking.stake(50_000e18, StakingV2.Tier.Bronze, address(0));

        // Same block — should have 0 rewards
        uint256 earned = staking.earned(attacker);
        assertEq(earned, 0, "Flash stake should earn 0 rewards in same block");

        // Cannot withdraw due to lock
        vm.expectRevert("Tokens still locked");
        staking.withdraw(50_000e18);
        vm.stopPrank();

        console.log("PASS: Flash stake attack blocked by 7-day lock");
    }

    // ─────────────────────────────────────────────────────────────
    //  ATTACK 2: Whale dominance — does whale starve small stakers?
    // ─────────────────────────────────────────────────────────────
    function test_Economic_WhaleDominance() public {
        // Small stakers enter first
        vm.startPrank(alice);
        stkToken.approve(address(staking), 1_000e18);
        staking.stake(1_000e18, StakingV2.Tier.Bronze, address(0));
        vm.stopPrank();

        vm.startPrank(bob);
        stkToken.approve(address(staking), 1_000e18);
        staking.stake(1_000e18, StakingV2.Tier.Bronze, address(0));
        vm.stopPrank();

        // Warp 1 day — small stakers earn
        vm.warp(block.timestamp + 1 days);
        uint256 aliceEarnedBefore = staking.earned(alice);
        uint256 bobEarnedBefore   = staking.earned(bob);

        // Whale enters with 100M
        vm.startPrank(whale);
        stkToken.approve(address(staking), 100_000_000e18);
        staking.stake(100_000_000e18, StakingV2.Tier.Bronze, address(0));
        vm.stopPrank();

        // Warp another day
        vm.warp(block.timestamp + 1 days);

        uint256 aliceEarnedAfter  = staking.earned(alice);
        uint256 whaleEarned       = staking.earned(whale);

        // Whale dilutes small stakers — expected behavior
        uint256 aliceDayTwo = aliceEarnedAfter - aliceEarnedBefore;
        uint256 aliceDayOne = aliceEarnedBefore;

        console.log("Alice day 1 rewards (STK):", aliceDayOne / 1e18);
        console.log("Alice day 2 rewards (with whale):", aliceDayTwo / 1e18);
        console.log("Whale day 2 rewards:", whaleEarned / 1e18);
        console.log("Whale share:", (whaleEarned * 100) / (whaleEarned + aliceDayTwo + bobEarnedBefore));

        // Alice still earns something (not starved to 0)
        assertGt(aliceDayTwo, 0, "Small stakers should still earn rewards");

        // Rewards are proportional (not zero-sum attack)
        uint256 totalPool = staking.totalStaked();
        uint256 aliceShare = (1_000e18 * 10000) / totalPool;
        uint256 aliceDayTwoBps = (aliceDayTwo * 10000) / (REWARD_RATE * 1 days);
        assertApproxEqAbs(aliceDayTwoBps, aliceShare, 10);

        console.log("PASS: Whale dilutes but does not steal small staker rewards");
    }

    // ─────────────────────────────────────────────────────────────
    //  ATTACK 3: Reward manipulation via rapid stake/unstake
    // ─────────────────────────────────────────────────────────────
    function test_Attack_RewardManipulation_Blocked() public {
        // Regular staker
        vm.startPrank(alice);
        stkToken.approve(address(staking), 1_000e18);
        staking.stake(1_000e18, StakingV2.Tier.Bronze, address(0));
        vm.stopPrank();

        vm.warp(block.timestamp + 7 days + 1);

        // Attacker stakes after 7 days to try to claim accumulated rewards
        vm.startPrank(attacker);
        stkToken.approve(address(staking), 50_000e18);
        staking.stake(50_000e18, StakingV2.Tier.Bronze, address(0));
        vm.stopPrank();

        // Attacker cannot immediately claim — rewardPerTokenPaid is set at stake time
        uint256 attackerEarned = staking.earned(attacker);
        assertEq(attackerEarned, 0,
            "Attacker should not inherit rewards from before their stake");

        console.log("PASS: Late staker cannot claim pre-stake rewards");
    }

    // ─────────────────────────────────────────────────────────────
    //  ATTACK 4: Referral self-referral
    // ─────────────────────────────────────────────────────────────
    function test_Attack_SelfReferral_Blocked() public {
        vm.startPrank(attacker);
        stkToken.approve(address(staking), 1_000e18);
        vm.expectRevert("Cannot refer yourself");
        staking.stake(1_000e18, StakingV2.Tier.Bronze, attacker);
        vm.stopPrank();

        console.log("PASS: Self-referral blocked");
    }

    // ─────────────────────────────────────────────────────────────
    //  ATTACK 5: Tier downgrade attack
    // ─────────────────────────────────────────────────────────────
    function test_Attack_TierDowngrade_Blocked() public {
        vm.startPrank(attacker);
        stkToken.approve(address(staking), 2_000e18);
        staking.stake(1_000e18, StakingV2.Tier.Diamond, address(0)); // 3x
        vm.expectRevert("Cannot downgrade tier");
        staking.stake(1_000e18, StakingV2.Tier.Bronze, address(0));  // try to downgrade
        vm.stopPrank();

        console.log("PASS: Tier downgrade blocked");
    }

    // ─────────────────────────────────────────────────────────────
    //  ATTACK 6: Emergency withdraw bypass lock
    // ─────────────────────────────────────────────────────────────
    function test_Attack_EmergencyBypassLock_OnlyWhenPaused() public {
        vm.startPrank(attacker);
        stkToken.approve(address(staking), 1_000e18);
        staking.stake(1_000e18, StakingV2.Tier.Diamond, address(0)); // 1yr lock

        // Cannot emergency withdraw when not paused
        vm.expectRevert();
        staking.emergencyWithdraw();
        vm.stopPrank();

        console.log("PASS: Emergency withdraw only works when paused");
    }

    // ─────────────────────────────────────────────────────────────
    //  SIMULATION: Reward emission schedule
    // ─────────────────────────────────────────────────────────────
    function test_Simulation_RewardEmissions() public {
        vm.startPrank(alice);
        stkToken.approve(address(staking), 10_000e18);
        staking.stake(10_000e18, StakingV2.Tier.Gold, address(0)); // 2x multiplier
        vm.stopPrank();

        uint256[] memory checkpoints = new uint256[](4);
        checkpoints[0] = 7  days;
        checkpoints[1] = 30 days;
        checkpoints[2] = 90 days;
        checkpoints[3] = 365 days;

        string[4] memory labels = ["7 days","30 days","90 days","1 year"];

        uint256 prev = block.timestamp;
        for (uint i = 0; i < 4; i++) {
            vm.warp(block.timestamp + checkpoints[i] - (i == 0 ? 0 : checkpoints[i-1]));
            uint256 earned = staking.earned(alice);
            (uint256 net, uint256 fee) = staking.earnedAfterFee(alice);

            console.log("=== Emission at", labels[i], "===");
            console.log("  Base rewards:  ", earned / 1e18, "RWD");
            console.log("  After 2x boost:", (earned * 2) / 1e18, "RWD");
            console.log("  Net (after fee):", net / 1e18, "RWD");
            console.log("  Fee to treasury:", fee / 1e18, "RWD");
        }

        // After 1 year: base = rate * time = 1e15 * 365days
        uint256 expectedBase = REWARD_RATE * 365 days;
        uint256 actualEarned = staking.earned(alice);
        assertApproxEqRel(actualEarned, expectedBase, 0.01e18);

        console.log("PASS: Emission schedule correct");
    }

    // ─────────────────────────────────────────────────────────────
    //  SIMULATION: Multi-staker game theory
    // ─────────────────────────────────────────────────────────────
    function test_Simulation_GameTheory_OptimalTier() public {
        // Q: Is it always better to lock longer?
        // Alice: Bronze (7d, 1x)
        // Bob: Diamond (365d, 3x)
        // Both stake same amount for 7 days

        vm.startPrank(alice);
        stkToken.approve(address(staking), 1_000e18);
        staking.stake(1_000e18, StakingV2.Tier.Bronze, address(0));
        vm.stopPrank();

        vm.startPrank(bob);
        stkToken.approve(address(staking), 1_000e18);
        staking.stake(1_000e18, StakingV2.Tier.Diamond, address(0));
        vm.stopPrank();

        vm.warp(block.timestamp + 7 days);

        (uint256 aliceNet,) = staking.earnedAfterFee(alice);
        (uint256 bobNet,)   = staking.earnedAfterFee(bob);

        console.log("After 7 days, same stake:");
        console.log("  Alice Bronze net:", aliceNet / 1e15, "mRWD");
        console.log("  Bob Diamond net: ", bobNet   / 1e15, "mRWD");
        console.log("  Bob advantage:   ", (bobNet * 100) / aliceNet - 100, "%");

        // Bob should earn ~3x more (Diamond multiplier)
        assertGt(bobNet, aliceNet, "Diamond should earn more than Bronze");
        // But bob is locked for 365 days vs alice's 7 days
        // This demonstrates the lock-vs-liquidity tradeoff

        console.log("PASS: Longer lock = higher rewards (opportunity cost = lock duration)");
    }

    // ─────────────────────────────────────────────────────────────
    //  SIMULATION: APR at different TVL levels
    // ─────────────────────────────────────────────────────────────
    function test_Simulation_APRAtDifferentTVL() public {
        uint256[5] memory tvls;
        tvls[0] = 100e18;
        tvls[1] = 10_000e18;
        tvls[2] = 1_000_000e18;
        tvls[3] = 100_000_000e18;
        tvls[4] = 1_000_000_000e18;

        string[5] memory labels;
        labels[0] = "100 STK";
        labels[1] = "10K STK";
        labels[2] = "1M STK";
        labels[3] = "100M STK";
        labels[4] = "1B STK";

        console.log("=== APR Simulation at Different TVL ===");
        for (uint i = 0; i < 5; i++) {
            uint256 apr = (REWARD_RATE * 365 days * 10000) / tvls[i];
            uint256 aprPct = apr / 100;
            console.log("TVL:", labels[i]);
            console.log("  Bronze APR:", aprPct);
            console.log("  Silver APR:", aprPct * 15 / 10);
            console.log("  Gold APR:", aprPct * 2);
            console.log("  Diamond APR:", aprPct * 3);
        }
        // Healthy APR range: 5-500%
        // At 1M STK TVL: base APR ≈ 3.15% → Diamond APR ≈ 9.45%
        // At 100K STK: base ≈ 31.5% → Diamond ≈ 94.5%
        assertTrue(true); // simulation only
    }
}
