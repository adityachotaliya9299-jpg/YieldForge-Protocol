// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/StakingContract.sol";
import "../src/StakingToken.sol";
import "../src/RewardToken.sol";

contract StakingContractTest is Test {
    StakingContract public staking;
    StakingToken    public stakingToken;
    RewardToken     public rewardToken;

    address owner   = address(this);
    address alice   = makeAddr("alice");
    address bob     = makeAddr("bob");

    // 1 reward token per second
    uint256 constant REWARD_RATE = 1e18;

    // ─────────────────────────────────────────────
    //  Setup
    // ─────────────────────────────────────────────

    function setUp() public {
        stakingToken = new StakingToken("StakeToken", "STK", 18, 1_000_000e18, owner);
        rewardToken  = new RewardToken("RewardToken", "RWD", 18, 10_000_000e18, owner);

        staking = new StakingContract(
            address(stakingToken),
            address(rewardToken),
            REWARD_RATE,
            owner
        );

        // Fund staking contract with rewards
        rewardToken.approve(address(staking), 1_000_000e18);
        staking.fundRewards(1_000_000e18);

        // Give Alice and Bob some staking tokens
        stakingToken.transfer(alice, 10_000e18);
        stakingToken.transfer(bob,   10_000e18);
    }

    // ─────────────────────────────────────────────
    //  Stake
    // ─────────────────────────────────────────────

    function test_Stake_Basic() public {
        vm.startPrank(alice);
        stakingToken.approve(address(staking), 1_000e18);
        staking.stake(1_000e18);
        vm.stopPrank();

        (uint256 staked,,,, ) = _getUserInfo(alice);
        assertEq(staked, 1_000e18);
        assertEq(staking.totalStaked(), 1_000e18);
    }

    function test_Stake_Zero_Reverts() public {
        vm.startPrank(alice);
        stakingToken.approve(address(staking), 100e18);
        vm.expectRevert("Cannot stake 0");
        staking.stake(0);
        vm.stopPrank();
    }

    function test_Stake_ResetsLock() public {
        vm.startPrank(alice);
        stakingToken.approve(address(staking), 2_000e18);

        staking.stake(1_000e18);
        (,,,uint256 lockAfterFirst,) = staking.userInfo(alice);

        vm.warp(block.timestamp + 3 days);

        staking.stake(1_000e18);
        (,,,uint256 lockAfterSecond,) = staking.userInfo(alice);

        assertGt(lockAfterSecond, lockAfterFirst, "Lock should reset");
        vm.stopPrank();
    }

    // ─────────────────────────────────────────────
    //  Withdraw
    // ─────────────────────────────────────────────

    function test_Withdraw_AfterLock() public {
        vm.startPrank(alice);
        stakingToken.approve(address(staking), 1_000e18);
        staking.stake(1_000e18);

        vm.warp(block.timestamp + 7 days + 1);
        staking.withdraw(1_000e18);
        vm.stopPrank();

        (uint256 staked,,,, ) = _getUserInfo(alice);
        assertEq(staked, 0);
    }

    function test_Withdraw_BeforeLock_Reverts() public {
        vm.startPrank(alice);
        stakingToken.approve(address(staking), 1_000e18);
        staking.stake(1_000e18);

        vm.warp(block.timestamp + 3 days);
        vm.expectRevert("Tokens are still locked");
        staking.withdraw(1_000e18);
        vm.stopPrank();
    }

    function test_Withdraw_MoreThanStaked_Reverts() public {
        vm.startPrank(alice);
        stakingToken.approve(address(staking), 1_000e18);
        staking.stake(1_000e18);
        vm.warp(block.timestamp + 8 days);
        vm.expectRevert("Insufficient staked balance");
        staking.withdraw(2_000e18);
        vm.stopPrank();
    }

    // ─────────────────────────────────────────────
    //  Rewards
    // ─────────────────────────────────────────────

    function test_RewardsAccrue() public {
        vm.startPrank(alice);
        stakingToken.approve(address(staking), 1_000e18);
        staking.stake(1_000e18);
        vm.stopPrank();

        vm.warp(block.timestamp + 100);

        uint256 earned = staking.earned(alice);
        // 1e18 reward/sec * 100 sec = 100e18
        assertApproxEqAbs(earned, 100e18, 1e15, "Rewards should accrue correctly");
    }

    function test_ClaimRewards() public {
        vm.startPrank(alice);
        stakingToken.approve(address(staking), 1_000e18);
        staking.stake(1_000e18);

        vm.warp(block.timestamp + 100);

        uint256 balBefore = rewardToken.balanceOf(alice);
        staking.claimRewards();
        uint256 balAfter = rewardToken.balanceOf(alice);

        assertGt(balAfter, balBefore, "Should have received rewards");
        vm.stopPrank();
    }

    function test_TwoStakers_ProportionalRewards() public {
        // Alice stakes 1000
        vm.startPrank(alice);
        stakingToken.approve(address(staking), 1_000e18);
        staking.stake(1_000e18);
        vm.stopPrank();

        // Bob stakes 1000 at the same time
        vm.startPrank(bob);
        stakingToken.approve(address(staking), 1_000e18);
        staking.stake(1_000e18);
        vm.stopPrank();

        vm.warp(block.timestamp + 100);

        uint256 aliceEarned = staking.earned(alice);
        uint256 bobEarned   = staking.earned(bob);

        // Both staked equal, so rewards should be ~equal
        assertApproxEqAbs(aliceEarned, bobEarned, 1e15, "Equal stakers should earn equally");
    }

    // ─────────────────────────────────────────────
    //  APR
    // ─────────────────────────────────────────────

    function test_APR_Calculation() public {
        vm.startPrank(alice);
        stakingToken.approve(address(staking), 1_000e18);
        staking.stake(1_000e18);
        vm.stopPrank();

        uint256 apr = staking.currentAPR();
        // rewardRate=1e18/s, totalStaked=1000e18, year=365*24*3600
        // APR = (1e18 * 31536000 * 10000) / 1000e18 = 315360000 bps = 31536%
        assertGt(apr, 0, "APR should be positive");
    }

    function test_APR_Zero_When_NoStake() public {
        assertEq(staking.currentAPR(), 0);
    }

    // ─────────────────────────────────────────────
    //  Exit
    // ─────────────────────────────────────────────

    function test_Exit() public {
        vm.startPrank(alice);
        stakingToken.approve(address(staking), 1_000e18);
        staking.stake(1_000e18);

        vm.warp(block.timestamp + 8 days);
        staking.exit();
        vm.stopPrank();

        (uint256 staked,,,, ) = _getUserInfo(alice);
        assertEq(staked, 0);
        assertGt(rewardToken.balanceOf(alice), 0);
    }

    // ─────────────────────────────────────────────
    //  Owner
    // ─────────────────────────────────────────────

    function test_SetRewardRate() public {
        staking.setRewardRate(2e18);
        assertEq(staking.rewardRatePerSecond(), 2e18);
    }

    function test_SetRewardRate_NonOwner_Reverts() public {
        vm.prank(alice);
        vm.expectRevert();
        staking.setRewardRate(2e18);
    }

    // ─────────────────────────────────────────────
    //  Fuzz
    // ─────────────────────────────────────────────

    function testFuzz_Stake_Withdraw(uint96 amount) public {
        vm.assume(amount > 0 && amount <= 10_000e18);

        vm.startPrank(alice);
        stakingToken.approve(address(staking), amount);
        staking.stake(amount);

        vm.warp(block.timestamp + 8 days);
        staking.withdraw(amount);
        vm.stopPrank();

        (uint256 staked,,,, ) = _getUserInfo(alice);
        assertEq(staked, 0);
    }

    // ─────────────────────────────────────────────
    //  Helpers
    // ─────────────────────────────────────────────

    function _getUserInfo(address user)
        internal
        view
        returns (uint256, uint256, uint256, uint256, uint256)
    {
        (
            uint256 stakedAmount,
            uint256 rewardPerTokenPaid,
            uint256 pendingRewards,
            uint256 lockUntil,
            uint256 stakedAt
        ) = staking.userInfo(user);
        return (stakedAmount, rewardPerTokenPaid, pendingRewards, lockUntil, stakedAt);
    }
}
