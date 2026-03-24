// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/RewardVault.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockRWD2 is ERC20 {
    constructor() ERC20("RWD","RWD") { _mint(msg.sender, 1_000_000_000e18); }
    function mint(address to, uint256 amt) external { _mint(to, amt); }
}

contract MockOtherToken is ERC20 {
    constructor() ERC20("OTHER","OTHER") { _mint(msg.sender, 1_000_000e18); }
}

contract RewardVaultTest is Test {
    RewardVault    public vault;
    MockRWD2       public rwdToken;
    MockOtherToken public otherToken;

    address owner   = address(this);
    address staking = makeAddr("staking");
    address alice   = makeAddr("alice");

    function setUp() public {
        rwdToken   = new MockRWD2();
        otherToken = new MockOtherToken();
        vault      = new RewardVault(address(rwdToken), owner);
    }

    // ── receiveRevenue ────────────────────────────────────────
    function test_ReceiveRevenue_UpdatesBalance() public {
        rwdToken.approve(address(vault), 1_000e18);
        vault.receiveRevenue(1_000e18);
        assertEq(vault.balance(), 1_000e18);
    }

    function test_ReceiveRevenue_Multiple() public {
        rwdToken.approve(address(vault), 3_000e18);
        vault.receiveRevenue(1_000e18);
        vault.receiveRevenue(2_000e18);
        assertEq(vault.balance(), 3_000e18);
    }

    // ── distribute ────────────────────────────────────────────
    function test_Distribute_SendsToStaking() public {
        rwdToken.approve(address(vault), 1_000e18);
        vault.receiveRevenue(1_000e18);
        uint256 stakingBefore = rwdToken.balanceOf(staking);
        vault.distribute(staking);
        assertGt(rwdToken.balanceOf(staking), stakingBefore);
    }

    function test_Distribute_ClearsBalance() public {
        rwdToken.approve(address(vault), 1_000e18);
        vault.receiveRevenue(1_000e18);
        vault.distribute(staking);
        assertEq(vault.balance(), 0);
    }

    function test_Distribute_EmptyReverts() public {
        vm.expectRevert();
        vault.distribute(staking);
    }

    function test_Distribute_OnlyOwner() public {
        rwdToken.approve(address(vault), 1_000e18);
        vault.receiveRevenue(1_000e18);
        vm.prank(alice);
        vm.expectRevert();
        vault.distribute(staking);
    }

    // ── fundStaking ───────────────────────────────────────────
    function test_FundStaking_SendsDirectly() public {
        rwdToken.approve(address(vault), 5_000e18);
        vault.receiveRevenue(5_000e18);
        uint256 before = rwdToken.balanceOf(staking);
        vault.fundStaking(staking, 1_000e18);
        assertGt(rwdToken.balanceOf(staking), before);
    }

    function test_FundStaking_OnlyOwner() public {
        rwdToken.approve(address(vault), 1_000e18);
        vault.receiveRevenue(1_000e18);
        vm.prank(alice);
        vm.expectRevert();
        vault.fundStaking(staking, 100e18);
    }

    // ── setAllocation ─────────────────────────────────────────
    function test_SetAllocation_Owner() public {
        vault.setAllocation(6000, 3000, 1000);
    }

    function test_SetAllocation_NonOwnerReverts() public {
        vm.prank(alice);
        vm.expectRevert();
        vault.setAllocation(6000, 3000, 1000);
    }

    // ── recoverERC20 — only NON-reward tokens ─────────────────
    function test_RecoverERC20_OtherToken() public {
        // Send a DIFFERENT token to vault and recover it
        otherToken.transfer(address(vault), 500e18);
        uint256 before = otherToken.balanceOf(owner);
        vault.recoverERC20(address(otherToken), 500e18);
        assertGt(otherToken.balanceOf(owner), before);
    }

    function test_RecoverERC20_RewardTokenReverts() public {
        // Cannot recover the reward token itself
        rwdToken.transfer(address(vault), 500e18);
        vm.expectRevert();
        vault.recoverERC20(address(rwdToken), 500e18);
    }

    function test_RecoverERC20_NonOwnerReverts() public {
        otherToken.transfer(address(vault), 500e18);
        vm.prank(alice);
        vm.expectRevert();
        vault.recoverERC20(address(otherToken), 500e18);
    }

    // ── balance + stats ───────────────────────────────────────
    function test_Balance_InitiallyZero() public {
        assertEq(vault.balance(), 0);
    }

    function test_Stats_NoRevert() public {
        rwdToken.approve(address(vault), 1_000e18);
        vault.receiveRevenue(1_000e18);
        vault.stats();
    }

    // ── Fuzz ──────────────────────────────────────────────────
    function testFuzz_ReceiveAndDistribute(uint96 amount) public {
        amount = uint96(bound(uint256(amount), 1e18, 100_000e18));
        rwdToken.approve(address(vault), amount);
        vault.receiveRevenue(amount);
        assertEq(vault.balance(), amount);
        vault.distribute(staking);
        assertEq(vault.balance(), 0);
    }

    function testFuzz_FundStaking(uint96 amount) public {
        amount = uint96(bound(uint256(amount), 1e18, 10_000e18));
        rwdToken.approve(address(vault), amount);
        vault.receiveRevenue(amount);
        uint256 before = rwdToken.balanceOf(staking);
        vault.fundStaking(staking, amount);
        assertGt(rwdToken.balanceOf(staking), before);
    }
}
