// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";

/**
 * @title YieldForgeGovernor
 * @author Aditya Chotaliya
 * @notice On-chain DAO for YieldForge Protocol.
 *
 * Governance flow:
 *  1. Holder with ≥ proposalThreshold veSTK creates a proposal
 *  2. 1-day voting delay before voting opens
 *  3. 7-day voting period
 *  4. If quorum (4%) reached + majority FOR → proposal passes
 *  5. 2-day timelock delay before execution
 *  6. Anyone can execute
 *
 * What can be governed:
 *  - setRewardRate() on StakingV2
 *  - setPerformanceFee() on StakingV2
 *  - setAllocation() on RewardVault
 *  - updateTierConfig() on StakingV2
 *  - Any other protocol parameter
 */
contract YieldForgeGovernor is
    Governor,
    GovernorSettings,
    GovernorCountingSimple,
    GovernorVotes,
    GovernorVotesQuorumFraction,
    GovernorTimelockControl
{
    constructor(
        IVotes          _token,          // veSTK
        TimelockController _timelock
    )
        Governor("YieldForge Governor")
        GovernorSettings(
            1 days,   // voting delay  (1 day before voting opens)
            7 days,   // voting period (7 days to vote)
            100e18    // proposal threshold (100 veSTK to create proposal)
        )
        GovernorVotes(_token)
        GovernorVotesQuorumFraction(4)   // 4% quorum
        GovernorTimelockControl(_timelock)
    {}

    // ── Required overrides ────────────────────────────────────

    function votingDelay()
        public view override(Governor, GovernorSettings)
        returns (uint256)
    { return super.votingDelay(); }

    function votingPeriod()
        public view override(Governor, GovernorSettings)
        returns (uint256)
    { return super.votingPeriod(); }

    function quorum(uint256 blockNumber)
        public view override(Governor, GovernorVotesQuorumFraction)
        returns (uint256)
    { return super.quorum(blockNumber); }

    function state(uint256 proposalId)
        public view override(Governor, GovernorTimelockControl)
        returns (ProposalState)
    { return super.state(proposalId); }

    function proposalNeedsQueuing(uint256 proposalId)
        public view override(Governor, GovernorTimelockControl)
        returns (bool)
    { return super.proposalNeedsQueuing(proposalId); }

    function proposalThreshold()
        public view override(Governor, GovernorSettings)
        returns (uint256)
    { return super.proposalThreshold(); }

    function _queueOperations(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) returns (uint48) {
        return super._queueOperations(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _executeOperations(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) {
        super._executeOperations(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) returns (uint256) {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }

    function _executor()
        internal view override(Governor, GovernorTimelockControl)
        returns (address)
    { return super._executor(); }
}
