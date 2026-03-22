import { BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import { Locked, Unlocked } from "../generated/VeSTK/VeSTK";
import { VeSTKHolder } from "../generated/schema";

const DECIMALS = BigDecimal.fromString("1000000000000000000");

function toDecimal(val: BigInt): BigDecimal {
  return val.toBigDecimal().div(DECIMALS);
}

export function handleLocked(event: Locked): void {
  const addr   = event.params.user.toHexString();
  let   holder = VeSTKHolder.load(addr);
  if (!holder) {
    holder = new VeSTKHolder(addr);
    holder.address   = addr;
    holder.veBalance = BigDecimal.fromString("0");
    holder.stkLocked = BigDecimal.fromString("0");
    holder.lockEnd   = BigInt.fromI32(0);
    holder.lockedAt  = BigInt.fromI32(0);
  }
  holder.stkLocked = holder.stkLocked.plus(toDecimal(event.params.amount));
  holder.veBalance = holder.veBalance.plus(toDecimal(event.params.veAmount));
  holder.lockEnd   = event.params.lockEnd;
  holder.lockedAt  = event.block.timestamp;
  holder.save();
}

export function handleUnlocked(event: Unlocked): void {
  const addr   = event.params.user.toHexString();
  let   holder = VeSTKHolder.load(addr);
  if (!holder) return;
  holder.stkLocked = BigDecimal.fromString("0");
  holder.veBalance = BigDecimal.fromString("0");
  holder.lockEnd   = BigInt.fromI32(0);
  holder.save();
}