// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/YieldForgeGovernor.sol";
import "../src/VeSTK.sol";
import "@openzeppelin/contracts/governance/TimelockController.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockSTK4 is ERC20 {
    constructor() ERC20("STK","STK") { _mint(msg.sender, 1_000_000_000e18); }
}

contract GovernorTest is Test {
    YieldForgeGovernor public governor;
    VeSTK              public veStk;
    TimelockController public timelock;
    MockSTK4           public stkToken;

    address owner   = address(this);
    address alice   = makeAddr("alice");
    address bob     = makeAddr("bob");
    address charlie = makeAddr("charlie");

    function setUp() public {
        stkToken = new MockSTK4();
        veStk    = new VeSTK(address(stkToken), owner);

        address[] memory proposers = new address[](1);
        address[] memory executors = new address[](1);
        proposers[0] = address(0);
        executors[0] = address(0);
        timelock = new TimelockController(2 days, proposers, executors, owner);

        governor = new YieldForgeGovernor(veStk, timelock);

        timelock.grantRole(timelock.PROPOSER_ROLE(), address(governor));
        timelock.grantRole(timelock.EXECUTOR_ROLE(), address(0));

        // Distribute STK
        stkToken.transfer(alice,   1_000_000e18);
        stkToken.transfer(bob,       500_000e18);
        stkToken.transfer(charlie,   200_000e18);

        uint256 LOCK = 4 * 365 days;

        vm.startPrank(alice);
        stkToken.approve(address(veStk), 1_000_000e18);
        veStk.lock(1_000_000e18, LOCK);
        vm.stopPrank();

        vm.startPrank(bob);
        stkToken.approve(address(veStk), 500_000e18);
        veStk.lock(500_000e18, LOCK);
        vm.stopPrank();

        vm.startPrank(charlie);
        stkToken.approve(address(veStk), 200_000e18);
        veStk.lock(200_000e18, LOCK);
        vm.stopPrank();

        vm.prank(alice);   veStk.delegate(alice);
        vm.prank(bob);     veStk.delegate(bob);
        vm.prank(charlie); veStk.delegate(charlie);
        vm.roll(block.number + 1);
    }

    function _propose(address proposer) internal returns (uint256 id) {
        address[] memory targets   = new address[](1);
        uint256[] memory values    = new uint256[](1);
        bytes[]   memory calldatas = new bytes[](1);
        targets[0]   = address(governor);
        calldatas[0] = "";
        vm.prank(proposer);
        id = governor.propose(targets, values, calldatas, "Test proposal");
    }

    function _advanceToVoting() internal {
        // Advance past voting delay
        vm.roll(block.number + governor.votingDelay() + 1);
        vm.warp(block.timestamp + 1 days + 1);
    }

    // ── Proposal creation ──────────────────────────────────────
    function test_Propose_WithEnoughVotingPower() public {
        uint256 id = _propose(alice);
        assertGt(id, 0);
    }

    function test_Propose_BelowThresholdReverts() public {
        address poor = makeAddr("poor");
        address[] memory targets   = new address[](1);
        uint256[] memory values    = new uint256[](1);
        bytes[]   memory calldatas = new bytes[](1);
        targets[0]   = address(governor);
        calldatas[0] = "";
        vm.prank(poor);
        vm.expectRevert();
        governor.propose(targets, values, calldatas, "Should fail");
    }

    function test_Propose_StateIsPending() public {
        uint256 id = _propose(alice);
        assertEq(uint8(governor.state(id)), uint8(IGovernor.ProposalState.Pending));
    }

    // ── Voting ────────────────────────────────────────────────
    function test_CastVote_For() public {
        uint256 id = _propose(alice);
        _advanceToVoting();
        vm.prank(alice);
        governor.castVote(id, 1);
        (, uint256 forVotes,) = governor.proposalVotes(id);
        assertGt(forVotes, 0);
    }

    function test_CastVote_Against() public {
        uint256 id = _propose(alice);
        _advanceToVoting();
        vm.prank(bob);
        governor.castVote(id, 0);
        (uint256 against,,) = governor.proposalVotes(id);
        assertGt(against, 0);
    }

    function test_CastVote_Abstain() public {
        uint256 id = _propose(alice);
        _advanceToVoting();
        vm.prank(charlie);
        governor.castVote(id, 2);
        (,, uint256 abstain) = governor.proposalVotes(id);
        assertGt(abstain, 0);
    }

    function test_CastVote_TwiceReverts() public {
        uint256 id = _propose(alice);
        _advanceToVoting();
        vm.startPrank(alice);
        governor.castVote(id, 1);
        vm.expectRevert();
        governor.castVote(id, 1);
        vm.stopPrank();
    }

    function test_CastVote_BeforeDelayReverts() public {
        uint256 id = _propose(alice);
        // Don't advance — voting not open yet
        vm.prank(alice);
        vm.expectRevert();
        governor.castVote(id, 1);
    }

    // ── State transitions ──────────────────────────────────────
    function test_State_ActiveAfterDelay() public {
        uint256 id = _propose(alice);
        _advanceToVoting();
        assertEq(uint8(governor.state(id)), uint8(IGovernor.ProposalState.Active));
    }

    function test_State_DefeatedWithNoVotes() public {
        uint256 id = _propose(alice);
        vm.roll(block.number + governor.votingDelay() + governor.votingPeriod() + 1);
        vm.warp(block.timestamp + 9 days);
        assertEq(uint8(governor.state(id)), uint8(IGovernor.ProposalState.Defeated));
    }

    // ── Parameters ────────────────────────────────────────────
    function test_VotingDelay_NonZero()       public { assertGt(governor.votingDelay(), 0); }
    function test_VotingPeriod_NonZero()      public { assertGt(governor.votingPeriod(), 0); }
    function test_ProposalThreshold_100VeSTK() public { assertEq(governor.proposalThreshold(), 100e18); }

    function test_Quorum_NonZero() public {
        uint256 q = governor.quorum(block.number - 1);
        assertGt(q, 0);
    }

    // ── hasVoted ──────────────────────────────────────────────
    function test_HasVoted_FalseBeforeVote() public {
        uint256 id = _propose(alice);
        assertFalse(governor.hasVoted(id, alice));
    }

    function test_HasVoted_TrueAfterVote() public {
        uint256 id = _propose(alice);
        _advanceToVoting();
        vm.prank(alice);
        governor.castVote(id, 1);
        assertTrue(governor.hasVoted(id, alice));
    }

    // ── Fuzz ──────────────────────────────────────────────────
    function testFuzz_VoteSupport(uint8 support) public {
        support = uint8(bound(uint256(support), 0, 2));
        uint256 id = _propose(alice);
        _advanceToVoting();
        vm.prank(alice);
        governor.castVote(id, support);
        assertTrue(governor.hasVoted(id, alice));
    }
}
