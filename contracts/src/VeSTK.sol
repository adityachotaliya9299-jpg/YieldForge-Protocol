// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title veSTK — Vote-Escrowed STK
 * @author Aditya Chotaliya
 * @notice Lock STK to get veSTK voting power. Longer lock = more power.
 *
 * veSTK model (inspired by Curve):
 *  - Lock 1 STK for 1 year  → 1.0 veSTK
 *  - Lock 1 STK for 6 months→ 0.5 veSTK
 *  - Lock 1 STK for 1 month → ~0.083 veSTK
 *  - Max lock = 4 years     → 4x voting power
 *
 * veSTK is non-transferable (soulbound).
 * STK is returned on unlock.
 */
contract VeSTK is ERC20, ERC20Permit, ERC20Votes, Ownable, ReentrancyGuard {

    IERC20 public immutable stakingToken;

    uint256 public constant MAX_LOCK_DURATION = 4 * 365 days; // 4 years
    uint256 public constant MIN_LOCK_DURATION = 7 days;
    uint256 public constant PRECISION = 1e18;

    struct LockInfo {
        uint256 amount;      // STK locked
        uint256 lockEnd;     // timestamp when lock expires
        uint256 lockedAt;    // timestamp when locked
    }

    mapping(address => LockInfo) public locks;

    uint256 public totalLocked;

    event Locked(address indexed user, uint256 amount, uint256 lockEnd, uint256 veAmount);
    event Unlocked(address indexed user, uint256 amount);
    event LockExtended(address indexed user, uint256 newLockEnd, uint256 newVeAmount);

    constructor(address _stakingToken, address _owner)
        ERC20("Vote-Escrowed STK", "veSTK")
        ERC20Permit("Vote-Escrowed STK")
        Ownable(_owner)
    {
        stakingToken = IERC20(_stakingToken);
    }

    // ─────────────────────────────────────────────
    //  Lock STK → get veSTK
    // ─────────────────────────────────────────────

    /**
     * @notice Lock STK tokens to receive veSTK voting power.
     * @param _amount      Amount of STK to lock.
     * @param _lockDuration Duration in seconds (7 days to 4 years).
     */
    function lock(uint256 _amount, uint256 _lockDuration) external nonReentrant {
        require(_amount > 0, "Cannot lock 0");
        require(_lockDuration >= MIN_LOCK_DURATION, "Lock too short");
        require(_lockDuration <= MAX_LOCK_DURATION, "Lock too long");
        require(locks[msg.sender].amount == 0, "Already locked - use extend or increase");

        uint256 lockEnd  = block.timestamp + _lockDuration;
        uint256 veAmount = _calculateVeAmount(_amount, _lockDuration);

        locks[msg.sender] = LockInfo({
            amount:   _amount,
            lockEnd:  lockEnd,
            lockedAt: block.timestamp
        });

        totalLocked += _amount;

        stakingToken.transferFrom(msg.sender, address(this), _amount);
        _mint(msg.sender, veAmount);

        emit Locked(msg.sender, _amount, lockEnd, veAmount);
    }

    /**
     * @notice Add more STK to existing lock.
     */
    function increaseLock(uint256 _additionalAmount) external nonReentrant {
        LockInfo storage l = locks[msg.sender];
        require(l.amount > 0, "No existing lock");
        require(block.timestamp < l.lockEnd, "Lock expired");
        require(_additionalAmount > 0, "Cannot add 0");

        uint256 remaining = l.lockEnd - block.timestamp;
        uint256 addVe     = _calculateVeAmount(_additionalAmount, remaining);

        l.amount    += _additionalAmount;
        totalLocked += _additionalAmount;

        stakingToken.transferFrom(msg.sender, address(this), _additionalAmount);
        _mint(msg.sender, addVe);

        emit Locked(msg.sender, _additionalAmount, l.lockEnd, addVe);
    }

    /**
     * @notice Extend the lock duration (get more veSTK).
     */
    function extendLock(uint256 _additionalDuration) external nonReentrant {
        LockInfo storage l = locks[msg.sender];
        require(l.amount > 0, "No existing lock");
        require(_additionalDuration > 0, "Duration must be positive");

        uint256 newLockEnd = l.lockEnd + _additionalDuration;
        require(newLockEnd <= block.timestamp + MAX_LOCK_DURATION, "Exceeds max lock");

        // Burn old veSTK and mint new amount based on extended duration
        _burn(msg.sender, balanceOf(msg.sender));

        uint256 remaining  = newLockEnd - block.timestamp;
        uint256 newVeAmount = _calculateVeAmount(l.amount, remaining);

        l.lockEnd = newLockEnd;
        _mint(msg.sender, newVeAmount);

        emit LockExtended(msg.sender, newLockEnd, newVeAmount);
    }

    /**
     * @notice Unlock and retrieve STK after lock expires.
     */
    function unlock() external nonReentrant {
        LockInfo storage l = locks[msg.sender];
        require(l.amount > 0, "Nothing locked");
        require(block.timestamp >= l.lockEnd, "Still locked");

        uint256 amount = l.amount;

        // Burn all veSTK
        _burn(msg.sender, balanceOf(msg.sender));

        totalLocked -= amount;
        delete locks[msg.sender];

        stakingToken.transfer(msg.sender, amount);

        emit Unlocked(msg.sender, amount);
    }

    // ─────────────────────────────────────────────
    //  View
    // ─────────────────────────────────────────────

    /**
     * @notice Calculate veSTK amount for a given STK amount and duration.
     * veAmount = amount * (duration / MAX_LOCK)
     */
    function _calculateVeAmount(uint256 _amount, uint256 _duration)
        internal pure returns (uint256)
    {
        return (_amount * _duration) / MAX_LOCK_DURATION;
    }

    function previewVeAmount(uint256 _amount, uint256 _duration)
        external pure returns (uint256)
    {
        return (_amount * _duration) / MAX_LOCK_DURATION;
    }

    function timeUntilUnlock(address _user) external view returns (uint256) {
        uint256 lockEnd = locks[_user].lockEnd;
        if (block.timestamp >= lockEnd) return 0;
        return lockEnd - block.timestamp;
    }

    // ─────────────────────────────────────────────
    //  Non-transferable (soulbound)
    // ─────────────────────────────────────────────

    function transfer(address, uint256) public pure override returns (bool) {
        revert("veSTK: non-transferable");
    }

    function transferFrom(address, address, uint256) public pure override returns (bool) {
        revert("veSTK: non-transferable");
    }

    // ─────────────────────────────────────────────
    //  Required overrides
    // ─────────────────────────────────────────────

    function _update(address from, address to, uint256 value)
        internal override(ERC20, ERC20Votes)
    {
        super._update(from, to, value);
    }

    function nonces(address owner)
        public view override(ERC20Permit, Nonces)
        returns (uint256)
    {
        return super.nonces(owner);
    }
}
