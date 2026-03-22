// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IStakingV2 {
    function stake(uint256 _amount, uint8 _tier, address _referrer) external;
    function claimRewards() external;
    function earned(address _user) external view returns (uint256);
    function userInfo(address) external view returns (
        uint256 stakedAmount,
        uint256 rewardPerTokenPaid,
        uint256 pendingRewards,
        uint256 lockUntil,
        uint256 stakedAt,
        uint8   tier,
        address referrer
    );
}

/**
 * @title AutoCompounder
 * @author Aditya Chotaliya
 * @notice Vault that auto-compounds staking rewards back into stake.
 *
 * How it works:
 *  1. User deposits STK → receives xSTK (vault shares)
 *  2. Anyone calls compound() → claims RWD, swaps to STK, re-stakes
 *  3. xSTK:STK ratio increases over time → users profit on withdrawal
 *  4. User burns xSTK → receives more STK than they deposited
 *
 * Note: In production, compound() would call a DEX to swap RWD→STK.
 *       For now, it uses a simplified model where RWD = STK (same token demo).
 */
contract AutoCompounder is ERC20, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    IERC20     public immutable stakingToken;
    IERC20     public immutable rewardToken;
    IStakingV2 public immutable stakingContract;

    uint256 public lastCompoundTime;
    uint256 public compoundFrequency = 24 hours;
    uint256 public totalDeposited;

    // Compounder reward — 0.1% of compounded amount goes to caller
    uint256 public compounderFeeBps = 10;

    event Deposited(address indexed user, uint256 stkAmount, uint256 xStkMinted);
    event Withdrawn(address indexed user, uint256 xStkBurned, uint256 stkReturned);
    event Compounded(address indexed caller, uint256 rewarded, uint256 callerFee);

    constructor(
        address _stakingToken,
        address _rewardToken,
        address _stakingContract,
        address _owner
    ) ERC20("xSTK Vault", "xSTK") Ownable(_owner) {
        stakingToken    = IERC20(_stakingToken);
        rewardToken     = IERC20(_rewardToken);
        stakingContract = IStakingV2(_stakingContract);
        lastCompoundTime = block.timestamp;
    }

    // ─────────────────────────────────────────────
    //  Deposit STK → mint xSTK
    // ─────────────────────────────────────────────

    function deposit(uint256 _amount) external nonReentrant {
        require(_amount > 0, "Cannot deposit 0");

        uint256 xStkToMint;
        uint256 supply = totalSupply();

        if (supply == 0 || totalDeposited == 0) {
            // First deposit: 1:1
            xStkToMint = _amount;
        } else {
            // Subsequent: proportional to existing ratio
            xStkToMint = (_amount * supply) / totalDeposited;
        }

        totalDeposited += _amount;
        stakingToken.safeTransferFrom(msg.sender, address(this), _amount);
        _mint(msg.sender, xStkToMint);

        // Approve and stake into StakingV2 (Bronze tier)
        stakingToken.approve(address(stakingContract), _amount);
        stakingContract.stake(_amount, 0, address(0)); // Tier.Bronze = 0

        emit Deposited(msg.sender, _amount, xStkToMint);
    }

    // ─────────────────────────────────────────────
    //  Withdraw xSTK → get STK back
    // ─────────────────────────────────────────────

    function withdraw(uint256 _xStkAmount) external nonReentrant {
        require(_xStkAmount > 0, "Cannot withdraw 0");
        require(balanceOf(msg.sender) >= _xStkAmount, "Insufficient xSTK");

        uint256 supply    = totalSupply();
        uint256 stkAmount = (_xStkAmount * totalDeposited) / supply;

        totalDeposited -= stkAmount;
        _burn(msg.sender, _xStkAmount);

        // Note: in production this would unstake from StakingV2
        // For demo, transfer from vault balance
        stakingToken.safeTransfer(msg.sender, stkAmount);

        emit Withdrawn(msg.sender, _xStkAmount, stkAmount);
    }

    // ─────────────────────────────────────────────
    //  Compound — anyone can call, earns small fee
    // ─────────────────────────────────────────────

    /**
     * @notice Claim RWD rewards and compound back into STK.
     *         Caller earns 0.1% of compounded amount as incentive.
     */
    function compound() external nonReentrant {
        require(
            block.timestamp >= lastCompoundTime + compoundFrequency,
            "Too soon to compound"
        );

        uint256 rwdBefore = rewardToken.balanceOf(address(this));
        stakingContract.claimRewards();
        uint256 rwdAfter  = rewardToken.balanceOf(address(this));
        uint256 rwdGained = rwdAfter - rwdBefore;

        require(rwdGained > 0, "Nothing to compound");

        // Caller fee
        uint256 callerFee = (rwdGained * compounderFeeBps) / 10000;
        uint256 toCompound = rwdGained - callerFee;

        // Send caller fee
        if (callerFee > 0) {
            rewardToken.safeTransfer(msg.sender, callerFee);
        }

        // In production: swap RWD→STK on Uniswap here
        // For demo: treat RWD as if it equals STK (same token scenario)
        // toCompound worth of value is added to totalDeposited
        totalDeposited += toCompound;

        lastCompoundTime = block.timestamp;
        emit Compounded(msg.sender, toCompound, callerFee);
    }

    // ─────────────────────────────────────────────
    //  View
    // ─────────────────────────────────────────────

    /// @notice Current STK value of 1 xSTK
    function pricePerShare() external view returns (uint256) {
        uint256 supply = totalSupply();
        if (supply == 0) return 1e18;
        return (totalDeposited * 1e18) / supply;
    }

    /// @notice How much STK a user would get for their xSTK right now
    function previewWithdraw(address _user) external view returns (uint256) {
        uint256 supply = totalSupply();
        if (supply == 0) return 0;
        return (balanceOf(_user) * totalDeposited) / supply;
    }

    // ─────────────────────────────────────────────
    //  Owner
    // ─────────────────────────────────────────────

    function setCompoundFrequency(uint256 _seconds) external onlyOwner {
        compoundFrequency = _seconds;
    }

    function setCompounderFee(uint256 _bps) external onlyOwner {
        require(_bps <= 100, "Max 1%");
        compounderFeeBps = _bps;
    }
}
