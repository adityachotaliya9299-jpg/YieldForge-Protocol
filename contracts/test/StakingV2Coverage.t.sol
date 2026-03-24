// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/StakingV2.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockSTK3 is ERC20 {
    constructor() ERC20("STK","STK") { _mint(msg.sender, 1_000_000_000e18); }
    function mint(address to, uint256 amt) external { _mint(to, amt); }
}
contract MockRWD3 is ERC20 {
    constructor() ERC20("RWD","RWD") { _mint(msg.sender, 1_000_000_000e18); }
}

contract StakingV2CoverageTest is Test {
    StakingV2  public staking;
    MockSTK3   public stkToken;
    MockRWD3   public rwdToken;

    address owner    = address(this);
    address treasury = makeAddr("treasury");
    address alice    = makeAddr("alice");
    address bob      = makeAddr("bob");
    address charlie  = makeAddr("charlie");

    function setUp() public {
        stkToken = new MockSTK3();
        rwdToken = new MockRWD3();
        staking  = new StakingV2(address(stkToken), address(rwdToken), 1e15, treasury, owner);
        rwdToken.approve(address(staking), 100_000_000e18);
        staking.fundRewards(100_000_000e18);
        stkToken.transfer(alice,   100_000e18);
        stkToken.transfer(bob,     100_000e18);
        stkToken.transfer(charlie, 100_000e18);
    }

    // ── All 4 tiers ────────────────────────────────────────────
    function test_Stake_BronzeTier() public {
        vm.startPrank(alice);
        stkToken.approve(address(staking), 1_000e18);
        staking.stake(1_000e18, StakingV2.Tier.Bronze, address(0));
        (uint256 staked,,,,, StakingV2.Tier t,) = staking.userInfo(alice);
        vm.stopPrank();
        assertEq(staked, 1_000e18);
        assertEq(uint8(t), uint8(StakingV2.Tier.Bronze));
    }

    function test_Stake_SilverTier() public {
        vm.startPrank(alice);
        stkToken.approve(address(staking), 1_000e18);
        staking.stake(1_000e18, StakingV2.Tier.Silver, address(0));
        (,,,,, StakingV2.Tier t,) = staking.userInfo(alice);
        vm.stopPrank();
        assertEq(uint8(t), uint8(StakingV2.Tier.Silver));
    }

    function test_Stake_GoldTier() public {
        vm.startPrank(alice);
        stkToken.approve(address(staking), 1_000e18);
        staking.stake(1_000e18, StakingV2.Tier.Gold, address(0));
        (,,,,, StakingV2.Tier t,) = staking.userInfo(alice);
        vm.stopPrank();
        assertEq(uint8(t), uint8(StakingV2.Tier.Gold));
    }

    function test_Stake_DiamondTier() public {
        vm.startPrank(alice);
        stkToken.approve(address(staking), 1_000e18);
        staking.stake(1_000e18, StakingV2.Tier.Diamond, address(0));
        (,,,,, StakingV2.Tier t,) = staking.userInfo(alice);
        vm.stopPrank();
        assertEq(uint8(t), uint8(StakingV2.Tier.Diamond));
    }

    // ── Upgrade tier ──────────────────────────────────────────
    function test_UpgradeTier_BronzeToGold() public {
        vm.startPrank(alice);
        stkToken.approve(address(staking), 2_000e18);
        staking.stake(1_000e18, StakingV2.Tier.Bronze, address(0));
        staking.stake(1_000e18, StakingV2.Tier.Gold, address(0));
        (,,,,, StakingV2.Tier t,) = staking.userInfo(alice);
        vm.stopPrank();
        assertEq(uint8(t), uint8(StakingV2.Tier.Gold));
    }

    // ── Referral ───────────────────────────────────────────────
    function test_Referral_BobRefersAlice() public {
        vm.startPrank(alice);
        stkToken.approve(address(staking), 1_000e18);
        staking.stake(1_000e18, StakingV2.Tier.Bronze, bob);
        vm.stopPrank();

        vm.warp(block.timestamp + 100);
        uint256 bobBefore = rwdToken.balanceOf(bob);
        vm.prank(alice);
        staking.claimRewards();
        assertGt(rwdToken.balanceOf(bob), bobBefore);
    }

    function test_Referral_SetsReferrerOnce() public {
        vm.startPrank(alice);
        stkToken.approve(address(staking), 2_000e18);
        staking.stake(1_000e18, StakingV2.Tier.Bronze, bob);
        staking.stake(1_000e18, StakingV2.Tier.Bronze, charlie); // second referral ignored
        (,,,,,, address ref) = staking.userInfo(alice);
        vm.stopPrank();
        assertEq(ref, bob); // first referrer sticks
    }

    // ── Withdraw ───────────────────────────────────────────────
    function test_Withdraw_FullAmount() public {
        vm.startPrank(alice);
        stkToken.approve(address(staking), 1_000e18);
        staking.stake(1_000e18, StakingV2.Tier.Bronze, address(0));
        vm.warp(block.timestamp + 7 days + 1);
        uint256 before = stkToken.balanceOf(alice);
        staking.withdraw(1_000e18);
        vm.stopPrank();
        assertEq(stkToken.balanceOf(alice), before + 1_000e18);
    }

    function test_Withdraw_PartialAmount() public {
        vm.startPrank(alice);
        stkToken.approve(address(staking), 1_000e18);
        staking.stake(1_000e18, StakingV2.Tier.Bronze, address(0));
        vm.warp(block.timestamp + 7 days + 1);
        staking.withdraw(500e18);
        (uint256 staked,,,,,,) = staking.userInfo(alice);
        vm.stopPrank();
        assertEq(staked, 500e18);
    }

    function test_Withdraw_ZeroReverts() public {
        vm.startPrank(alice);
        stkToken.approve(address(staking), 1_000e18);
        staking.stake(1_000e18, StakingV2.Tier.Bronze, address(0));
        vm.warp(block.timestamp + 7 days + 1);
        vm.expectRevert();
        staking.withdraw(0);
        vm.stopPrank();
    }

    function test_Withdraw_MoreThanStakedReverts() public {
        vm.startPrank(alice);
        stkToken.approve(address(staking), 1_000e18);
        staking.stake(1_000e18, StakingV2.Tier.Bronze, address(0));
        vm.warp(block.timestamp + 7 days + 1);
        vm.expectRevert();
        staking.withdraw(2_000e18);
        vm.stopPrank();
    }

    // ── Claim rewards ──────────────────────────────────────────
    function test_ClaimRewards_SendsRWD() public {
        vm.startPrank(alice);
        stkToken.approve(address(staking), 1_000e18);
        staking.stake(1_000e18, StakingV2.Tier.Bronze, address(0));
        vm.warp(block.timestamp + 1 days);
        uint256 before = rwdToken.balanceOf(alice);
        staking.claimRewards();
        vm.stopPrank();
        assertGt(rwdToken.balanceOf(alice), before);
    }

    function test_ClaimRewards_NoRewardsReverts() public {
        vm.startPrank(alice);
        stkToken.approve(address(staking), 1_000e18);
        staking.stake(1_000e18, StakingV2.Tier.Bronze, address(0));
        // Same block — no rewards yet
        vm.expectRevert();
        staking.claimRewards();
        vm.stopPrank();
    }

    function test_ClaimRewards_SendsFeeToTreasury() public {
        vm.startPrank(alice);
        stkToken.approve(address(staking), 1_000e18);
        staking.stake(1_000e18, StakingV2.Tier.Bronze, address(0));
        vm.warp(block.timestamp + 1 days);
        uint256 before = rwdToken.balanceOf(treasury);
        staking.claimRewards();
        vm.stopPrank();
        assertGt(rwdToken.balanceOf(treasury), before);
    }

    // ── Exit (withdraw + claim) ────────────────────────────────
    function test_Exit_WithdrawsAndClaims() public {
        vm.startPrank(alice);
        stkToken.approve(address(staking), 1_000e18);
        staking.stake(1_000e18, StakingV2.Tier.Bronze, address(0));
        vm.warp(block.timestamp + 7 days + 1);
        uint256 stkBefore = stkToken.balanceOf(alice);
        uint256 rwdBefore = rwdToken.balanceOf(alice);
        staking.exit();
        vm.stopPrank();
        assertGt(stkToken.balanceOf(alice), stkBefore);
        assertGt(rwdToken.balanceOf(alice), rwdBefore);
    }

    // ── Pause ──────────────────────────────────────────────────
    function test_Pause_BlocksStake() public {
        staking.pause();
        vm.startPrank(alice);
        stkToken.approve(address(staking), 1_000e18);
        vm.expectRevert();
        staking.stake(1_000e18, StakingV2.Tier.Bronze, address(0));
        vm.stopPrank();
    }

    function test_Pause_AllowsEmergencyWithdraw() public {
        vm.startPrank(alice);
        stkToken.approve(address(staking), 1_000e18);
        staking.stake(1_000e18, StakingV2.Tier.Bronze, address(0));
        vm.stopPrank();

        staking.pause();

        uint256 before = stkToken.balanceOf(alice);
        vm.prank(alice);
        staking.emergencyWithdraw();
        assertGt(stkToken.balanceOf(alice), before);
    }

    function test_Unpause_AllowsStake() public {
        staking.pause();
        staking.unpause();

        vm.startPrank(alice);
        stkToken.approve(address(staking), 1_000e18);
        staking.stake(1_000e18, StakingV2.Tier.Bronze, address(0)); // should not revert
        vm.stopPrank();
    }

    // ── Admin setters ──────────────────────────────────────────
    function test_SetRewardRate_Owner() public {
        staking.setRewardRate(2e15);
        assertEq(staking.rewardRatePerSecond(), 2e15);
    }

    function test_SetRewardRate_NonOwnerReverts() public {
        vm.prank(alice);
        vm.expectRevert();
        staking.setRewardRate(2e15);
    }

    function test_SetPerformanceFee_Max20Percent() public {
        staking.setPerformanceFee(2000); // 20%
        assertEq(staking.performanceFeeBps(), 2000);
    }

    function test_SetPerformanceFee_Over20Reverts() public {
        vm.expectRevert();
        staking.setPerformanceFee(2001);
    }

    function test_SetTreasury() public {
        staking.setTreasury(alice);
        assertEq(staking.treasury(), alice);
    }

    function test_SetTreasury_ZeroAddressReverts() public {
        vm.expectRevert();
        staking.setTreasury(address(0));
    }

    // ── earnedAfterFee ─────────────────────────────────────────
    function test_EarnedAfterFee_CorrectSplit() public {
        vm.startPrank(alice);
        stkToken.approve(address(staking), 1_000e18);
        staking.stake(1_000e18, StakingV2.Tier.Bronze, address(0));
        vm.stopPrank();

        vm.warp(block.timestamp + 1000);
        (uint256 net, uint256 fee) = staking.earnedAfterFee(alice);
        uint256 total = net + fee;
        uint256 gross = staking.earned(alice);

        assertApproxEqRel(total, gross, 0.001e18);
        assertApproxEqRel(fee, (gross * 500) / 10000, 0.001e18); // 5% fee
    }

    // ── getTierConfig ──────────────────────────────────────────
    function test_GetTierConfig_AllTiers() public {
        for (uint8 i = 0; i < 4; i++) {
            StakingV2.TierConfig memory cfg = staking.getTierConfig(StakingV2.Tier(i));
            assertGt(cfg.lockDuration, 0);
            assertGt(cfg.multiplierBps, 0);
        }
    }

    // ── rewardPerToken with 0 staked ───────────────────────────
    function test_RewardPerToken_NoStakers() public {
        uint256 rpt = staking.rewardPerToken();
        assertGe(rpt, 0); // should not revert
    }

    // ── fundRewards ────────────────────────────────────────────
    function test_FundRewards_IncreasesBalance() public {
        uint256 before = rwdToken.balanceOf(address(staking));
        rwdToken.approve(address(staking), 1_000e18);
        staking.fundRewards(1_000e18);
        assertGt(rwdToken.balanceOf(address(staking)), before);
    }
}
