// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/YieldForgeNFT.sol";
import "../src/PriceOracle.sol";
import "../src/VeSTK.sol";
import "../src/StakingToken.sol";
import "../src/RewardToken.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockSTK2 is ERC20 {
    constructor() ERC20("STK", "STK") {
        _mint(msg.sender, 1_000_000_000e18);
    }
}

// ═══════════════════════════════════════════════════════════════
//  YieldForgeNFT Tests
// ═══════════════════════════════════════════════════════════════
contract NFTTest is Test, ERC721Holder {
    receive() external payable {}
    YieldForgeNFT public nft;
    address owner = address(this);
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    function setUp() public {
        nft = new YieldForgeNFT(owner);
        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
        vm.deal(owner, 10 ether);
    }

    function test_MintCommon_Success() public {
        uint256 _p = nft.commonPrice();
        vm.deal(alice, _p);
        vm.prank(alice);
        nft.mintCommon{value: _p}();
        assertTrue(nft.hasBoost(alice));
    }

    function test_MintCommon_WrongPriceReverts() public {
        vm.prank(alice);
        vm.expectRevert();
        nft.mintCommon{value: 0.00001 ether}();
    }

    function test_MintCommon_BoostIs1000Bps() public {
        uint256 _p = nft.commonPrice();
        vm.deal(alice, _p);
        vm.prank(alice);
        nft.mintCommon{value: _p}();
        assertEq(nft.getBoostBps(alice), 1000);
    }

    function test_MintRare_Success() public {
        uint256 price = nft.rarePrice();
        vm.deal(alice, price);
        vm.prank(alice);
        nft.mintRare{value: price}();
        assertEq(nft.getBoostBps(alice), 2000);
    }

    function test_MintRare_WrongPriceReverts() public {
        vm.prank(alice);
        vm.expectRevert();
        nft.mintRare{value: 0.0001 ether}();
    }

    function test_MintEpic_Success() public {
    uint256 _p = nft.epicPrice();
    vm.deal(alice, _p);
    vm.prank(alice);
    nft.mintEpic{value: _p}();
    assertEq(nft.getBoostBps(alice), 3500);
}

    function test_MintEpic_WrongPriceReverts() public {
        vm.prank(alice);
        vm.expectRevert();
        nft.mintEpic{value: 0.001 ether}();
    }

    function test_MintLegendary_OwnerOnly() public {
        // owner mints to alice — owner IS a contract (test), alice is EOA
        nft.mintLegendary(alice);
        assertEq(nft.getBoostBps(alice), 5000);
    }

    function test_MintLegendary_NonOwnerReverts() public {
        vm.prank(alice);
        vm.expectRevert();
        nft.mintLegendary(bob);
    }

    function test_TransferFrom_Reverts() public {
        uint256 price = nft.commonPrice();
        vm.deal(alice, price);
        vm.prank(alice);
        nft.mintCommon{value: price}();
        vm.prank(alice);
        vm.expectRevert();
        nft.transferFrom(alice, bob, 1);
    }

    function test_SafeTransferFrom_Reverts() public {
        uint256 _p = nft.commonPrice();
        vm.deal(alice, _p);
        vm.prank(alice);
        nft.mintCommon{value: _p}();
        vm.prank(alice);
        vm.expectRevert();
        nft.safeTransferFrom(alice, bob, 1);
    }

    function test_HighestBoostApplied() public {
        vm.startPrank(alice);
        vm.deal(alice, 1 ether);
        nft.mintCommon{value: nft.commonPrice()}();
        assertEq(nft.getBoostBps(alice), 1000);
        nft.mintRare{value: nft.rarePrice()}();
        assertEq(nft.getBoostBps(alice), 2000);
        vm.stopPrank();
    }

    function test_GetUserNFTs_Empty() public {
        assertEq(nft.getUserNFTs(alice).length, 0);
    }

    function test_GetUserNFTs_AfterMint() public {
        uint256 _p = nft.commonPrice();
        vm.deal(alice, _p);
        vm.prank(alice);
        nft.mintCommon{value: _p}();
        assertEq(nft.getUserNFTs(alice).length, 1);
    }

    function test_HasBoost_FalseBeforeMint() public {
        assertFalse(nft.hasBoost(alice));
    }

    function test_HasBoost_TrueAfterMint() public {
        uint256 _p = nft.commonPrice();
        vm.deal(alice, _p);
        vm.prank(alice);
        nft.mintCommon{value: _p}();
        assertTrue(nft.hasBoost(alice));
    }

    function test_GetBoostBps_NoNFT_IsZero() public {
        assertEq(nft.getBoostBps(alice), 0);
    }

    function test_SetPrices_Owner() public {
        nft.setPrices(0.002 ether, 0.01 ether, 0.05 ether);
        assertEq(nft.commonPrice(), 0.002 ether);
    }

    function test_SetPrices_NonOwnerReverts() public {
        vm.prank(alice);
        vm.expectRevert();
        nft.setPrices(0.002 ether, 0.01 ether, 0.05 ether);
    }

    function test_SetBaseURI_Owner() public {
        nft.setBaseURI("https://api.yieldforge.io/nft/");
    }

    function test_SetBaseURI_NonOwnerReverts() public {
        vm.prank(alice);
        vm.expectRevert();
        nft.setBaseURI("https://evil.com/");
    }

    function test_Withdraw_Owner() public {
        uint256 price = nft.commonPrice();
        vm.deal(alice, price);
        vm.prank(alice);
        nft.mintCommon{value: price}();
        uint256 before = address(this).balance;
        nft.withdraw();
        assertGt(address(this).balance, before);
    }

    function test_Withdraw_NonOwnerReverts() public {
        vm.prank(alice);
        vm.expectRevert();
        nft.withdraw();
    }

    function testFuzz_MintCommon_ExactPrice() public {
        uint256 price = nft.commonPrice();
        hoax(alice, price);
        nft.mintCommon{value: price}();
        assertTrue(nft.hasBoost(alice));
    }
}

// ═══════════════════════════════════════════════════════════════
//  PriceOracle Tests
// ═══════════════════════════════════════════════════════════════
contract PriceOracleTest is Test {
    PriceOracle public oracle;
    address owner = address(this);
    address alice = makeAddr("alice");

    function setUp() public {
        oracle = new PriceOracle(address(0), owner);
    }

    function test_GetStkPrice_Positive() public {
        (int256 price, uint8 dec) = oracle.getStkPrice();
        assertGt(price, 0);
        assertEq(dec, 8);
    }

    function test_GetRwdPrice_Positive() public {
        (int256 price, uint8 dec) = oracle.getRwdPrice();
        assertGt(price, 0);
        assertEq(dec, 8);
    }

    function test_GetEthPrice_NoRevert() public {
        oracle.getEthPrice(); // just confirm no revert
    }

    function test_SetMockStkPrice_Owner() public {
        oracle.setMockStkPrice(5_000_000);
        (int256 price, ) = oracle.getStkPrice();
        assertEq(price, 5_000_000);
    }

    function test_SetMockStkPrice_NonOwnerReverts() public {
        vm.prank(alice);
        vm.expectRevert();
        oracle.setMockStkPrice(5_000_000);
    }

    function test_SetMockRwdPrice_Owner() public {
        oracle.setMockRwdPrice(1_000_000);
        (int256 price, ) = oracle.getRwdPrice();
        assertEq(price, 1_000_000);
    }

    function test_SetMockRwdPrice_NonOwnerReverts() public {
        vm.prank(alice);
        vm.expectRevert();
        oracle.setMockRwdPrice(1_000_000);
    }

    function test_ToUSD_STK() public {
        assertGt(oracle.toUSD(100e18, true), 0);
    }

    function test_ToUSD_RWD() public {
        assertGt(oracle.toUSD(100e18, false), 0);
    }

    function test_SetFeeds_Owner() public {
        oracle.setFeeds(address(0), address(0), address(0));
    }

    function test_SetFeeds_NonOwnerReverts() public {
        vm.prank(alice);
        vm.expectRevert();
        oracle.setFeeds(address(0), address(0), address(0));
    }

    function testFuzz_MockStkPrice(uint256 raw) public {
        int256 price = int256(bound(raw, 1, 1_000_000_000));
        oracle.setMockStkPrice(price);
        (int256 p, ) = oracle.getStkPrice();
        assertEq(p, price);
    }
}

// ═══════════════════════════════════════════════════════════════
//  VeSTK Tests
// ═══════════════════════════════════════════════════════════════
contract VeSTKAdditionalTest is Test {
    VeSTK public veStk;
    MockSTK2 public stkToken;
    address owner = address(this);
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    function setUp() public {
        stkToken = new MockSTK2();
        veStk = new VeSTK(address(stkToken), owner);
        stkToken.transfer(alice, 1_000_000e18);
        stkToken.transfer(bob, 1_000_000e18);
    }

    function test_Lock_MaxDurationGivesFullPower() public {
        vm.startPrank(alice);
        stkToken.approve(address(veStk), 1_000e18);
        veStk.lock(1_000e18, 4 * 365 days);
        vm.stopPrank();
        assertApproxEqRel(veStk.balanceOf(alice), 1_000e18, 0.01e18);
    }

    function test_Lock_ShortDurationLessVe() public {
        vm.startPrank(alice);
        stkToken.approve(address(veStk), 1_000e18);
        veStk.lock(1_000e18, 7 days);
        vm.stopPrank();
        assertLt(veStk.balanceOf(alice), 1_000e18);
        assertGt(veStk.balanceOf(alice), 0);
    }

    function test_Lock_CannotLockTwice() public {
        vm.startPrank(alice);
        stkToken.approve(address(veStk), 2_000e18);
        veStk.lock(1_000e18, 30 days);
        vm.expectRevert();
        veStk.lock(1_000e18, 30 days);
        vm.stopPrank();
    }

    function test_IncreaseLock_AddsVePower() public {
        vm.startPrank(alice);
        stkToken.approve(address(veStk), 2_000e18);
        veStk.lock(1_000e18, 30 days);
        uint256 before = veStk.balanceOf(alice);
        veStk.increaseLock(1_000e18);
        vm.stopPrank();
        assertGt(veStk.balanceOf(alice), before);
    }

    function test_ExtendLock_IncreasesVePower() public {
        vm.startPrank(alice);
        stkToken.approve(address(veStk), 1_000e18);
        veStk.lock(1_000e18, 30 days);
        uint256 before = veStk.balanceOf(alice);
        veStk.extendLock(60 days);
        vm.stopPrank();
        assertGt(veStk.balanceOf(alice), before);
    }

    function test_Unlock_ReturnsSTK() public {
        vm.startPrank(alice);
        stkToken.approve(address(veStk), 1_000e18);
        veStk.lock(1_000e18, 30 days);
        vm.warp(block.timestamp + 30 days + 1);
        uint256 stkBefore = stkToken.balanceOf(alice);
        veStk.unlock();
        vm.stopPrank();
        assertGt(stkToken.balanceOf(alice), stkBefore);
        assertEq(veStk.balanceOf(alice), 0);
    }

    function test_Unlock_BeforeExpiryReverts() public {
        vm.startPrank(alice);
        stkToken.approve(address(veStk), 1_000e18);
        veStk.lock(1_000e18, 30 days);
        vm.expectRevert();
        veStk.unlock();
        vm.stopPrank();
    }

    function test_TimeUntilUnlock_Decreases() public {
        vm.startPrank(alice);
        stkToken.approve(address(veStk), 1_000e18);
        veStk.lock(1_000e18, 30 days);
        vm.stopPrank();
        uint256 t1 = veStk.timeUntilUnlock(alice);
        vm.warp(block.timestamp + 1 days);
        uint256 t2 = veStk.timeUntilUnlock(alice);
        assertGt(t1, t2);
    }

    function test_VeSTK_NonTransferable() public {
        vm.startPrank(alice);
        stkToken.approve(address(veStk), 1_000e18);
        veStk.lock(1_000e18, 30 days);
        vm.expectRevert();
        veStk.transfer(bob, 100e18);
        vm.stopPrank();
    }

    function testFuzz_LockDuration(uint32 duration) public {
        duration = uint32(bound(uint256(duration), 7 days, 4 * 365 days));
        vm.startPrank(alice);
        stkToken.approve(address(veStk), 1_000e18);
        veStk.lock(1_000e18, duration);
        vm.stopPrank();
        assertGt(veStk.balanceOf(alice), 0);
    }
}

// ═══════════════════════════════════════════════════════════════
//  Token Tests
// ═══════════════════════════════════════════════════════════════
contract TokenTests is Test {
    StakingToken public stkToken;
    RewardToken public rwdToken;
    address owner = address(this);
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    function setUp() public {
        stkToken = new StakingToken(
            "YieldForge Staking Token",
            "STK",
            18,
            1_000_000e18,
            owner
        );
        rwdToken = new RewardToken(
            "YieldForge Reward Token",
            "RWD",
            18,
            1_000_000e18,
            owner
        );
    }

    function test_STK_OwnerCanMint() public {
        stkToken.mint(alice, 1_000e18);
        assertEq(stkToken.balanceOf(alice), 1_000e18);
    }

    function test_STK_NonOwnerMintReverts() public {
        vm.prank(alice);
        vm.expectRevert();
        stkToken.mint(bob, 1_000e18);
    }

    function test_STK_Transfer() public {
        stkToken.mint(alice, 1_000e18);
        vm.prank(alice);
        stkToken.transfer(bob, 500e18);
        assertEq(stkToken.balanceOf(bob), 500e18);
    }

    function test_STK_ApproveAndTransferFrom() public {
        stkToken.mint(alice, 1_000e18);
        vm.prank(alice);
        stkToken.approve(bob, 500e18);
        vm.prank(bob);
        stkToken.transferFrom(alice, bob, 500e18);
        assertEq(stkToken.balanceOf(bob), 500e18);
    }

    function test_STK_Decimals18() public {
        assertEq(stkToken.decimals(), 18);
    }
    function test_STK_Name() public {
        assertEq(stkToken.name(), "YieldForge Staking Token");
    }
    function test_STK_Symbol() public {
        assertEq(stkToken.symbol(), "STK");
    }

    function test_RWD_OwnerCanMint() public {
        rwdToken.mint(alice, 1_000e18);
        assertEq(rwdToken.balanceOf(alice), 1_000e18);
    }

    function test_RWD_NonOwnerMintReverts() public {
        vm.prank(alice);
        vm.expectRevert();
        rwdToken.mint(bob, 1_000e18);
    }

    function test_RWD_Decimals18() public {
        assertEq(rwdToken.decimals(), 18);
    }
    function test_RWD_Name() public {
        assertEq(rwdToken.name(), "YieldForge Reward Token");
    }

    function test_RWD_Transfer() public {
        rwdToken.mint(alice, 1_000e18);
        vm.prank(alice);
        rwdToken.transfer(bob, 500e18);
        assertEq(rwdToken.balanceOf(bob), 500e18);
    }

    function testFuzz_STK_MintTransfer(uint96 amount) public {
        amount = uint96(bound(uint256(amount), 1, 1_000_000e18));
        stkToken.mint(alice, amount);
        vm.prank(alice);
        stkToken.transfer(bob, amount);
        assertEq(stkToken.balanceOf(bob), amount);
    }

    function testFuzz_RWD_MintTransfer(uint96 amount) public {
        amount = uint96(bound(uint256(amount), 1, 1_000_000e18));
        rwdToken.mint(alice, amount);
        vm.prank(alice);
        rwdToken.transfer(bob, amount);
        assertEq(rwdToken.balanceOf(bob), amount);
    }
}
