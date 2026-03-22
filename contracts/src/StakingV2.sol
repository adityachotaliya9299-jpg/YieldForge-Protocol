// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title StakingV2
 * @author Aditya Chotaliya
 * @notice YieldForge Protocol V2
 *
 * New features over V1:
 *  - Staking Tiers   : Bronze(7d,1x) | Silver(30d,1.5x) | Gold(90d,2x) | Diamond(365d,3x)
 *  - Performance Fee : 5% of claimed rewards → treasury
 *  - Referral System : Referrer earns 3% bonus on referee's rewards
 *  - Emergency Pause : Owner can pause all operations
 *  - Emergency Withdraw: Users can exit without rewards if paused
 */
contract StakingV2 is ReentrancyGuard, Ownable, Pausable {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────
    //  Tokens
    // ─────────────────────────────────────────────

    IERC20 public immutable stakingToken;
    IERC20 public immutable rewardToken;

    // ─────────────────────────────────────────────
    //  Reward Accounting
    // ─────────────────────────────────────────────

    uint256 public rewardRatePerSecond;
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;
    uint256 public totalStaked;

    uint256 public constant PRECISION       = 1e18;
    uint256 public constant SECONDS_PER_YEAR= 365 days;

    // ─────────────────────────────────────────────
    //  Tiers
    // ─────────────────────────────────────────────

    enum Tier { Bronze, Silver, Gold, Diamond }

    struct TierConfig {
        uint256 lockDuration;   // seconds
        uint256 multiplierBps;  // 10000 = 1x, 15000 = 1.5x, 20000 = 2x, 30000 = 3x
        string  name;
    }

    mapping(Tier => TierConfig) public tierConfigs;

    // ─────────────────────────────────────────────
    //  Fees
    // ─────────────────────────────────────────────

    uint256 public performanceFeeBps = 500;   // 5%
    uint256 public referralBonusBps  = 300;   // 3%
    address public treasury;

    uint256 public constant MAX_PERFORMANCE_FEE = 2000; // 20% max
    uint256 public constant MAX_REFERRAL_BONUS  = 1000; // 10% max
    uint256 public constant BPS_DENOMINATOR     = 10000;

    // ─────────────────────────────────────────────
    //  User State
    // ─────────────────────────────────────────────

    struct UserInfo {
        uint256 stakedAmount;
        uint256 rewardPerTokenPaid;
        uint256 pendingRewards;
        uint256 lockUntil;
        uint256 stakedAt;
        Tier    tier;
        address referrer;
    }

    mapping(address => UserInfo) public userInfo;

    // Referral tracking
    mapping(address => uint256) public referralEarnings;
    mapping(address => uint256) public referralCount;

    // ─────────────────────────────────────────────
    //  Events
    // ─────────────────────────────────────────────

    event Staked(address indexed user, uint256 amount, Tier tier, uint256 lockUntil);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardClaimed(address indexed user, uint256 reward, uint256 fee);
    event ReferralBonus(address indexed referrer, address indexed referee, uint256 bonus);
    event RewardRateUpdated(uint256 newRate);
    event PerformanceFeeUpdated(uint256 newFeeBps);
    event TreasuryUpdated(address newTreasury);
    event RewardsFunded(uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 amount);

    // ─────────────────────────────────────────────
    //  Constructor
    // ─────────────────────────────────────────────

    constructor(
        address _stakingToken,
        address _rewardToken,
        uint256 _rewardRatePerSecond,
        address _treasury,
        address _owner
    ) Ownable(_owner) {
        require(_stakingToken != address(0), "Invalid staking token");
        require(_rewardToken  != address(0), "Invalid reward token");
        require(_treasury     != address(0), "Invalid treasury");

        stakingToken        = IERC20(_stakingToken);
        rewardToken         = IERC20(_rewardToken);
        rewardRatePerSecond = _rewardRatePerSecond;
        treasury            = _treasury;
        lastUpdateTime      = block.timestamp;

        // Initialise tier configs
        tierConfigs[Tier.Bronze]  = TierConfig(7   days, 10000, "Bronze");
        tierConfigs[Tier.Silver]  = TierConfig(30  days, 15000, "Silver");
        tierConfigs[Tier.Gold]    = TierConfig(90  days, 20000, "Gold");
        tierConfigs[Tier.Diamond] = TierConfig(365 days, 30000, "Diamond");
    }

    // ─────────────────────────────────────────────
    //  Modifier
    // ─────────────────────────────────────────────

    modifier updateReward(address _user) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime       = block.timestamp;
        if (_user != address(0)) {
            UserInfo storage u = userInfo[_user];
            u.pendingRewards     = earned(_user);
            u.rewardPerTokenPaid = rewardPerTokenStored;
        }
        _;
    }

    // ─────────────────────────────────────────────
    //  Core — Stake
    // ─────────────────────────────────────────────

    /**
     * @notice Stake tokens with a chosen tier.
     * @param _amount   Amount of staking tokens.
     * @param _tier     Bronze/Silver/Gold/Diamond lock tier.
     * @param _referrer Optional referrer address (address(0) = none).
     */
    function stake(uint256 _amount, Tier _tier, address _referrer)
        external
        nonReentrant
        whenNotPaused
        updateReward(msg.sender)
    {
        require(_amount > 0, "Cannot stake 0");
        require(_referrer != msg.sender, "Cannot refer yourself");

        UserInfo storage u = userInfo[msg.sender];
        TierConfig memory cfg = tierConfigs[_tier];

        // If re-staking, must use same or higher tier
        if (u.stakedAmount > 0) {
            require(uint8(_tier) >= uint8(u.tier), "Cannot downgrade tier");
        }

        // Set referrer only on first stake
        if (u.referrer == address(0) && _referrer != address(0)) {
            u.referrer = _referrer;
            referralCount[_referrer]++;
        }

        u.stakedAmount += _amount;
        u.lockUntil     = block.timestamp + cfg.lockDuration;
        u.stakedAt      = block.timestamp;
        u.tier          = _tier;
        totalStaked    += _amount;

        stakingToken.safeTransferFrom(msg.sender, address(this), _amount);

        emit Staked(msg.sender, _amount, _tier, u.lockUntil);
    }

    // ─────────────────────────────────────────────
    //  Core — Withdraw
    // ─────────────────────────────────────────────

    function withdraw(uint256 _amount)
        external
        nonReentrant
        whenNotPaused
        updateReward(msg.sender)
    {
        _withdraw(_amount);
    }

    function _withdraw(uint256 _amount) internal {
        UserInfo storage u = userInfo[msg.sender];
        require(_amount > 0,                    "Cannot withdraw 0");
        require(u.stakedAmount >= _amount,      "Insufficient balance");
        require(block.timestamp >= u.lockUntil, "Tokens still locked");

        u.stakedAmount -= _amount;
        totalStaked    -= _amount;

        stakingToken.safeTransfer(msg.sender, _amount);
        emit Withdrawn(msg.sender, _amount);
    }

    // ─────────────────────────────────────────────
    //  Core — Claim Rewards
    // ─────────────────────────────────────────────

    function claimRewards()
        external
        nonReentrant
        whenNotPaused
        updateReward(msg.sender)
    {
        _claimRewards();
    }

    function _claimRewards() internal {
        UserInfo storage u = userInfo[msg.sender];

        // Apply tier multiplier
        uint256 baseReward = u.pendingRewards;
        require(baseReward > 0, "No rewards");

        TierConfig memory cfg = tierConfigs[u.tier];
        uint256 boostedReward = (baseReward * cfg.multiplierBps) / BPS_DENOMINATOR;

        // Performance fee → treasury
        uint256 fee           = (boostedReward * performanceFeeBps) / BPS_DENOMINATOR;
        uint256 userReward    = boostedReward - fee;

        u.pendingRewards = 0;

        // Pay user
        rewardToken.safeTransfer(msg.sender, userReward);

        // Pay treasury fee
        if (fee > 0) {
            rewardToken.safeTransfer(treasury, fee);
        }

        // Referral bonus
        address referrer = u.referrer;
        if (referrer != address(0)) {
            uint256 referralBonus = (userReward * referralBonusBps) / BPS_DENOMINATOR;
            if (referralBonus > 0 && rewardToken.balanceOf(address(this)) >= referralBonus) {
                rewardToken.safeTransfer(referrer, referralBonus);
                referralEarnings[referrer] += referralBonus;
                emit ReferralBonus(referrer, msg.sender, referralBonus);
            }
        }

        emit RewardClaimed(msg.sender, userReward, fee);
    }

    // ─────────────────────────────────────────────
    //  Core — Exit
    // ─────────────────────────────────────────────

    function exit()
        external
        nonReentrant
        whenNotPaused
        updateReward(msg.sender)
    {
        UserInfo storage u = userInfo[msg.sender];
        require(block.timestamp >= u.lockUntil, "Tokens still locked");
        _withdraw(u.stakedAmount);
        _claimRewards();
    }

    // ─────────────────────────────────────────────
    //  Emergency Withdraw (ignores rewards, bypasses lock)
    // ─────────────────────────────────────────────

    /**
     * @notice Emergency exit — returns staked tokens, forfeits all rewards.
     *         Only callable when contract is paused.
     */
    function emergencyWithdraw() external nonReentrant whenPaused {
        UserInfo storage u = userInfo[msg.sender];
        uint256 amount = u.stakedAmount;
        require(amount > 0, "Nothing to withdraw");

        u.stakedAmount   = 0;
        u.pendingRewards = 0;
        totalStaked     -= amount;

        stakingToken.safeTransfer(msg.sender, amount);
        emit EmergencyWithdraw(msg.sender, amount);
    }

    // ─────────────────────────────────────────────
    //  View
    // ─────────────────────────────────────────────

    function rewardPerToken() public view returns (uint256) {
        if (totalStaked == 0) return rewardPerTokenStored;
        return rewardPerTokenStored
            + ((block.timestamp - lastUpdateTime) * rewardRatePerSecond * PRECISION)
            / totalStaked;
    }

    function earned(address _user) public view returns (uint256) {
        UserInfo storage u = userInfo[_user];
        return (u.stakedAmount * (rewardPerToken() - u.rewardPerTokenPaid)) / PRECISION
            + u.pendingRewards;
    }

    /**
     * @notice Earned rewards after tier multiplier and fee.
     */
    function earnedAfterFee(address _user) external view returns (uint256 net, uint256 fee) {
        UserInfo storage u = userInfo[_user];
        TierConfig memory cfg = tierConfigs[u.tier];
        uint256 base    = earned(_user);
        uint256 boosted = (base * cfg.multiplierBps) / BPS_DENOMINATOR;
        fee = (boosted * performanceFeeBps) / BPS_DENOMINATOR;
        net = boosted - fee;
    }

    function currentAPR() external view returns (uint256) {
        if (totalStaked == 0) return 0;
        return (rewardRatePerSecond * SECONDS_PER_YEAR * 10_000) / totalStaked;
    }

    function timeUntilUnlock(address _user) external view returns (uint256) {
        uint256 lock = userInfo[_user].lockUntil;
        if (block.timestamp >= lock) return 0;
        return lock - block.timestamp;
    }

    function getTierConfig(Tier _tier) external view returns (TierConfig memory) {
        return tierConfigs[_tier];
    }

    // ─────────────────────────────────────────────
    //  Owner
    // ─────────────────────────────────────────────

    function fundRewards(uint256 _amount) external onlyOwner {
        rewardToken.safeTransferFrom(msg.sender, address(this), _amount);
        emit RewardsFunded(_amount);
    }

    function setRewardRate(uint256 _newRate)
        external
        onlyOwner
        updateReward(address(0))
    {
        rewardRatePerSecond = _newRate;
        emit RewardRateUpdated(_newRate);
    }

    function setPerformanceFee(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= MAX_PERFORMANCE_FEE, "Fee too high");
        performanceFeeBps = _feeBps;
        emit PerformanceFeeUpdated(_feeBps);
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid treasury");
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }

    function setReferralBonus(uint256 _bps) external onlyOwner {
        require(_bps <= MAX_REFERRAL_BONUS, "Bonus too high");
        referralBonusBps = _bps;
    }

    function updateTierConfig(Tier _tier, uint256 _lockDuration, uint256 _multiplierBps)
        external onlyOwner
    {
        require(_multiplierBps >= 10000, "Multiplier must be >= 1x");
        tierConfigs[_tier].lockDuration  = _lockDuration;
        tierConfigs[_tier].multiplierBps = _multiplierBps;
    }

    function pause()   external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    function recoverERC20(address _token, uint256 _amount) external onlyOwner {
        require(_token != address(stakingToken), "Cannot recover staking token");
        require(_token != address(rewardToken),  "Cannot recover reward token");
        IERC20(_token).safeTransfer(msg.sender, _amount);
    }
}
