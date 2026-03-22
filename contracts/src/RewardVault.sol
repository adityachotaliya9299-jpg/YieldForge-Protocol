// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title RewardVault
 * @author Aditya Chotaliya
 * @notice Protocol treasury — collects performance fees and funds staking rewards.
 *
 * Revenue sources:
 *  - Performance fees from StakingV2 (5% of claimed rewards)
 *  - Manual funding by owner
 *
 * Spending:
 *  - Fund StakingV2 with reward tokens
 *  - Owner withdrawals for protocol expenses
 *  - Buyback & burn (send to dead address)
 */
contract RewardVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable rewardToken;

    address public constant DEAD = 0x000000000000000000000000000000000000dEaD;

    uint256 public totalReceived;
    uint256 public totalFundedToStaking;
    uint256 public totalBurned;
    uint256 public totalWithdrawnByOwner;

    // Allocation percentages (bps) — must sum to 10000
    uint256 public stakingAllocationBps = 7000; // 70% → fund staking rewards
    uint256 public burnAllocationBps    = 2000; // 20% → buyback & burn
    uint256 public ownerAllocationBps   = 1000; // 10% → protocol expenses

    event Received(address indexed from, uint256 amount);
    event FundedStaking(address indexed stakingContract, uint256 amount);
    event Burned(uint256 amount);
    event OwnerWithdrew(address indexed to, uint256 amount);
    event AllocationUpdated(uint256 stakingBps, uint256 burnBps, uint256 ownerBps);

    constructor(address _rewardToken, address _owner) Ownable(_owner) {
        require(_rewardToken != address(0), "Invalid token");
        rewardToken = IERC20(_rewardToken);
    }

    // ─────────────────────────────────────────────
    //  Receive revenue
    // ─────────────────────────────────────────────

    /**
     * @notice Accept performance fee transfers from StakingV2.
     */
    function receiveRevenue(uint256 _amount) external {
        rewardToken.safeTransferFrom(msg.sender, address(this), _amount);
        totalReceived += _amount;
        emit Received(msg.sender, _amount);
    }

    // ─────────────────────────────────────────────
    //  Distribute
    // ─────────────────────────────────────────────

    /**
     * @notice Distribute vault balance according to allocation percentages.
     * @param _stakingContract Address of StakingV2 to fund.
     */
    function distribute(address _stakingContract) external onlyOwner nonReentrant {
        require(_stakingContract != address(0), "Invalid staking contract");

        uint256 balance = rewardToken.balanceOf(address(this));
        require(balance > 0, "Nothing to distribute");

        uint256 toStaking = (balance * stakingAllocationBps) / 10000;
        uint256 toBurn    = (balance * burnAllocationBps)    / 10000;
        uint256 toOwner   = balance - toStaking - toBurn;

        // Fund staking
        if (toStaking > 0) {
            rewardToken.safeTransfer(_stakingContract, toStaking);
            totalFundedToStaking += toStaking;
            emit FundedStaking(_stakingContract, toStaking);
        }

        // Burn
        if (toBurn > 0) {
            rewardToken.safeTransfer(DEAD, toBurn);
            totalBurned += toBurn;
            emit Burned(toBurn);
        }

        // Owner
        if (toOwner > 0) {
            rewardToken.safeTransfer(owner(), toOwner);
            totalWithdrawnByOwner += toOwner;
            emit OwnerWithdrew(owner(), toOwner);
        }
    }

    /**
     * @notice Directly fund a staking contract with a specific amount.
     */
    function fundStaking(address _stakingContract, uint256 _amount)
        external onlyOwner nonReentrant
    {
        require(_stakingContract != address(0), "Invalid staking contract");
        rewardToken.safeTransfer(_stakingContract, _amount);
        totalFundedToStaking += _amount;
        emit FundedStaking(_stakingContract, _amount);
    }

    // ─────────────────────────────────────────────
    //  View
    // ─────────────────────────────────────────────

    function balance() external view returns (uint256) {
        return rewardToken.balanceOf(address(this));
    }

    function stats() external view returns (
        uint256 _balance,
        uint256 _totalReceived,
        uint256 _totalFundedToStaking,
        uint256 _totalBurned,
        uint256 _totalWithdrawnByOwner
    ) {
        return (
            rewardToken.balanceOf(address(this)),
            totalReceived,
            totalFundedToStaking,
            totalBurned,
            totalWithdrawnByOwner
        );
    }

    // ─────────────────────────────────────────────
    //  Owner
    // ─────────────────────────────────────────────

    function setAllocation(
        uint256 _stakingBps,
        uint256 _burnBps,
        uint256 _ownerBps
    ) external onlyOwner {
        require(_stakingBps + _burnBps + _ownerBps == 10000, "Must sum to 10000");
        stakingAllocationBps = _stakingBps;
        burnAllocationBps    = _burnBps;
        ownerAllocationBps   = _ownerBps;
        emit AllocationUpdated(_stakingBps, _burnBps, _ownerBps);
    }

    function recoverERC20(address _token, uint256 _amount) external onlyOwner {
        require(_token != address(rewardToken), "Cannot recover reward token");
        IERC20(_token).safeTransfer(owner(), _amount);
    }
}
