import {
  ArrowUpRight,
  Repeat2,
  Drill,
  Sprout,
  CookingPot,
  Tent,
  Hammer,
  Package,
} from "lucide-react";
export function Brand() {
  return (
    <a href="/" className="brand" aria-label="LendLoop home">
      <span className="brand-mark">
        <Repeat2 size={23} strokeWidth={2.4} />
      </span>
      LendLoop<span className="brand-dot">.</span>
    </a>
  );
}
export function ToolIcon({ category, size = 56 }: { category: string; size?: number }) {
  const Icon =
    (
      {
        "Power tools": Drill,
        Garden: Sprout,
        Kitchen: CookingPot,
        Camping: Tent,
        "Hand tools": Hammer,
      } as Record<string, typeof Drill>
    )[category] ?? Package;
  return <Icon size={size} strokeWidth={1.35} aria-hidden="true" />;
}
export function Footer() {
  return (
    <footer>
      <Brand />
      <span>Good tools. Better neighbors.</span>
      <a href="#top">
        Back to top <ArrowUpRight size={14} />
      </a>
    </footer>
  );
}
