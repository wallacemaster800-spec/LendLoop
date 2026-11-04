import { ArrowUpRight, Drill, Sprout, CookingPot, Tent, Hammer, Package } from "lucide-react";
export function Brand() {
  return (
    <a href="/" className="brand" aria-label="LendLoop home">
      <span className="brand-mark" aria-hidden="true">
        ↗<br />↙
      </span>
      <span>LendLoop</span>
      <span className="brand-dot">_</span>
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
  return <Icon size={size} strokeWidth={1.5} aria-hidden="true" />;
}
export function Footer() {
  return (
    <footer>
      <Brand />
      <span>Less stuff. More possibility.</span>
      <a href="#top">
        Back to top <ArrowUpRight size={16} />
      </a>
    </footer>
  );
}
