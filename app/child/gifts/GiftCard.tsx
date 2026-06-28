import { ChildGift } from "./types";

export default function GiftCard({ gift }: { gift: ChildGift }) {
  return <article>{gift.gift.icon} {gift.gift.name}</article>;
}
