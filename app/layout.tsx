import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "LendLoop · A little less buying. A little more sharing.",
  description: "Borrow what you need. Lend what you don't. Your neighborhood tool library.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
