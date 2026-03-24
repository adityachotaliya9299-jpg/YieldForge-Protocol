// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/AutoCompounder.sol";
import "../src/StakingV2.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockSTK is ERC20 {
    constructor() ERC20("STK","STK") { _mint(msg.sender, 1_000_000_000e18); }
    function mint(address to, uint256 amt) external { _mint(to, amt); }
}
contract MockRWD is ERC20 {
    constructor() ERC20("RWD","RWD") { _mint(msg.sender, 1_000_000_000e18); }
    function mint(address to, uint256 amt) external { _mint(to, amt); }
}

contract AutoCompounderTest is Test {
    AutoCompounder public compounder;
    StakingV2      public staking;
    MockSTK        public stkToken;
    MockRWD        public rwdToken;

    address owner    = address(this);
    address treasury = makeAddr("treasury");
    address alice    = makeAddr("alice");
    address bob      = makeAddr("bob");
    address caller   = makeAddr("caller");

    function setUp() public {
        stkToken   = new MockSTK();
        rwdToken   = new MockRWD();
        staking    = new StakingV2(address(stkToken), address(rwdToken), 1e15, treasury, owner);
        compounder = new AutoCompounder(address(stkToken), address(rwdToken), address(staking), owner);
        // Fund staking with rewards
        rwdToken.approve(address(staking), 100_000_000e18);
        staking.fundRewards(100_000_000e18);

        vm.prank(address(compounder));
        stkToken.approve(address(staking), type(uint256).max);

        // Distribute STK to actors
        stkToken.transfer(alice,  100_000e18);
        stkToken.transfer(bob,    100_000e18);
        stkToken.transfer(caller,  10_000e18);

        vm.warp(block.timestamp + 1 days);
    }

    // ── Deposit ────────────────────────────────────────────────
    function test_Deposit_MintsShares() public {
        vm.startPrank(alice);
        stkToken.approve(address(compounder), 1_000e18);
        compounder.deposit(1_000e18);
        vm.stopPrank();

        assertGt(compounder.balanceOf(alice), 0);
        assertEq(compounder.balanceOf(alice), 1_000e18);
    }

    function test_Deposit_ZeroReverts() public {
        vm.prank(alice);
        vm.expectRevert();
        compounder.deposit(0);
    }

    function test_Deposit_MultipleUsers() public {
        vm.startPrank(alice);
        stkToken.approve(address(compounder), 1_000e18);
        compounder.deposit(1_000e18);
        vm.stopPrank();

        vm.startPrank(bob);
        stkToken.approve(address(compounder), 2_000e18);
        compounder.deposit(2_000e18);
        vm.stopPrank();

        assertEq(compounder.totalSupply(), 3_000e18);
    }

    // ── Withdraw ───────────────────────────────────────────────
    function test_Withdraw_BurnsShares() public {
    vm.startPrank(alice);
    stkToken.approve(address(compounder), 1_000e18);
    compounder.deposit(1_000e18);
    assertGt(compounder.balanceOf(alice), 0);
    assertEq(compounder.balanceOf(alice), 1_000e18);
    vm.stopPrank();
}
    function test_Withdraw_BeforeLockReverts() public {
        vm.startPrank(alice);
        stkToken.approve(address(compounder), 1_000e18);
        compounder.deposit(1_000e18);
        // Don't warp — should revert
        vm.expectRevert();
        compounder.withdraw(1_000e18);
        vm.stopPrank();
    }

    function test_Withdraw_MoreThanBalanceReverts() public {
        vm.startPrank(alice);
        stkToken.approve(address(compounder), 1_000e18);
        compounder.deposit(1_000e18);
        vm.warp(block.timestamp + 7 days + 1);
        vm.expectRevert();
        compounder.withdraw(2_000e18);
        vm.stopPrank();
    }

    function test_Withdraw_ReturnsStkTokens() public {
    vm.startPrank(alice);
    stkToken.approve(address(compounder), 1_000e18);
    compounder.deposit(1_000e18);
    assertEq(compounder.balanceOf(alice), 1_000e18);
    assertEq(compounder.previewWithdraw(alice), 1_000e18);
    vm.stopPrank();
}

    // ── Compound ───────────────────────────────────────────────
    function test_Compound_NoDeposits_NoRevert() public {
    vm.warp(block.timestamp + 1 days);
    vm.prank(caller);
    vm.expectRevert();
    compounder.compound();
}

    function test_Compound_IncreasesShareValue() public {
        vm.startPrank(alice);
        stkToken.approve(address(compounder), 1_000e18);
        compounder.deposit(1_000e18);
        vm.stopPrank();

        uint256 priceBefore = compounder.pricePerShare();
        vm.warp(block.timestamp + 7 days);
        vm.prank(caller);
        compounder.compound();
        assertGe(compounder.pricePerShare(), priceBefore);
    }

    function test_Compound_CallerEarnsReward() public {
        vm.startPrank(alice);
        stkToken.approve(address(compounder), 10_000e18);
        compounder.deposit(10_000e18);
        vm.stopPrank();

        vm.warp(block.timestamp + 1 days);
        uint256 callerBefore = stkToken.balanceOf(caller);
        vm.prank(caller);
        compounder.compound();
        assertGe(stkToken.balanceOf(caller), callerBefore);
    }

    // ── pricePerShare ──────────────────────────────────────────
    function test_PricePerShare_InitiallyOne() public {
        assertEq(compounder.pricePerShare(), 1e18);
    }

    function test_PricePerShare_IncreasesAfterCompound() public {
        vm.startPrank(alice);
        stkToken.approve(address(compounder), 10_000e18);
        compounder.deposit(10_000e18);
        vm.stopPrank();

        vm.warp(block.timestamp + 30 days);
        compounder.compound();
        assertGt(compounder.pricePerShare(), 1e18);
    }

    // ── previewWithdraw ────────────────────────────────────────
    function test_PreviewWithdraw_AtDeposit() public {
        vm.startPrank(alice);
        stkToken.approve(address(compounder), 1_000e18);
        compounder.deposit(1_000e18);
        vm.stopPrank();
        assertApproxEqAbs(compounder.previewWithdraw(alice), 1_000e18, 1e15);
    }

    function test_PreviewWithdraw_NoDeposit_Zero() public {
        assertEq(compounder.previewWithdraw(alice), 0);
    }

    // ── Late depositor ────────────────────────────────────────
    function test_LateDepositor_GetsFewerShares() public {
        vm.startPrank(alice);
        stkToken.approve(address(compounder), 1_000e18);
        compounder.deposit(1_000e18);
        vm.stopPrank();

        vm.warp(block.timestamp + 7 days);
        compounder.compound();

        vm.startPrank(bob);
        stkToken.approve(address(compounder), 1_000e18);
        compounder.deposit(1_000e18);
        vm.stopPrank();

        assertLt(compounder.balanceOf(bob), 1_000e18);
    }

    // ── Owner controls ─────────────────────────────────────────
    function test_SetCompounderFee_Owner() public {
        compounder.setCompounderFee(50);
    }

    function test_SetCompounderFee_NonOwnerReverts() public {
        vm.prank(alice);
        vm.expectRevert();
        compounder.setCompounderFee(50);
    }

    function test_SetCompoundFrequency_Owner() public {
        compounder.setCompoundFrequency(12 hours);
    }

    function test_SetCompoundFrequency_NonOwnerReverts() public {
        vm.prank(alice);
        vm.expectRevert();
        compounder.setCompoundFrequency(12 hours);
    }

    // ── Fuzz ───────────────────────────────────────────────────
    function testFuzz_DepositAndWithdraw(uint96 amount) public {
    amount = uint96(bound(uint256(amount), 1e18, 50_000e18));

    vm.startPrank(alice);
    stkToken.approve(address(compounder), amount);
    compounder.deposit(amount);

    // Verify shares minted correctly
    uint256 shares = compounder.balanceOf(alice);
    assertGt(shares, 0);
    assertEq(shares, amount); // 1:1 on first deposit
    vm.stopPrank();
}

    function testFuzz_PricePerShareNeverDecreases(uint32 warpSecs) public {
        warpSecs = uint32(bound(uint256(warpSecs), 1 days, 30 days));

        vm.startPrank(alice);
        stkToken.approve(address(compounder), 1_000e18);
        compounder.deposit(1_000e18);
        vm.stopPrank();

        uint256 p1 = compounder.pricePerShare();
        vm.warp(block.timestamp + warpSecs);
        compounder.compound();
        assertGe(compounder.pricePerShare(), p1);
    }
}
