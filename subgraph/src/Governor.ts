import { BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import { ProposalCreated, VoteCast, ProposalExecuted } from "../generated/YieldForgeGovernor/YieldForgeGovernor";
import { GovernanceProposal } from "../generated/schema";

const DECIMALS = BigDecimal.fromString("1000000000000000000");

function toDecimal(val: BigInt): BigDecimal {
  return val.toBigDecimal().div(DECIMALS);
}

export function handleProposalCreated(event: ProposalCreated): void {
  const id       = event.params.proposalId.toString();
  let   proposal = new GovernanceProposal(id);
  proposal.proposer     = event.params.proposer.toHexString();
  proposal.description  = event.params.description;
  proposal.startBlock   = event.params.voteStart;
  proposal.endBlock     = event.params.voteEnd;
  proposal.state        = "Active";
  proposal.forVotes     = BigDecimal.fromString("0");
  proposal.againstVotes = BigDecimal.fromString("0");
  proposal.abstainVotes = BigDecimal.fromString("0");
  proposal.timestamp    = event.block.timestamp;
  proposal.txHash       = event.transaction.hash.toHexString();
  proposal.save();
}

export function handleVoteCast(event: VoteCast): void {
  const id       = event.params.proposalId.toString();
  let   proposal = GovernanceProposal.load(id);
  if (!proposal) return;

  const weight = toDecimal(event.params.weight);
  // support: 0=Against, 1=For, 2=Abstain
  if (event.params.support == 1) {
    proposal.forVotes = proposal.forVotes.plus(weight);
  } else if (event.params.support == 0) {
    proposal.againstVotes = proposal.againstVotes.plus(weight);
  } else {
    proposal.abstainVotes = proposal.abstainVotes.plus(weight);
  }
  proposal.save();
}

export function handleProposalExecuted(event: ProposalExecuted): void {
  const id       = event.params.proposalId.toString();
  let   proposal = GovernanceProposal.load(id);
  if (!proposal) return;
  proposal.state = "Executed";
  proposal.save();
}