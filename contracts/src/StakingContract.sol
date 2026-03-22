// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title StakingContract
 * @author Aditya Chotaliya
 * @notice DeFi Staking Platform — Stake tokens, earn rewards, with lock periods
 */
contract StakingContract is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────
    //  State
    // ─────────────────────────────────────────────

    IERC20 public immutable stakingToken;
    IERC20 public immutable rewardToken;

    uint256 public rewardRatePerSecond;   // reward tokens per second (scaled 1e18)
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;
    uint256 public totalStaked;

    uint256 public constant LOCK_PERIOD   = 7 days;
    uint256 public constant PRECISION     = 1e18;
    uint256 public constant SECONDS_PER_YEAR = 365 days;

    struct UserInfo {
        uint256 stakedAmount;
        uint256 rewardPerTokenPaid;
        uint256 pendingRewards;
        uint256 lockUntil;
        uint256 stakedAt;
    }

    mapping(address => UserInfo) public userInfo;

    // ─────────────────────────────────────────────
    //  Events
    // ─────────────────────────────────────────────

    event Staked(address indexed user, uint256 amount, uint256 lockUntil);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardClaimed(address indexed user, uint256 reward);
    event RewardRateUpdated(uint256 newRate);
    event RewardsFunded(uint256 amount);

    // ─────────────────────────────────────────────
    //  Constructor
    // ─────────────────────────────────────────────

    constructor(
        address _stakingToken,
        address _rewardToken,
        uint256 _rewardRatePerSecond,
        address _owner
    ) Ownable(_owner) {
        require(_stakingToken != address(0), "Invalid staking token");
        require(_rewardToken  != address(0), "Invalid reward token");

        stakingToken        = IERC20(_stakingToken);
        rewardToken         = IERC20(_rewardToken);
        rewardRatePerSecond = _rewardRatePerSecond;
        lastUpdateTime      = block.timestamp;
    }

    // ─────────────────────────────────────────────
    //  Modifiers
    // ─────────────────────────────────────────────

    modifier updateReward(address _user) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime       = block.timestamp;

        if (_user != address(0)) {
            UserInfo storage u = userInfo[_user];
            u.pendingRewards    = earned(_user);
            u.rewardPerTokenPaid = rewardPerTokenStored;
        }
        _;
    }

    // ─────────────────────────────────────────────
    //  Core — Stake
    // ─────────────────────────────────────────────

    /**
     * @notice Stake `_amount` tokens. Resets the 7-day lock window.
     */
    function stake(uint256 _amount)
        external
        nonReentrant
        updateReward(msg.sender)
    {
        require(_amount > 0, "Cannot stake 0");

        UserInfo storage u = userInfo[msg.sender];

        u.stakedAmount += _amount;
        u.lockUntil     = block.timestamp + LOCK_PERIOD;
        u.stakedAt      = block.timestamp;
        totalStaked    += _amount;

        stakingToken.safeTransferFrom(msg.sender, address(this), _amount);

        emit Staked(msg.sender, _amount, u.lockUntil);
    }

    // ─────────────────────────────────────────────
    //  Core — Withdraw
    // ─────────────────────────────────────────────

    /**
     * @notice Withdraw `_amount` of staked tokens after lock period.
     */
    function withdraw(uint256 _amount)
        external
        nonReentrant
        updateReward(msg.sender)
    {
        _withdraw(_amount);
    }

    function _withdraw(uint256 _amount) internal {
        UserInfo storage u = userInfo[msg.sender];

        require(_amount > 0,                    "Cannot withdraw 0");
        require(u.stakedAmount >= _amount,      "Insufficient staked balance");
        require(block.timestamp >= u.lockUntil, "Tokens are still locked");

        u.stakedAmount -= _amount;
        totalStaked    -= _amount;

        stakingToken.safeTransfer(msg.sender, _amount);
        emit Withdrawn(msg.sender, _amount);
    }

    // ─────────────────────────────────────────────
    //  Core — Claim Rewards
    // ─────────────────────────────────────────────

    /**
     * @notice Claim all pending rewards.
     */
    function claimRewards()
        external
        nonReentrant
        updateReward(msg.sender)
    {
        _claimRewards();
    }

    function _claimRewards() internal {
        UserInfo storage u = userInfo[msg.sender];
        uint256 reward = u.pendingRewards;

        require(reward > 0, "No rewards to claim");

        u.pendingRewards = 0;
        rewardToken.safeTransfer(msg.sender, reward);
        emit RewardClaimed(msg.sender, reward);
    }

    function exit()
        external
        nonReentrant
        updateReward(msg.sender)
    {
        UserInfo storage u = userInfo[msg.sender];
        require(block.timestamp >= u.lockUntil, "Tokens are still locked");
        _withdraw(u.stakedAmount);
        _claimRewards();
    }

    // ─────────────────────────────────────────────
    //  View — Reward Calculations
    // ─────────────────────────────────────────────

    /**
     * @notice Accumulated reward tokens per staked token.
     */
    function rewardPerToken() public view returns (uint256) {
        if (totalStaked == 0) return rewardPerTokenStored;

        return rewardPerTokenStored
            + ((block.timestamp - lastUpdateTime) * rewardRatePerSecond * PRECISION)
            / totalStaked;
    }

    /**
     * @notice Total earned (pending) rewards for `_user`.
     */
    function earned(address _user) public view returns (uint256) {
        UserInfo storage u = userInfo[_user];
        return
            (u.stakedAmount * (rewardPerToken() - u.rewardPerTokenPaid)) / PRECISION
            + u.pendingRewards;
    }

    /**
     * @notice Current APR in basis points (100 = 1%).
     *         APR = (rewardRatePerSecond * SECONDS_PER_YEAR / totalStaked) * 10000
     */
    function currentAPR() external view returns (uint256) {
        if (totalStaked == 0) return 0;
        return (rewardRatePerSecond * SECONDS_PER_YEAR * 10_000) / totalStaked;
    }

    /**
     * @notice Seconds remaining until `_user` can withdraw.
     */
    function timeUntilUnlock(address _user) external view returns (uint256) {
        uint256 lock = userInfo[_user].lockUntil;
        if (block.timestamp >= lock) return 0;
        return lock - block.timestamp;
    }

    // ─────────────────────────────────────────────
    //  Owner — Admin
    // ─────────────────────────────────────────────

    /**
     * @notice Fund the contract with reward tokens.
     */
    function fundRewards(uint256 _amount) external onlyOwner {
        rewardToken.safeTransferFrom(msg.sender, address(this), _amount);
        emit RewardsFunded(_amount);
    }

    /**
     * @notice Update reward emission rate.
     */
    function setRewardRate(uint256 _newRate)
        external
        onlyOwner
        updateReward(address(0))
    {
        rewardRatePerSecond = _newRate;
        emit RewardRateUpdated(_newRate);
    }

    /**
     * @notice Emergency: recover any ERC20 accidentally sent here (not staking/reward tokens).
     */
    function recoverERC20(address _token, uint256 _amount) external onlyOwner {
        require(_token != address(stakingToken), "Cannot recover staking token");
        require(_token != address(rewardToken),  "Cannot recover reward token");
        IERC20(_token).safeTransfer(msg.sender, _amount);
    }
}
