import { LiveApp } from "@/components/live-app";
import { Landing } from "@/components/landing";
export default function Page() {
  const configured = Boolean(
    process.env.NEXT_PUBLIC_CONVEX_URL && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  );
  return configured ? <LiveApp /> : <Landing tools={[]} setup />;
}
