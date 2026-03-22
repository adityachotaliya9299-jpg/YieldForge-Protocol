// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/StakingV2.sol";
import "../src/RewardVault.sol";
import "../src/StakingToken.sol";
import "../src/RewardToken.sol";

contract StakingV2Test is Test {
    StakingV2    public staking;
    StakingToken public stkToken;
    RewardToken  public rwdToken;
    RewardVault  public vault;

    address owner    = address(this);
    address alice    = makeAddr("alice");
    address bob      = makeAddr("bob");
    address charlie  = makeAddr("charlie");
    address treasury = makeAddr("treasury");

    uint256 constant REWARD_RATE = 1e18; // 1 RWD/sec

    function setUp() public {
        stkToken = new StakingToken("StakeToken","STK",18, 1_000_000e18, owner);
        rwdToken = new RewardToken("RewardToken","RWD",18,10_000_000e18, owner);
        vault    = new RewardVault(address(rwdToken), owner);

        staking = new StakingV2(
            address(stkToken),
            address(rwdToken),
            REWARD_RATE,
            treasury,
            owner
        );

        // Fund staking contract
        rwdToken.approve(address(staking), 1_000_000e18);
        staking.fundRewards(1_000_000e18);

        // Give users tokens
        stkToken.transfer(alice,   10_000e18);
        stkToken.transfer(bob,     10_000e18);
        stkToken.transfer(charlie, 10_000e18);
    }

    // ─────────────────────────────────────────────
    //  Stake — Basic
    // ─────────────────────────────────────────────

    function test_Stake_Bronze() public {
        vm.startPrank(alice);
        stkToken.approve(address(staking), 1_000e18);
        staking.stake(1_000e18, StakingV2.Tier.Bronze, address(0));
        vm.stopPrank();

        (uint256 staked,,,,, StakingV2.Tier tier,) = staking.userInfo(alice);
        assertEq(staked, 1_000e18);
        assertEq(uint8(tier), uint8(StakingV2.Tier.Bronze));
        assertEq(staking.totalStaked(), 1_000e18);
    }

    function test_Stake_Diamond() public {
        vm.startPrank(alice);
        stkToken.approve(address(staking), 1_000e18);
        staking.stake(1_000e18, StakingV2.Tier.Diamond, address(0));
        vm.stopPrank();

        (,,,,, StakingV2.Tier tier,) = staking.userInfo(alice);
        assertEq(uint8(tier), uint8(StakingV2.Tier.Diamond));
    }

    function test_Stake_CannotDowngradeTier() public {
        vm.startPrank(alice);
        stkToken.approve(address(staking), 2_000e18);
        staking.stake(1_000e18, StakingV2.Tier.Gold, address(0));

        vm.expectRevert("Cannot downgrade tier");
        staking.stake(1_000e18, StakingV2.Tier.Bronze, address(0));
        vm.stopPrank();
    }

    function test_Stake_CanUpgradeTier() public {
        vm.startPrank(alice);
        stkToken.approve(address(staking), 2_000e18);
        staking.stake(1_000e18, StakingV2.Tier.Bronze, address(0));
        staking.stake(1_000e18, StakingV2.Tier.Gold,   address(0));
        vm.stopPrank();

        (uint256 staked,,,,, StakingV2.Tier tier,) = staking.userInfo(alice);
        assertEq(staked, 2_000e18);
        assertEq(uint8(tier), uint8(StakingV2.Tier.Gold));
    }

    // ─────────────────────────────────────────────
    //  Lock Periods
    // ─────────────────────────────────────────────

    function test_Lock_Bronze_7Days() public {
        vm.startPrank(alice);
        stkToken.approve(address(staking), 1_000e18);
        staking.stake(1_000e18, StakingV2.Tier.Bronze, address(0));
        vm.stopPrank();

        // Should be locked for 7 days
        assertGt(staking.timeUntilUnlock(alice), 6 days);
        assertLe(staking.timeUntilUnlock(alice), 7 days);
    }

    function test_Lock_Diamond_365Days() public {
        vm.startPrank(alice);
        stkToken.approve(address(staking), 1_000e18);
        staking.stake(1_000e18, StakingV2.Tier.Diamond, address(0));
        vm.stopPrank();

        assertGt(staking.timeUntilUnlock(alice), 364 days);
    }

    // ─────────────────────────────────────────────
    //  Rewards + Multiplier
    // ─────────────────────────────────────────────

    function test_Rewards_BronzeMultiplier_1x() public {
        vm.startPrank(alice);
        stkToken.approve(address(staking), 1_000e18);
        staking.stake(1_000e18, StakingV2.Tier.Bronze, address(0));
        vm.stopPrank();

        vm.warp(block.timestamp + 100);

        (uint256 net, uint256 fee) = staking.earnedAfterFee(alice);
        // base ≈ 100e18, boosted = 100e18 * 10000/10000 = 100e18, fee = 5e18
        assertApproxEqAbs(net + fee, 100e18, 1e15);
        assertApproxEqAbs(fee, 5e18, 1e15); // 5% fee
    }

    function test_Rewards_GoldMultiplier_2x() public {
        vm.startPrank(alice);
        stkToken.approve(address(staking), 1_000e18);
        staking.stake(1_000e18, StakingV2.Tier.Gold, address(0));
        vm.stopPrank();

        vm.warp(block.timestamp + 100);

        (uint256 net, uint256 fee) = staking.earnedAfterFee(alice);
        // base ≈ 100e18, boosted = 200e18, fee = 10e18, net = 190e18
        assertApproxEqAbs(net + fee, 200e18, 1e15);
    }

    function test_Rewards_DiamondMultiplier_3x() public {
        vm.startPrank(alice);
        stkToken.approve(address(staking), 1_000e18);
        staking.stake(1_000e18, StakingV2.Tier.Diamond, address(0));
        vm.stopPrank();

        vm.warp(block.timestamp + 100);

        (uint256 net, uint256 fee) = staking.earnedAfterFee(alice);
        assertApproxEqAbs(net + fee, 300e18, 1e15);
    }

    // ─────────────────────────────────────────────
    //  Performance Fee
    // ─────────────────────────────────────────────

    function test_PerformanceFee_GoesToTreasury() public {
        vm.startPrank(alice);
        stkToken.approve(address(staking), 1_000e18);
        staking.stake(1_000e18, StakingV2.Tier.Bronze, address(0));
        vm.stopPrank();

        vm.warp(block.timestamp + 100);

        uint256 treasuryBefore = rwdToken.balanceOf(treasury);

        vm.prank(alice);
        staking.claimRewards();

        uint256 treasuryAfter = rwdToken.balanceOf(treasury);
        assertGt(treasuryAfter, treasuryBefore, "Treasury should receive fee");
    }

    function test_PerformanceFee_SetAndCap() public {
        staking.setPerformanceFee(1000); // 10%
        assertEq(staking.performanceFeeBps(), 1000);

        vm.expectRevert("Fee too high");
        staking.setPerformanceFee(2001); // > 20%
    }

    // ─────────────────────────────────────────────
    //  Referral
    // ─────────────────────────────────────────────

    function test_Referral_CannotReferSelf() public {
        vm.startPrank(alice);
        stkToken.approve(address(staking), 1_000e18);
        vm.expectRevert("Cannot refer yourself");
        staking.stake(1_000e18, StakingV2.Tier.Bronze, alice);
        vm.stopPrank();
    }

    function test_Referral_BonusPaidToReferrer() public {
        // Bob refers Alice
        vm.startPrank(alice);
        stkToken.approve(address(staking), 1_000e18);
        staking.stake(1_000e18, StakingV2.Tier.Bronze, bob);
        vm.stopPrank();

        vm.warp(block.timestamp + 1000);

        uint256 bobBefore = rwdToken.balanceOf(bob);

        vm.prank(alice);
        staking.claimRewards();

        uint256 bobAfter = rwdToken.balanceOf(bob);
        assertGt(bobAfter, bobBefore, "Bob should earn referral bonus");
        assertEq(staking.referralCount(bob), 1);
    }

    function test_Referral_OnlySetOnFirstStake() public {
        vm.startPrank(alice);
        stkToken.approve(address(staking), 2_000e18);
        staking.stake(1_000e18, StakingV2.Tier.Bronze, bob);    // first: referrer = bob
        staking.stake(1_000e18, StakingV2.Tier.Bronze, charlie); // second: should NOT change referrer
        vm.stopPrank();

        (,,,,,, address referrer) = staking.userInfo(alice);
        assertEq(referrer, bob, "Referrer should remain bob");
    }

    // ─────────────────────────────────────────────
    //  Emergency
    // ─────────────────────────────────────────────

    function test_Emergency_PauseAndUnpause() public {
        staking.pause();

        vm.startPrank(alice);
        stkToken.approve(address(staking), 1_000e18);
        vm.expectRevert();
        staking.stake(1_000e18, StakingV2.Tier.Bronze, address(0));
        vm.stopPrank();

        staking.unpause();

        vm.startPrank(alice);
        staking.stake(1_000e18, StakingV2.Tier.Bronze, address(0));
        vm.stopPrank();
    }

    function test_Emergency_WithdrawWhenPaused() public {
        vm.startPrank(alice);
        stkToken.approve(address(staking), 1_000e18);
        staking.stake(1_000e18, StakingV2.Tier.Bronze, address(0));
        vm.stopPrank();

        staking.pause();

        uint256 balBefore = stkToken.balanceOf(alice);
        vm.prank(alice);
        staking.emergencyWithdraw();
        uint256 balAfter = stkToken.balanceOf(alice);

        assertEq(balAfter - balBefore, 1_000e18, "Should get tokens back");
    }

    function test_Emergency_WithdrawOnlyWhenPaused() public {
        vm.startPrank(alice);
        stkToken.approve(address(staking), 1_000e18);
        staking.stake(1_000e18, StakingV2.Tier.Bronze, address(0));

        vm.expectRevert(); // Not paused
        staking.emergencyWithdraw();
        vm.stopPrank();
    }

    // ─────────────────────────────────────────────
    //  Withdraw
    // ─────────────────────────────────────────────

    function test_Withdraw_AfterBronzeLock() public {
        vm.startPrank(alice);
        stkToken.approve(address(staking), 1_000e18);
        staking.stake(1_000e18, StakingV2.Tier.Bronze, address(0));

        vm.warp(block.timestamp + 7 days + 1);
        staking.withdraw(1_000e18);
        vm.stopPrank();

        (uint256 staked,,,,,,) = staking.userInfo(alice);
        assertEq(staked, 0);
    }

    function test_Withdraw_BeforeLock_Reverts() public {
        vm.startPrank(alice);
        stkToken.approve(address(staking), 1_000e18);
        staking.stake(1_000e18, StakingV2.Tier.Bronze, address(0));

        vm.warp(block.timestamp + 3 days);
        vm.expectRevert("Tokens still locked");
        staking.withdraw(1_000e18);
        vm.stopPrank();
    }

    // ─────────────────────────────────────────────
    //  Fuzz
    // ─────────────────────────────────────────────

    function testFuzz_StakeWithdraw(uint96 amount) public {
        vm.assume(amount > 0 && amount <= 10_000e18);

        vm.startPrank(alice);
        stkToken.approve(address(staking), amount);
        staking.stake(amount, StakingV2.Tier.Bronze, address(0));

        vm.warp(block.timestamp + 8 days);
        staking.withdraw(amount);
        vm.stopPrank();

        (uint256 staked,,,,,,) = staking.userInfo(alice);
        assertEq(staked, 0);
    }
}
