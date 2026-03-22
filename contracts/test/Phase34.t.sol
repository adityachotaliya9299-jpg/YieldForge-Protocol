// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/VeSTK.sol";
import "../src/YieldForgeNFT.sol";
import "../src/PriceOracle.sol";
import "@openzeppelin/contracts/governance/TimelockController.sol";
import "../src/YieldForgeGovernor.sol";

// Minimal ERC20 for testing
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
contract MockSTK is ERC20 {
    constructor() ERC20("MockSTK","STK") { _mint(msg.sender, 1_000_000e18); }
    function mint(address to, uint256 amt) external { _mint(to, amt); }
}

contract Phase34Test is Test {

    MockSTK          public stkToken;
    VeSTK            public veSTK;
    YieldForgeNFT    public nft;
    PriceOracle      public oracle;
    TimelockController public timelock;
    YieldForgeGovernor public governor;

    address owner   = address(this);
    address alice   = makeAddr("alice");
    address bob     = makeAddr("bob");
    address charlie = makeAddr("charlie");

    function setUp() public {
        stkToken = new MockSTK();

        // VeSTK
        veSTK = new VeSTK(address(stkToken), owner);

        // NFT
        nft = new YieldForgeNFT(owner);

        // PriceOracle
        oracle = new PriceOracle(address(0), owner);

        // Timelock
        address[] memory proposers = new address[](1);
        address[] memory executors = new address[](1);
        proposers[0] = address(0); // will be set to governor
        executors[0] = address(0); // anyone can execute
        timelock = new TimelockController(2 days, proposers, executors, owner);

        // Governor
        governor = new YieldForgeGovernor(IVotes(address(veSTK)), timelock);

        // Grant governor proposer role on timelock
        timelock.grantRole(timelock.PROPOSER_ROLE(), address(governor));
        timelock.grantRole(timelock.CANCELLER_ROLE(), address(governor));

        // Give tokens to users
        stkToken.transfer(alice,   100_000e18);
        stkToken.transfer(bob,     50_000e18);
        stkToken.transfer(charlie, 10_000e18);
    }

    // ─────────────────────────────────────────────
    //  VeSTK Tests
    // ─────────────────────────────────────────────

    function test_VeSTK_Lock1Year() public {
        vm.startPrank(alice);
        stkToken.approve(address(veSTK), 1_000e18);
        veSTK.lock(1_000e18, 365 days);
        vm.stopPrank();

        // 1 year lock on max 4 year = 0.25 veSTK per STK
        uint256 veBalance = veSTK.balanceOf(alice);
        assertApproxEqAbs(veBalance, 250e18, 1e15, "1yr lock = 0.25x veSTK");
    }

    function test_VeSTK_Lock4Years_MaxPower() public {
        vm.startPrank(alice);
        stkToken.approve(address(veSTK), 1_000e18);
        veSTK.lock(1_000e18, 4 * 365 days);
        vm.stopPrank();

        // 4yr lock = 1:1 veSTK
        uint256 veBalance = veSTK.balanceOf(alice);
        assertApproxEqAbs(veBalance, 1_000e18, 1e15, "4yr lock = 1:1 veSTK");
    }

    function test_VeSTK_LockTooShort_Reverts() public {
        vm.startPrank(alice);
        stkToken.approve(address(veSTK), 1_000e18);
        vm.expectRevert("Lock too short");
        veSTK.lock(1_000e18, 3 days);
        vm.stopPrank();
    }

    function test_VeSTK_LockTooLong_Reverts() public {
        vm.startPrank(alice);
        stkToken.approve(address(veSTK), 1_000e18);
        vm.expectRevert("Lock too long");
        veSTK.lock(1_000e18, 5 * 365 days);
        vm.stopPrank();
    }

    function test_VeSTK_NonTransferable() public {
        vm.startPrank(alice);
        stkToken.approve(address(veSTK), 1_000e18);
        veSTK.lock(1_000e18, 365 days);

        vm.expectRevert("veSTK: non-transferable");
        veSTK.transfer(bob, 1e18);
        vm.stopPrank();
    }

    function test_VeSTK_Unlock_AfterExpiry() public {
        vm.startPrank(alice);
        stkToken.approve(address(veSTK), 1_000e18);
        veSTK.lock(1_000e18, 7 days);

        vm.warp(block.timestamp + 7 days + 1);

        uint256 stkBefore = stkToken.balanceOf(alice);
        veSTK.unlock();
        uint256 stkAfter  = stkToken.balanceOf(alice);

        assertEq(stkAfter - stkBefore, 1_000e18, "Should recover STK");
        assertEq(veSTK.balanceOf(alice), 0, "veSTK should be 0 after unlock");
        vm.stopPrank();
    }

    function test_VeSTK_Unlock_BeforeExpiry_Reverts() public {
        vm.startPrank(alice);
        stkToken.approve(address(veSTK), 1_000e18);
        veSTK.lock(1_000e18, 30 days);

        vm.warp(block.timestamp + 15 days);
        vm.expectRevert("Still locked");
        veSTK.unlock();
        vm.stopPrank();
    }

    function test_VeSTK_IncreaseLock() public {
        vm.startPrank(alice);
        stkToken.approve(address(veSTK), 2_000e18);
        veSTK.lock(1_000e18, 365 days);

        uint256 veBefore = veSTK.balanceOf(alice);
        veSTK.increaseLock(1_000e18);
        uint256 veAfter  = veSTK.balanceOf(alice);

        assertGt(veAfter, veBefore, "More veSTK after increase");
        vm.stopPrank();
    }

    function test_VeSTK_ExtendLock() public {
        vm.startPrank(alice);
        stkToken.approve(address(veSTK), 1_000e18);
        veSTK.lock(1_000e18, 365 days);

        uint256 veBefore = veSTK.balanceOf(alice);
        veSTK.extendLock(365 days); // add another year
        uint256 veAfter  = veSTK.balanceOf(alice);

        assertGt(veAfter, veBefore, "More veSTK after extension");
        vm.stopPrank();
    }

    // ─────────────────────────────────────────────
    //  NFT Tests
    // ─────────────────────────────────────────────

    function test_NFT_MintCommon() public {
        vm.deal(alice, 1 ether);
        vm.startPrank(alice);
        nft.mintCommon{value: 0.001 ether}();
        vm.stopPrank();

        assertEq(nft.balanceOf(alice), 1);
        assertEq(nft.getBoostBps(alice), 1000); // 10% boost
    }

    function test_NFT_MintRare() public {
        vm.deal(alice, 1 ether);
        vm.startPrank(alice);
        nft.mintRare{value: 0.005 ether}();
        vm.stopPrank();

        assertEq(nft.getBoostBps(alice), 2000); // 20% boost
    }

    function test_NFT_MintEpic() public {
        vm.deal(alice, 1 ether);
        vm.startPrank(alice);
        nft.mintEpic{value: 0.02 ether}();
        vm.stopPrank();

        assertEq(nft.getBoostBps(alice), 3500); // 35% boost
    }

    function test_NFT_LegendaryOwnerOnly() public {
        nft.mintLegendary(alice);
        assertEq(nft.getBoostBps(alice), 5000); // 50% boost
    }

    function test_NFT_NonTransferable() public {
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        nft.mintCommon{value: 0.001 ether}();

        vm.prank(alice);
        vm.expectRevert("YieldForgeNFT: Soulbound - non-transferable");
        nft.transferFrom(alice, bob, 1);
    }

    function test_NFT_HighestBoostReturned() public {
        vm.deal(alice, 1 ether);
        vm.startPrank(alice);
        nft.mintCommon{value: 0.001 ether}(); // 10%
        nft.mintRare{value: 0.005 ether}();   // 20%
        vm.stopPrank();

        // Should return highest (20%)
        assertEq(nft.getBoostBps(alice), 2000);
    }

    function test_NFT_NoBoostIfNoNFT() public {
        assertEq(nft.getBoostBps(alice), 0);
        assertFalse(nft.hasBoost(alice));
    }

    function test_NFT_InsufficientETH_Reverts() public {
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        vm.expectRevert("Insufficient ETH");
        nft.mintCommon{value: 0.0001 ether}();
    }

    // ─────────────────────────────────────────────
    //  PriceOracle Tests
    // ─────────────────────────────────────────────

    function test_Oracle_MockStkPrice() public {
        (int256 price, uint8 dec) = oracle.getStkPrice();
        assertEq(price, 2_400_000); // $0.024
        assertEq(dec, 8);
    }

    function test_Oracle_MockRwdPrice() public {
        (int256 price, uint8 dec) = oracle.getRwdPrice();
        assertEq(price, 1_000_000); // $0.01
        assertEq(dec, 8);
    }

    function test_Oracle_ToUSD() public {
        // 1000 STK at $0.024 = $24
        uint256 usd = oracle.toUSD(1000e18, true);
        assertEq(usd, 24e18, "1000 STK = $24");
    }

    function test_Oracle_UpdateMockPrice() public {
        oracle.setMockStkPrice(5_000_000); // $0.05
        (int256 price,) = oracle.getStkPrice();
        assertEq(price, 5_000_000);
    }

    function test_Oracle_InvalidPrice_Reverts() public {
        vm.expectRevert("Invalid price");
        oracle.setMockStkPrice(0);
    }

    // ─────────────────────────────────────────────
    //  Governor Tests
    // ─────────────────────────────────────────────

    function test_Governor_Name() public {
        assertEq(governor.name(), "YieldForge Governor");
    }

    function test_Governor_VotingDelay() public {
        assertEq(governor.votingDelay(), 1 days);
    }

    function test_Governor_VotingPeriod() public {
        assertEq(governor.votingPeriod(), 7 days);
    }

    function test_Governor_QuorumFraction() public {
        assertEq(governor.quorumNumerator(), 4); // 4%
    }

    function test_Governor_ProposalThreshold() public {
        assertEq(governor.proposalThreshold(), 100e18);
    }

    // ─────────────────────────────────────────────
    //  Fuzz
    // ─────────────────────────────────────────────

    function testFuzz_VeSTK_LockAmount(uint96 amount, uint32 duration) public {
        vm.assume(amount >= 1e15 && amount <= 100_000e18); // min 0.001 STK to avoid dust
        vm.assume(duration >= 7 days && duration <= 4 * 365 days);
        // Ensure veAmount won't truncate to 0: amount * duration > MAX_LOCK
        vm.assume(uint256(amount) * uint256(duration) >= 126_144_000); // 4 years in seconds

        stkToken.transfer(alice, amount);

        vm.startPrank(alice);
        stkToken.approve(address(veSTK), amount);
        veSTK.lock(amount, duration);

        uint256 veBalance = veSTK.balanceOf(alice);
        assertGt(veBalance, 0, "Should have veSTK");
        assertLe(veBalance, amount, "veSTK <= STK locked");
        vm.stopPrank();
    }
}
