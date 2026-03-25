// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IMintable {
    function mint(address to, uint256 amount) external;
}

/**
 * @title YieldForge Faucet
 * @notice Allows anyone to claim free STK tokens on testnet
 * @dev Owner must grant this contract minter role on StakingToken
 */
contract Faucet is Ownable, ReentrancyGuard {

    IMintable public stkToken;
    IMintable public rwdToken;

    // Cooldown: 1 claim per address per 24 hours
    uint256 public cooldown     = 24 hours;
    uint256 public stkAmount    = 10_000e18;  // 10,000 STK per claim
    uint256 public rwdAmount    = 1_000e18;   // 1,000 RWD per claim

    mapping(address => uint256) public lastClaim;

    event Claimed(address indexed user, uint256 stkAmount, uint256 rwdAmount);
    event AmountsUpdated(uint256 newStk, uint256 newRwd);
    event CooldownUpdated(uint256 newCooldown);

    constructor(
        address _stkToken,
        address _rwdToken,
        address _owner
    ) Ownable(_owner) {
        stkToken = IMintable(_stkToken);
        rwdToken = IMintable(_rwdToken);
    }

    // ── Claim ─────────────────────────────────────────────────
    function claim() external nonReentrant {
        require(
            block.timestamp >= lastClaim[msg.sender] + cooldown,
            "Faucet: wait 24 hours between claims"
        );

        lastClaim[msg.sender] = block.timestamp;

        stkToken.mint(msg.sender, stkAmount);
        rwdToken.mint(msg.sender, rwdAmount);

        emit Claimed(msg.sender, stkAmount, rwdAmount);
    }

    // ── View ──────────────────────────────────────────────────
    function timeUntilNextClaim(address _user) external view returns (uint256) {
        if (block.timestamp >= lastClaim[_user] + cooldown) return 0;
        return lastClaim[_user] + cooldown - block.timestamp;
    }

    function canClaim(address _user) external view returns (bool) {
        return block.timestamp >= lastClaim[_user] + cooldown;
    }

    // ── Owner controls ────────────────────────────────────────
    function setAmounts(uint256 _stk, uint256 _rwd) external onlyOwner {
        stkAmount = _stk;
        rwdAmount = _rwd;
        emit AmountsUpdated(_stk, _rwd);
    }

    function setCooldown(uint256 _seconds) external onlyOwner {
        cooldown = _seconds;
        emit CooldownUpdated(_seconds);
    }
}
