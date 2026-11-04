import { Landing } from "@/components/landing";
export default function PublicDemo() {
  return (
    <Landing
      demo
      tools={[
        { name: "Cordless drill & bit set", category: "Power tools" },
        { name: "The garden starter kit", category: "Garden" },
        { name: "Stand mixer", category: "Kitchen" },
        { name: "Level & measuring kit", category: "Hand tools" },
      ]}
    />
  );
}
