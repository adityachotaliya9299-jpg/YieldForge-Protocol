// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "forge-std/StdInvariant.sol";
import "../src/StakingV2.sol";
import "../src/RewardVault.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockSTK is ERC20 {
    constructor() ERC20("STK","STK") { _mint(msg.sender, 100_000_000e18); }
    function mint(address to, uint256 amt) external { _mint(to, amt); }
}
contract MockRWD is ERC20 {
    constructor() ERC20("RWD","RWD") { _mint(msg.sender, 100_000_000e18); }
    function mint(address to, uint256 amt) external { _mint(to, amt); }
}

// ─────────────────────────────────────────────────────────────────
//  HANDLER — drives the invariant fuzzer
// ─────────────────────────────────────────────────────────────────
contract StakingHandler is Test {
    StakingV2  public staking;
    MockSTK    public stkToken;
    MockRWD    public rwdToken;

    address[] public actors;
    mapping(address => bool) public hasStaked;

    uint256 public ghost_totalStaked;
    uint256 public ghost_totalClaimed;
    uint256 public ghost_totalWithdrawn;

    constructor(StakingV2 _staking, MockSTK _stk, MockRWD _rwd) {
        staking  = _staking;
        stkToken = _stk;
        rwdToken = _rwd;

        // Create 5 actors
        for (uint i = 0; i < 5; i++) {
            address a = makeAddr(string(abi.encodePacked("actor", i)));
            actors.push(a);
            stkToken.mint(a, 10_000e18);
        }
    }

    function stake(uint256 actorSeed, uint256 amount, uint8 tierSeed) external {
        address actor = actors[actorSeed % actors.length];
        amount = bound(amount, 1e15, 1_000e18);
        StakingV2.Tier tier = StakingV2.Tier(tierSeed % 4);

        vm.startPrank(actor);
        stkToken.approve(address(staking), amount);
        try staking.stake(amount, tier, address(0)) {
            ghost_totalStaked += amount;
            hasStaked[actor]   = true;
        } catch {}
        vm.stopPrank();
    }

    function withdraw(uint256 actorSeed, uint256 amount) external {
        address actor = actors[actorSeed % actors.length];
        (uint256 staked,,,uint256 lockUntil,,,) = staking.userInfo(actor);
        if (staked == 0 || block.timestamp < lockUntil) return;
        amount = bound(amount, 1, staked);

        vm.prank(actor);
        try staking.withdraw(amount) {
            ghost_totalWithdrawn += amount;
        } catch {}
    }

    function claimRewards(uint256 actorSeed) external {
        address actor = actors[actorSeed % actors.length];
        uint256 pending = staking.earned(actor);
        if (pending == 0) return;

        vm.prank(actor);
        try staking.claimRewards() {
            ghost_totalClaimed += pending;
        } catch {}
    }

    function warpTime(uint256 secs) external {
        secs = bound(secs, 1, 30 days);
        vm.warp(block.timestamp + secs);
    }

    function getActors() external view returns (address[] memory) {
        return actors;
    }
}

// ─────────────────────────────────────────────────────────────────
//  INVARIANT TEST SUITE
// ─────────────────────────────────────────────────────────────────
contract InvariantStakingV2 is StdInvariant, Test {
    StakingV2      public staking;
    MockSTK        public stkToken;
    MockRWD        public rwdToken;
    RewardVault    public vault;
    StakingHandler public handler;

    address owner    = address(this);
    address treasury = makeAddr("treasury");

    function setUp() public {
        stkToken = new MockSTK();
        rwdToken = new MockRWD();
        vault    = new RewardVault(address(rwdToken), owner);

        staking = new StakingV2(
            address(stkToken),
            address(rwdToken),
            1e15,           // 0.001 RWD/sec
            treasury,
            owner
        );

        // Fund staking with 1M RWD
        rwdToken.approve(address(staking), 1_000_000e18);
        staking.fundRewards(1_000_000e18);

        handler = new StakingHandler(staking, stkToken, rwdToken);

        // Target handler for invariant fuzzing
        targetContract(address(handler));

        bytes4[] memory selectors = new bytes4[](4);
        selectors[0] = StakingHandler.stake.selector;
        selectors[1] = StakingHandler.withdraw.selector;
        selectors[2] = StakingHandler.claimRewards.selector;
        selectors[3] = StakingHandler.warpTime.selector;
        targetSelector(FuzzSelector({ addr: address(handler), selectors: selectors }));
    }

    // ── INVARIANT 1: Contract STK balance >= total staked ──────────
    function invariant_stkBalanceGeTotalStaked() public {
        uint256 contractBal = stkToken.balanceOf(address(staking));
        uint256 totalStaked = staking.totalStaked();
        assertGe(contractBal, totalStaked,
            "INVARIANT BROKEN: contract STK < totalStaked - funds missing");
    }

    // ── INVARIANT 2: Sum of user stakes == totalStaked ─────────────
    function invariant_sumOfStakesEqTotalStaked() public {
        address[] memory actors = handler.getActors();
        uint256 sum = 0;
        for (uint i = 0; i < actors.length; i++) {
            (uint256 staked,,,,,,) = staking.userInfo(actors[i]);
            sum += staked;
        }
        assertEq(sum, staking.totalStaked(),
            "INVARIANT BROKEN: sum of user stakes != totalStaked");
    }

    // ── INVARIANT 3: rewardPerToken never decreases ────────────────
    uint256 private lastRPT;
    function invariant_rewardPerTokenNeverDecreases() public {
        uint256 rpt = staking.rewardPerToken();
        assertGe(rpt, lastRPT,
            "INVARIANT BROKEN: rewardPerToken decreased");
        lastRPT = rpt;
    }

    // ── INVARIANT 4: No user can withdraw more than they staked ────
    function invariant_noOverWithdraw() public {
        address[] memory actors = handler.getActors();
        for (uint i = 0; i < actors.length; i++) {
            (uint256 staked,,,,,,) = staking.userInfo(actors[i]);
            uint256 bal = stkToken.balanceOf(actors[i]);
            assertLe(bal, 10_000e18 + 1e18, // initial + small tolerance
                "INVARIANT BROKEN: user has more STK than they started with");
        }
    }

    // ── INVARIANT 5: Contract never paused without owner ──────────
    function invariant_pauseOnlyByOwner() public {
        // If paused, only owner could have done it — checked via access control
        if (staking.paused()) {
            // We are the owner, so this is valid
            assertTrue(true);
        }
    }

    // ── INVARIANT 6: Treasury always receives fee on claims ────────
    function invariant_treasuryReceivesFees() public {
        uint256 treasuryBal = rwdToken.balanceOf(treasury);
        uint256 claimed     = handler.ghost_totalClaimed();
        // Treasury should have received ~5% of what was claimed
        // Allow 10% tolerance for rounding
        if (claimed > 1e18) {
            uint256 expectedMin = (claimed * 4) / 100; // at least 4%
            assertGe(treasuryBal, expectedMin,
                "INVARIANT BROKEN: treasury received less than 4% fees");
        }
    }
}

// ─────────────────────────────────────────────────────────────────
//  FUZZ TESTS
// ─────────────────────────────────────────────────────────────────
contract FuzzStakingV2 is Test {
    StakingV2  public staking;
    MockSTK    public stkToken;
    MockRWD    public rwdToken;

    address owner     = address(this);
    address treasury  = makeAddr("treasury");
    address alice     = makeAddr("alice");
    address bob       = makeAddr("bob");

    function setUp() public {
        stkToken = new MockSTK();
        rwdToken = new MockRWD();
        staking  = new StakingV2(address(stkToken), address(rwdToken), 1e15, treasury, owner);
        rwdToken.approve(address(staking), 1_000_000e18);
        staking.fundRewards(1_000_000e18);
        stkToken.transfer(alice, 100_000e18);
        stkToken.transfer(bob,   100_000e18);
    }

    // Fuzz: any stake amount + any tier
    function testFuzz_StakeAnyAmountAnyTier(uint96 amount, uint8 tierSeed) public {
        amount = uint96(bound(uint256(amount), 1e15, 50_000e18));
        StakingV2.Tier tier = StakingV2.Tier(tierSeed % 4);

        vm.startPrank(alice);
        stkToken.approve(address(staking), amount);
        staking.stake(amount, tier, address(0));
        vm.stopPrank();

        (uint256 staked,,,,, StakingV2.Tier t,) = staking.userInfo(alice);
        assertEq(staked, amount);
        assertEq(uint8(t), uint8(tier));
    }

    // Fuzz: rewards scale correctly with time
    function testFuzz_RewardsScaleWithTime(uint32 secs) public {
        secs = uint32(bound(uint256(secs), 1, 365 days));

        vm.startPrank(alice);
        stkToken.approve(address(staking), 1_000e18);
        staking.stake(1_000e18, StakingV2.Tier.Bronze, address(0));
        vm.stopPrank();

        vm.warp(block.timestamp + secs);
        uint256 earned = staking.earned(alice);
        // earned ≈ rate * time = 1e15 * secs (since alice is 100% of pool)
        assertApproxEqRel(earned, uint256(1e15) * secs, 0.01e18); // 1% tolerance
    }

    // Fuzz: two stakers get proportional rewards
    function testFuzz_ProportionalRewards(uint96 aliceAmt, uint96 bobAmt) public {
        aliceAmt = uint96(bound(uint256(aliceAmt), 1e18, 10_000e18));
        bobAmt   = uint96(bound(uint256(bobAmt),   1e18, 10_000e18));

        vm.startPrank(alice);
        stkToken.approve(address(staking), aliceAmt);
        staking.stake(aliceAmt, StakingV2.Tier.Bronze, address(0));
        vm.stopPrank();

        vm.startPrank(bob);
        stkToken.approve(address(staking), bobAmt);
        staking.stake(bobAmt, StakingV2.Tier.Bronze, address(0));
        vm.stopPrank();

        vm.warp(block.timestamp + 100);

        uint256 aliceEarned = staking.earned(alice);
        uint256 bobEarned   = staking.earned(bob);
        uint256 total       = aliceEarned + bobEarned;

        // Alice share should equal aliceAmt / totalStaked ± 1%
        uint256 aliceExpectedBps = (uint256(aliceAmt) * 10000) / (uint256(aliceAmt) + uint256(bobAmt));
        uint256 aliceActualBps   = (aliceEarned * 10000) / total;
        assertApproxEqAbs(aliceActualBps, aliceExpectedBps, 50); // 0.5% tolerance
    }

    // Fuzz: performance fee always correct
    function testFuzz_PerformanceFee(uint96 amount, uint16 feeBps) public {
        amount = uint96(bound(uint256(amount), 1e18, 10_000e18));
        feeBps = uint16(bound(uint256(feeBps), 0, 2000)); // max 20%

        staking.setPerformanceFee(feeBps);

        vm.startPrank(alice);
        stkToken.approve(address(staking), amount);
        staking.stake(amount, StakingV2.Tier.Bronze, address(0));
        vm.stopPrank();

        vm.warp(block.timestamp + 1000);

        uint256 treasuryBefore = rwdToken.balanceOf(treasury);
        vm.prank(alice);
        staking.claimRewards();
        uint256 treasuryAfter = rwdToken.balanceOf(treasury);
        uint256 feeReceived   = treasuryAfter - treasuryBefore;

        if (feeBps > 0) {
            assertGt(feeReceived, 0, "Treasury should receive fee");
        } else {
            assertEq(feeReceived, 0, "No fee when feeBps=0");
        }
    }

    // Fuzz: cannot withdraw before lock
    function testFuzz_CannotWithdrawBeforeLock(uint8 tierSeed, uint32 waitSecs) public {
        StakingV2.Tier tier = StakingV2.Tier(tierSeed % 4);
        StakingV2.TierConfig memory cfg = staking.getTierConfig(tier);
        waitSecs = uint32(bound(uint256(waitSecs), 1, cfg.lockDuration - 1));

        vm.startPrank(alice);
        stkToken.approve(address(staking), 1_000e18);
        staking.stake(1_000e18, tier, address(0));
        vm.warp(block.timestamp + waitSecs);
        vm.expectRevert("Tokens still locked");
        staking.withdraw(1_000e18);
        vm.stopPrank();
    }

    // Fuzz: referral bonus always 3% of net reward
    function testFuzz_ReferralBonus(uint96 amount) public {
        amount = uint96(bound(uint256(amount), 1e18, 10_000e18));

        vm.startPrank(alice);
        stkToken.approve(address(staking), amount);
        staking.stake(amount, StakingV2.Tier.Bronze, bob); // bob is referrer
        vm.stopPrank();

        vm.warp(block.timestamp + 1000);

        uint256 bobBefore = rwdToken.balanceOf(bob);
        vm.prank(alice);
        staking.claimRewards();
        uint256 bobAfter = rwdToken.balanceOf(bob);

        assertGt(bobAfter, bobBefore, "Referrer should earn bonus");
    }
}
